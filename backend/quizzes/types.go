package quizzes

import "time"

type QuizSummary struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	IsPublished   bool       `json:"is_published"`
	QuestionCount int        `json:"question_count"`
	PassThreshold *int       `json:"pass_threshold,omitempty"`
	OneAttempt    bool       `json:"one_attempt"`
	ShowAnswers   bool       `json:"show_answers"`
	Completed     bool       `json:"completed,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	CreatedBy     *AdminUser `json:"created_by,omitempty"`
}

type AdminUser struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
}

type QuizListResponse struct {
	Quizzes []QuizSummary `json:"quizzes"`
}

type AnswerInput struct {
	Text      string `json:"text"`
	IsCorrect bool   `json:"is_correct"`
}

type QuestionInput struct {
	Text    string        `json:"text"`
	Answers []AnswerInput `json:"answers"`
}

type UpsertQuizRequest struct {
	Title         string          `json:"title"`
	IsPublished   bool            `json:"is_published"`
	PassThreshold *int            `json:"pass_threshold"`
	OneAttempt    bool            `json:"one_attempt"`
	ShowAnswers   bool            `json:"show_answers"`
	Questions     []QuestionInput `json:"questions"`
}

type PublishRequest struct {
	IsPublished bool `json:"is_published"`
}

type AdminQuizDetail struct {
	ID            int64           `json:"id"`
	Title         string          `json:"title"`
	IsPublished   bool            `json:"is_published"`
	PassThreshold *int            `json:"pass_threshold"`
	OneAttempt    bool            `json:"one_attempt"`
	ShowAnswers   bool            `json:"show_answers"`
	QuestionCount int             `json:"question_count"`
	CreatedAt     time.Time       `json:"created_at"`
	CreatedBy     AdminUser       `json:"created_by"`
	Questions     []AdminQuestion `json:"questions"`
}

type AdminQuestion struct {
	ID      int64         `json:"id"`
	Text    string        `json:"text"`
	Order   int           `json:"order_index"`
	Answers []AdminAnswer `json:"answers"`
}

type AdminAnswer struct {
	ID        int64  `json:"id"`
	Text      string `json:"text"`
	IsCorrect bool   `json:"is_correct"`
	Order     int    `json:"order_index"`
}

type PublicQuizDetail struct {
	ID            int64            `json:"id"`
	Title         string           `json:"title"`
	QuestionCount int              `json:"question_count"`
	PassThreshold *int             `json:"pass_threshold,omitempty"`
	OneAttempt    bool             `json:"one_attempt"`
	Completed     bool             `json:"completed"`
	Questions     []PublicQuestion `json:"questions"`
}

type PublicQuestion struct {
	ID      int64          `json:"id"`
	Text    string         `json:"text"`
	Order   int            `json:"order_index"`
	Answers []PublicAnswer `json:"answers"`
}

type PublicAnswer struct {
	ID    int64  `json:"id"`
	Text  string `json:"text"`
	Order int    `json:"order_index"`
}
