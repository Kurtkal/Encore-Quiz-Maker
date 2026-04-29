package quizzes

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"quizsystem/internal/apierr"
	"quizsystem/internal/current"
	"quizsystem/internal/store"

	"encore.dev/storage/sqldb"
)

type DeleteResponse struct {
	Deleted bool `json:"deleted"`
}

//encore:api auth method=GET path=/admin/quizzes
func ListAdminQuizzes(ctx context.Context) (*QuizListResponse, error) {
	if _, err := current.RequireRole("admin"); err != nil {
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
			u.id,
			u.email
		FROM quizzes q
		JOIN users u ON u.id = q.created_by
		LEFT JOIN questions ON questions.quiz_id = q.id
		GROUP BY q.id, u.id, u.email
		ORDER BY q.created_at DESC
	`)
	if err != nil {
		return nil, apierr.Internal("could not list quizzes", err)
	}
	defer rows.Close()

	quizzes := make([]QuizSummary, 0)
	for rows.Next() {
		var quiz QuizSummary
		var threshold sql.NullInt64
		var questionCount int64
		var creator AdminUser
		if err := rows.Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.IsPublished,
			&threshold,
			&quiz.OneAttempt,
			&quiz.ShowAnswers,
			&questionCount,
			&quiz.CreatedAt,
			&creator.ID,
			&creator.Email,
		); err != nil {
			return nil, apierr.Internal("could not read quiz", err)
		}
		if threshold.Valid {
			value := int(threshold.Int64)
			quiz.PassThreshold = &value
		}
		quiz.QuestionCount = int(questionCount)
		quiz.CreatedBy = &creator
		quizzes = append(quizzes, quiz)
	}
	if err := rows.Err(); err != nil {
		return nil, apierr.Internal("could not read quizzes", err)
	}

	return &QuizListResponse{Quizzes: quizzes}, nil
}

//encore:api auth method=POST path=/admin/quizzes
func CreateQuiz(ctx context.Context, req *UpsertQuizRequest) (*AdminQuizDetail, error) {
	fmt.Println("CREATE QUIZ HIT")
	admin, err := current.RequireRole("admin")
	if err != nil {
		return nil, err
	}
	if err := validateQuizInput(req); err != nil {
		return nil, err
	}

	tx, err := store.DB.Begin(ctx)
	if err != nil {
		return nil, apierr.Internal("could not start transaction", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	var quizID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO quizzes (title, is_published, pass_threshold, one_attempt, show_answers, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, strings.TrimSpace(req.Title), req.IsPublished, thresholdValue(req.PassThreshold), req.OneAttempt, req.ShowAnswers, admin.ID).Scan(&quizID)
	if err != nil {
		return nil, apierr.Internal("could not create quiz", err)
	}

	if err := insertQuestions(ctx, tx, quizID, req.Questions); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, apierr.Internal("could not commit quiz", err)
	}
	committed = true

	return loadAdminQuiz(ctx, quizID)
}

//encore:api auth method=GET path=/admin/quizzes/:id
func GetAdminQuiz(ctx context.Context, id int64) (*AdminQuizDetail, error) {
	if _, err := current.RequireRole("admin"); err != nil {
		return nil, err
	}
	return loadAdminQuiz(ctx, id)
}

//encore:api auth method=PUT path=/admin/quizzes/:id
func UpdateQuiz(ctx context.Context, id int64, req *UpsertQuizRequest) (*AdminQuizDetail, error) {
	if _, err := current.RequireRole("admin"); err != nil {
		return nil, err
	}
	if err := validateQuizInput(req); err != nil {
		return nil, err
	}

	tx, err := store.DB.Begin(ctx)
	if err != nil {
		return nil, apierr.Internal("could not start transaction", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	res, err := tx.Exec(ctx, `
		UPDATE quizzes
		SET title = $2,
		    is_published = $3,
		    pass_threshold = $4,
		    one_attempt = $5,
		    show_answers = $6
		WHERE id = $1
	`, id, strings.TrimSpace(req.Title), req.IsPublished, thresholdValue(req.PassThreshold), req.OneAttempt, req.ShowAnswers)
	if err != nil {
		return nil, apierr.Internal("could not update quiz", err)
	}
	if res.RowsAffected() == 0 {
		return nil, apierr.NotFound("quiz not found")
	}

	if _, err := tx.Exec(ctx, `DELETE FROM questions WHERE quiz_id = $1`, id); err != nil {
		return nil, apierr.Internal("could not replace questions", err)
	}
	if err := insertQuestions(ctx, tx, id, req.Questions); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, apierr.Internal("could not commit quiz", err)
	}
	committed = true

	return loadAdminQuiz(ctx, id)
}

//encore:api auth method=DELETE path=/admin/quizzes/:id
func DeleteQuiz(ctx context.Context, id int64) (*DeleteResponse, error) {
	if _, err := current.RequireRole("admin"); err != nil {
		return nil, err
	}

	res, err := store.DB.Exec(ctx, `DELETE FROM quizzes WHERE id = $1`, id)
	if err != nil {
		return nil, apierr.Internal("could not delete quiz", err)
	}
	if res.RowsAffected() == 0 {
		return nil, apierr.NotFound("quiz not found")
	}
	return &DeleteResponse{Deleted: true}, nil
}

//encore:api auth method=PATCH path=/admin/quizzes/:id/publish
func PublishQuiz(ctx context.Context, id int64, req *PublishRequest) (*AdminQuizDetail, error) {
	if _, err := current.RequireRole("admin"); err != nil {
		return nil, err
	}

	res, err := store.DB.Exec(ctx, `
		UPDATE quizzes
		SET is_published = $2
		WHERE id = $1
	`, id, req.IsPublished)
	if err != nil {
		return nil, apierr.Internal("could not change publish status", err)
	}
	if res.RowsAffected() == 0 {
		return nil, apierr.NotFound("quiz not found")
	}

	return loadAdminQuiz(ctx, id)
}

func insertQuestions(ctx context.Context, tx *sqldb.Tx, quizID int64, questions []QuestionInput) error {
	for questionIndex, question := range questions {
		var questionID int64
		err := tx.QueryRow(ctx, `
			INSERT INTO questions (quiz_id, text, order_index)
			VALUES ($1, $2, $3)
			RETURNING id
		`, quizID, strings.TrimSpace(question.Text), questionIndex).Scan(&questionID)
		if err != nil {
			return apierr.Internal("could not create question", err)
		}

		for answerIndex, answer := range question.Answers {
			_, err := tx.Exec(ctx, `
				INSERT INTO answers (question_id, text, is_correct, order_index)
				VALUES ($1, $2, $3, $4)
			`, questionID, strings.TrimSpace(answer.Text), answer.IsCorrect, answerIndex)
			if err != nil {
				return apierr.Internal("could not create answer", err)
			}
		}
	}
	return nil
}

func loadAdminQuiz(ctx context.Context, id int64) (*AdminQuizDetail, error) {
	var quiz AdminQuizDetail
	var threshold sql.NullInt64
	err := store.DB.QueryRow(ctx, `
		SELECT
			q.id,
			q.title,
			q.is_published,
			q.pass_threshold,
			q.one_attempt,
			q.show_answers,
			q.created_at,
			u.id,
			u.email
		FROM quizzes q
		JOIN users u ON u.id = q.created_by
		WHERE q.id = $1
	`, id).Scan(
		&quiz.ID,
		&quiz.Title,
		&quiz.IsPublished,
		&threshold,
		&quiz.OneAttempt,
		&quiz.ShowAnswers,
		&quiz.CreatedAt,
		&quiz.CreatedBy.ID,
		&quiz.CreatedBy.Email,
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
			answers.is_correct,
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
	quiz.Questions = make([]AdminQuestion, 0)
	for rows.Next() {
		var question AdminQuestion
		var answer AdminAnswer
		if err := rows.Scan(
			&question.ID,
			&question.Text,
			&question.Order,
			&answer.ID,
			&answer.Text,
			&answer.IsCorrect,
			&answer.Order,
		); err != nil {
			return nil, apierr.Internal("could not read question", err)
		}

		index, ok := questionIndex[question.ID]
		if !ok {
			question.Answers = make([]AdminAnswer, 0)
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

func thresholdValue(value *int) interface{} {
	if value == nil {
		return nil
	}
	return *value
}
