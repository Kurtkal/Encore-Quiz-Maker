package attempts

import "time"

type SubmitQuizRequest struct {
	Answers []SubmittedAnswer `json:"answers"`
}

type SubmittedAnswer struct {
	QuestionID int64 `json:"question_id"`
	AnswerID   int64 `json:"answer_id"`
}

type QuizResultResponse struct {
	AttemptID   int64            `json:"attempt_id"`
	QuizID      int64            `json:"quiz_id"`
	QuizTitle   string           `json:"quiz_title"`
	Score       int              `json:"score"`
	Total       int              `json:"total"`
	Percentage  float64          `json:"percentage"`
	Passed      *bool            `json:"passed,omitempty"`
	ShowAnswers bool             `json:"show_answers"`
	CreatedAt   time.Time        `json:"created_at"`
	Questions   []QuestionResult `json:"questions,omitempty"`
}

type QuestionResult struct {
	QuestionID    int64         `json:"question_id"`
	Text          string        `json:"text"`
	CorrectAnswer *AnswerResult `json:"correct_answer,omitempty"`
	UserAnswer    *AnswerResult `json:"user_answer,omitempty"`
	IsCorrect     bool          `json:"is_correct"`
}

type AnswerResult struct {
	ID   int64  `json:"id"`
	Text string `json:"text"`
}
