package quizzes

import (
	"context"
	"database/sql"
	"errors"

	"quizsystem/internal/apierr"
	"quizsystem/internal/current"
	"quizsystem/internal/store"

	"encore.dev/storage/sqldb"
)

//encore:api auth method=GET path=/quizzes
func ListPublishedQuizzes(ctx context.Context) (*QuizListResponse, error) {
	user, err := current.RequireRole("user")
	if err != nil {
		return nil, err
	}

	rows, err := store.DB.Query(ctx, `
		SELECT
			q.id,
			q.title,
			q.is_published,
			q.pass_threshold,
			q.one_attempt,
			q.show_answers,
			COUNT(questions.id),
			q.created_at,
			EXISTS (
				SELECT 1
				FROM attempts
				WHERE attempts.quiz_id = q.id AND attempts.user_id = $1
			)
		FROM quizzes q
		LEFT JOIN questions ON questions.quiz_id = q.id
		WHERE q.is_published = true
		GROUP BY q.id
		ORDER BY q.created_at DESC
	`, user.ID)
	if err != nil {
		return nil, apierr.Internal("could not list quizzes", err)
	}
	defer rows.Close()

	quizzes := make([]QuizSummary, 0)
	for rows.Next() {
		var quiz QuizSummary
		var threshold sql.NullInt64
		var questionCount int64
		if err := rows.Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.IsPublished,
			&threshold,
			&quiz.OneAttempt,
			&quiz.ShowAnswers,
			&questionCount,
			&quiz.CreatedAt,
			&quiz.Completed,
		); err != nil {
			return nil, apierr.Internal("could not read quiz", err)
		}
		if threshold.Valid {
			value := int(threshold.Int64)
			quiz.PassThreshold = &value
		}
		quiz.QuestionCount = int(questionCount)
		quizzes = append(quizzes, quiz)
	}
	if err := rows.Err(); err != nil {
		return nil, apierr.Internal("could not read quizzes", err)
	}

	return &QuizListResponse{Quizzes: quizzes}, nil
}

//encore:api auth method=GET path=/quizzes/:id
func GetQuiz(ctx context.Context, id int64) (*PublicQuizDetail, error) {
	user, err := current.RequireRole("user")
	if err != nil {
		return nil, err
	}

	quiz, err := loadPublicQuiz(ctx, id, user.ID)
	if err != nil {
		return nil, err
	}
	return quiz, nil
}

func loadPublicQuiz(ctx context.Context, id int64, userID int64) (*PublicQuizDetail, error) {
	var quiz PublicQuizDetail
	var threshold sql.NullInt64
	err := store.DB.QueryRow(ctx, `
		SELECT
			q.id,
			q.title,
			q.pass_threshold,
			q.one_attempt,
			EXISTS (
				SELECT 1
				FROM attempts
				WHERE attempts.quiz_id = q.id AND attempts.user_id = $2
			)
		FROM quizzes q
		WHERE q.id = $1 AND q.is_published = true
	`, id, userID).Scan(
		&quiz.ID,
		&quiz.Title,
		&threshold,
		&quiz.OneAttempt,
		&quiz.Completed,
	)
	if err != nil {
		if errors.Is(err, sqldb.ErrNoRows) {
			return nil, apierr.NotFound("quiz not found")
		}
		return nil, apierr.Internal("could not load quiz", err)
	}
	if threshold.Valid {
		value := int(threshold.Int64)
		quiz.PassThreshold = &value
	}

	rows, err := store.DB.Query(ctx, `
		SELECT
			questions.id,
			questions.text,
			questions.order_index,
			answers.id,
			answers.text,
			answers.order_index
		FROM questions
		JOIN answers ON answers.question_id = questions.id
		WHERE questions.quiz_id = $1
		ORDER BY questions.order_index, answers.order_index
	`, id)
	if err != nil {
		return nil, apierr.Internal("could not load questions", err)
	}
	defer rows.Close()

	questionIndex := map[int64]int{}
	quiz.Questions = make([]PublicQuestion, 0)
	for rows.Next() {
		var question PublicQuestion
		var answer PublicAnswer
		if err := rows.Scan(
			&question.ID,
			&question.Text,
			&question.Order,
			&answer.ID,
			&answer.Text,
			&answer.Order,
		); err != nil {
			return nil, apierr.Internal("could not read question", err)
		}

		index, ok := questionIndex[question.ID]
		if !ok {
			question.Answers = make([]PublicAnswer, 0)
			quiz.Questions = append(quiz.Questions, question)
			index = len(quiz.Questions) - 1
			questionIndex[question.ID] = index
		}
		quiz.Questions[index].Answers = append(quiz.Questions[index].Answers, answer)
	}
	if err := rows.Err(); err != nil {
		return nil, apierr.Internal("could not read questions", err)
	}

	quiz.QuestionCount = len(quiz.Questions)
	return &quiz, nil
}
