package quizzes

import (
	"strconv"
	"strings"

	"quizsystem/internal/apierr"
)

func validateQuizInput(req *UpsertQuizRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return apierr.Invalid("quiz title is required")
	}
	if req.PassThreshold != nil && (*req.PassThreshold < 0 || *req.PassThreshold > 100) {
		return apierr.Invalid("passing threshold must be between 0 and 100")
	}
	if len(req.Questions) == 0 {
		return apierr.Invalid("at least one question is required")
	}

	for questionIndex, question := range req.Questions {
		if strings.TrimSpace(question.Text) == "" {
			return apierr.Invalid("each question must include text")
		}
		if len(question.Answers) < 2 {
			return apierr.Invalid("each question must have at least two answers")
		}

		correctCount := 0
		for _, answer := range question.Answers {
			if strings.TrimSpace(answer.Text) == "" {
				return apierr.Invalid("each answer must include text")
			}
			if answer.IsCorrect {
				correctCount++
			}
		}
		if correctCount != 1 {
			return apierr.Invalid("question " + ordinal(questionIndex+1) + " must have exactly one correct answer")
		}
	}

	return nil
}

func ordinal(value int) string {
	return strconv.Itoa(value)
}
