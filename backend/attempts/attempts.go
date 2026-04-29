package attempts

import (
	"context"
	"database/sql"
	"errors"
	"math"

	"quizsystem/internal/apierr"
	"quizsystem/internal/current"
	"quizsystem/internal/store"

	"encore.dev/storage/sqldb"
)

//encore:api auth method=POST path=/quizzes/:id/submit
func SubmitQuiz(ctx context.Context, id int64, req *SubmitQuizRequest) (*QuizResultResponse, error) {
	user, err := current.RequireRole("user")
	if err != nil {
		return nil, err
	}
	if len(req.Answers) == 0 {
		return nil, apierr.Invalid("answers are required")
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

	var oneAttempt bool
	err = tx.QueryRow(ctx, `
		SELECT one_attempt
		FROM quizzes
		WHERE id = $1 AND is_published = true
		FOR UPDATE
	`, id).Scan(&oneAttempt)
	if err != nil {
		if errors.Is(err, sqldb.ErrNoRows) {
			return nil, apierr.NotFound("quiz not found")
		}
		return nil, apierr.Internal("could not load quiz", err)
	}

	if oneAttempt {
		var existing int64
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM attempts
			WHERE quiz_id = $1 AND user_id = $2
		`, id, user.ID).Scan(&existing); err != nil {
			return nil, apierr.Internal("could not check previous attempts", err)
		}
		if existing > 0 {
			return nil, apierr.FailedPrecondition("this quiz only allows one attempt")
		}
	}

	questionAnswers, err := loadScoringKey(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	total := len(questionAnswers)
	if total == 0 {
		return nil, apierr.FailedPrecondition("quiz has no questions")
	}

	score, err := scoreSubmission(req.Answers, questionAnswers, total)
	if err != nil {
		return nil, err
	}

	var attemptID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO attempts (quiz_id, user_id, score, total)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, id, user.ID, score, total).Scan(&attemptID)
	if err != nil {
		return nil, apierr.Internal("could not create attempt", err)
	}

	for _, answer := range req.Answers {
		_, err := tx.Exec(ctx, `
			INSERT INTO attempt_answers (attempt_id, question_id, answer_id)
			VALUES ($1, $2, $3)
		`, attemptID, answer.QuestionID, answer.AnswerID)
		if err != nil {
			return nil, apierr.Internal("could not save submitted answer", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, apierr.Internal("could not commit attempt", err)
	}
	committed = true

	return loadAttemptResult(ctx, attemptID, user.ID)
}

//encore:api auth method=GET path=/quizzes/:id/result
func GetLatestResult(ctx context.Context, id int64) (*QuizResultResponse, error) {
	user, err := current.RequireRole("user")
	if err != nil {
		return nil, err
	}

	var attemptID int64
	err = store.DB.QueryRow(ctx, `
		SELECT attempts.id
		FROM attempts
		JOIN quizzes ON quizzes.id = attempts.quiz_id
		WHERE attempts.quiz_id = $1
		  AND attempts.user_id = $2
		  AND quizzes.is_published = true
		ORDER BY attempts.created_at DESC
		LIMIT 1
	`, id, user.ID).Scan(&attemptID)
	if err != nil {
		if errors.Is(err, sqldb.ErrNoRows) {
			return nil, apierr.NotFound("result not found")
		}
		return nil, apierr.Internal("could not load result", err)
	}

	return loadAttemptResult(ctx, attemptID, user.ID)
}

func loadScoringKey(ctx context.Context, tx *sqldb.Tx, quizID int64) (map[int64]map[int64]bool, error) {
	rows, err := tx.Query(ctx, `
		SELECT questions.id, answers.id, answers.is_correct
		FROM questions
		JOIN answers ON answers.question_id = questions.id
		WHERE questions.quiz_id = $1
	`, quizID)
	if err != nil {
		return nil, apierr.Internal("could not load quiz answers", err)
	}
	defer rows.Close()

	key := map[int64]map[int64]bool{}
	for rows.Next() {
		var questionID int64
		var answerID int64
		var isCorrect bool
		if err := rows.Scan(&questionID, &answerID, &isCorrect); err != nil {
			return nil, apierr.Internal("could not read quiz answers", err)
		}
		if _, ok := key[questionID]; !ok {
			key[questionID] = map[int64]bool{}
		}
		key[questionID][answerID] = isCorrect
	}
	if err := rows.Err(); err != nil {
		return nil, apierr.Internal("could not read quiz answers", err)
	}

	return key, nil
}

func scoreSubmission(submitted []SubmittedAnswer, key map[int64]map[int64]bool, total int) (int, error) {
	if len(submitted) != total {
		return 0, apierr.Invalid("answer every question before submitting")
	}

	score := 0
	seen := map[int64]bool{}
	for _, item := range submitted {
		answers, ok := key[item.QuestionID]
		if !ok {
			return 0, apierr.Invalid("submitted question does not belong to this quiz")
		}
		if seen[item.QuestionID] {
			return 0, apierr.Invalid("duplicate answer submitted for a question")
		}
		seen[item.QuestionID] = true

		isCorrect, ok := answers[item.AnswerID]
		if !ok {
			return 0, apierr.Invalid("submitted answer does not belong to its question")
		}
		if isCorrect {
			score++
		}
	}

	if len(seen) != total {
		return 0, apierr.Invalid("answer every question before submitting")
	}

	return score, nil
}

func loadAttemptResult(ctx context.Context, attemptID int64, userID int64) (*QuizResultResponse, error) {
	var result QuizResultResponse
	var threshold sql.NullInt64
	err := store.DB.QueryRow(ctx, `
		SELECT
			attempts.id,
			attempts.quiz_id,
			quizzes.title,
			attempts.score,
			attempts.total,
			attempts.created_at,
			quizzes.pass_threshold,
			quizzes.show_answers
		FROM attempts
		JOIN quizzes ON quizzes.id = attempts.quiz_id
		WHERE attempts.id = $1 AND attempts.user_id = $2
	`, attemptID, userID).Scan(
		&result.AttemptID,
		&result.QuizID,
		&result.QuizTitle,
		&result.Score,
		&result.Total,
		&result.CreatedAt,
		&threshold,
		&result.ShowAnswers,
	)
	if err != nil {
		if errors.Is(err, sqldb.ErrNoRows) {
			return nil, apierr.NotFound("result not found")
		}
		return nil, apierr.Internal("could not load result", err)
	}

	result.Percentage = math.Round((float64(result.Score)/float64(result.Total))*10000) / 100
	if threshold.Valid {
		passed := result.Percentage >= float64(threshold.Int64)
		result.Passed = &passed
	}

	if result.ShowAnswers {
		questions, err := loadAnswerReview(ctx, result.QuizID, result.AttemptID)
		if err != nil {
			return nil, err
		}
		result.Questions = questions
	}

	return &result, nil
}

func loadAnswerReview(ctx context.Context, quizID int64, attemptID int64) ([]QuestionResult, error) {
	rows, err := store.DB.Query(ctx, `
		SELECT
			questions.id,
			questions.text,
			correct_answers.id,
			correct_answers.text,
			user_answers.id,
			user_answers.text,
			COALESCE(user_answers.id = correct_answers.id, false)
		FROM questions
		JOIN answers correct_answers
		  ON correct_answers.question_id = questions.id
		 AND correct_answers.is_correct = true
		LEFT JOIN attempt_answers
		  ON attempt_answers.question_id = questions.id
		 AND attempt_answers.attempt_id = $2
		LEFT JOIN answers user_answers
		  ON user_answers.id = attempt_answers.answer_id
		WHERE questions.quiz_id = $1
		ORDER BY questions.order_index
	`, quizID, attemptID)
	if err != nil {
		return nil, apierr.Internal("could not load answer review", err)
	}
	defer rows.Close()

	results := make([]QuestionResult, 0)
	for rows.Next() {
		var question QuestionResult
		var correct AnswerResult
		var userAnswerID sql.NullInt64
		var userAnswerText sql.NullString
		if err := rows.Scan(
			&question.QuestionID,
			&question.Text,
			&correct.ID,
			&correct.Text,
			&userAnswerID,
			&userAnswerText,
			&question.IsCorrect,
		); err != nil {
			return nil, apierr.Internal("could not read answer review", err)
		}

		question.CorrectAnswer = &correct
		if userAnswerID.Valid && userAnswerText.Valid {
			question.UserAnswer = &AnswerResult{ID: userAnswerID.Int64, Text: userAnswerText.String}
		}
		results = append(results, question)
	}
	if err := rows.Err(); err != nil {
		return nil, apierr.Internal("could not read answer review", err)
	}

	return results, nil
}
