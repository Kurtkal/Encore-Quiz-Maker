"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api/client";
import type { AdminQuizDetail, UpsertQuizPayload } from "@/lib/api/types";

type AnswerForm = {
  key: string;
  text: string;
  isCorrect: boolean;
};

type QuestionForm = {
  key: string;
  text: string;
  answers: AnswerForm[];
};

type QuizFormState = {
  title: string;
  isPublished: boolean;
  passThreshold: string;
  oneAttempt: boolean;
  showAnswers: boolean;
  questions: QuestionForm[];
};

export function QuizEditor({ quizId }: { quizId?: number }) {
  const router = useRouter();
  const [state, setState] = useState<QuizFormState>(() => emptyState());
  const [loading, setLoading] = useState(Boolean(quizId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    let active = true;
    api
      .getAdminQuiz(quizId)
      .then((quiz) => {
        if (active) {
          setState(fromQuiz(quiz));
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Could not load quiz.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  const totalAnswers = useMemo(
    () => state.questions.reduce((total, question) => total + question.answers.length, 0),
    [state.questions],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validate(state);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(state);
      if (quizId) {
        await api.updateAdminQuiz(quizId, payload);
      } else {
        await api.createAdminQuiz(payload);
      }
      router.push("/admin/quizzes");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save quiz.");
    } finally {
      setSaving(false);
    }
  }

  function updateState(patch: Partial<QuizFormState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateQuestion(questionIndex: number, patch: Partial<QuestionForm>) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (index === questionIndex ? { ...question, ...patch } : question)),
    }));
  }

  function updateAnswer(questionIndex: number, answerIndex: number, patch: Partial<AnswerForm>) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }
        return {
          ...question,
          answers: question.answers.map((answer, nestedIndex) => (nestedIndex === answerIndex ? { ...answer, ...patch } : answer)),
        };
      }),
    }));
  }

  function setCorrectAnswer(questionIndex: number, answerIndex: number) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }
        return {
          ...question,
          answers: question.answers.map((answer, nestedIndex) => ({ ...answer, isCorrect: nestedIndex === answerIndex })),
        };
      }),
    }));
  }

  function addQuestion() {
    setState((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }));
  }

  function removeQuestion(questionIndex: number) {
    setState((current) => ({
      ...current,
      questions: current.questions.filter((_, index) => index !== questionIndex),
    }));
  }

  function addAnswer(questionIndex: number) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, answers: [...question.answers, emptyAnswer(false)] } : question,
      ),
    }));
  }

  function removeAnswer(questionIndex: number, answerIndex: number) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        const nextAnswers = question.answers.filter((_, nestedIndex) => nestedIndex !== answerIndex);
        const hasCorrect = nextAnswers.some((answer) => answer.isCorrect);
        return {
          ...question,
          answers: nextAnswers.map((answer, nestedIndex) => ({
            ...answer,
            isCorrect: hasCorrect ? answer.isCorrect : nestedIndex === 0,
          })),
        };
      }),
    }));
  }

  function moveQuestion(from: number, to: number) {
    setState((current) => ({ ...current, questions: moveItem(current.questions, from, to) }));
  }

  function moveAnswer(questionIndex: number, from: number, to: number) {
    setState((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, answers: moveItem(question.answers, from, to) } : question,
      ),
    }));
  }

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-6 text-sm text-muted">Loading...</div>;
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-teal" href="/admin/quizzes">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-ink">{quizId ? "Edit Quiz" : "Create Quiz"}</h1>
          <p className="mt-1 text-sm text-muted">
            {state.questions.length} questions, {totalAnswers} answers
          </p>
        </div>
        <Button type="submit" disabled={saving} icon={<Save className="h-4 w-4" aria-hidden="true" />}>
          {saving ? "Saving..." : "Save Quiz"}
        </Button>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <section className="grid gap-4 rounded-md border border-line bg-white p-5 shadow-soft">
        <Input label="Title" value={state.title} onChange={(event) => updateState({ title: event.target.value })} required />

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Passing threshold %"
            type="number"
            min={0}
            max={100}
            value={state.passThreshold}
            onChange={(event) => updateState({ passThreshold: event.target.value })}
          />
          <Toggle label="Published" checked={state.isPublished} onChange={(checked) => updateState({ isPublished: checked })} />
          <Toggle label="One attempt only" checked={state.oneAttempt} onChange={(checked) => updateState({ oneAttempt: checked })} />
          <Toggle label="Show answers after completion" checked={state.showAnswers} onChange={(checked) => updateState({ showAnswers: checked })} />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">Questions</h2>
          <Button type="button" variant="secondary" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={addQuestion}>
            Add Question
          </Button>
        </div>

        {state.questions.map((question, questionIndex) => (
          <article key={question.key} className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-ink">Question {questionIndex + 1}</h3>
              <div className="flex gap-1">
                <IconButton
                  label="Move question up"
                  disabled={questionIndex === 0}
                  onClick={() => moveQuestion(questionIndex, questionIndex - 1)}
                  icon={<ArrowUp className="h-4 w-4" aria-hidden="true" />}
                />
                <IconButton
                  label="Move question down"
                  disabled={questionIndex === state.questions.length - 1}
                  onClick={() => moveQuestion(questionIndex, questionIndex + 1)}
                  icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />}
                />
                <IconButton
                  label="Delete question"
                  onClick={() => removeQuestion(questionIndex)}
                  icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  danger
                />
              </div>
            </div>

            <Textarea
              label="Question text"
              value={question.text}
              onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
              required
            />

            <div className="mt-4 grid gap-3">
              {question.answers.map((answer, answerIndex) => (
                <div key={answer.key} className="grid gap-2 rounded border border-line p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="radio"
                      name={`correct-${question.key}`}
                      checked={answer.isCorrect}
                      onChange={() => setCorrectAnswer(questionIndex, answerIndex)}
                    />
                    Correct
                  </label>
                  <input
                    className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
                    value={answer.text}
                    onChange={(event) => updateAnswer(questionIndex, answerIndex, { text: event.target.value })}
                    required
                  />
                  <div className="flex gap-1">
                    <IconButton
                      label="Move answer up"
                      disabled={answerIndex === 0}
                      onClick={() => moveAnswer(questionIndex, answerIndex, answerIndex - 1)}
                      icon={<ArrowUp className="h-4 w-4" aria-hidden="true" />}
                    />
                    <IconButton
                      label="Move answer down"
                      disabled={answerIndex === question.answers.length - 1}
                      onClick={() => moveAnswer(questionIndex, answerIndex, answerIndex + 1)}
                      icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />}
                    />
                    <IconButton
                      label="Delete answer"
                      disabled={question.answers.length <= 2}
                      onClick={() => removeAnswer(questionIndex, answerIndex)}
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      danger
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              className="mt-4"
              variant="secondary"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => addAnswer(questionIndex)}
            >
              Add Answer
            </Button>
          </article>
        ))}
      </section>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-line transition disabled:cursor-not-allowed disabled:text-muted ${
        danger ? "text-danger hover:bg-red-50" : "text-ink hover:bg-canvas"
      }`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function emptyState(): QuizFormState {
  return {
    title: "",
    isPublished: false,
    passThreshold: "",
    oneAttempt: false,
    showAnswers: true,
    questions: [emptyQuestion()],
  };
}

function emptyQuestion(): QuestionForm {
  return {
    key: id(),
    text: "",
    answers: [emptyAnswer(true), emptyAnswer(false)],
  };
}

function emptyAnswer(isCorrect: boolean): AnswerForm {
  return {
    key: id(),
    text: "",
    isCorrect,
  };
}

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function fromQuiz(quiz: AdminQuizDetail): QuizFormState {
  return {
    title: quiz.title,
    isPublished: quiz.is_published,
    passThreshold: quiz.pass_threshold === undefined ? "" : String(quiz.pass_threshold),
    oneAttempt: quiz.one_attempt,
    showAnswers: quiz.show_answers,
    questions: quiz.questions
      .slice()
      .sort((left, right) => left.order_index - right.order_index)
      .map((question) => ({
        key: id(),
        text: question.text,
        answers: question.answers
          .slice()
          .sort((left, right) => left.order_index - right.order_index)
          .map((answer) => ({
            key: id(),
            text: answer.text,
            isCorrect: answer.is_correct,
          })),
      })),
  };
}

function validate(state: QuizFormState): string | null {
  if (!state.title.trim()) {
    return "Title is required.";
  }
  if (state.passThreshold.trim()) {
    const threshold = Number(state.passThreshold);
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
      return "Passing threshold must be a whole number from 0 to 100.";
    }
  }
  if (state.questions.length === 0) {
    return "Add at least one question.";
  }
  for (const [questionIndex, question] of state.questions.entries()) {
    if (!question.text.trim()) {
      return `Question ${questionIndex + 1} needs text.`;
    }
    if (question.answers.length < 2) {
      return `Question ${questionIndex + 1} needs at least two answers.`;
    }
    const correctCount = question.answers.filter((answer) => answer.isCorrect).length;
    if (correctCount !== 1) {
      return `Question ${questionIndex + 1} needs exactly one correct answer.`;
    }
    if (question.answers.some((answer) => !answer.text.trim())) {
      return `Question ${questionIndex + 1} has an empty answer.`;
    }
  }
  return null;
}

function toPayload(state: QuizFormState): UpsertQuizPayload {
  return {
    title: state.title.trim(),
    is_published: state.isPublished,
    pass_threshold: state.passThreshold.trim() ? Number(state.passThreshold) : null,
    one_attempt: state.oneAttempt,
    show_answers: state.showAnswers,
    questions: state.questions.map((question) => ({
      text: question.text.trim(),
      answers: question.answers.map((answer) => ({
        text: answer.text.trim(),
        is_correct: answer.isCorrect,
      })),
    })),
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
