"use client";

import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import type { PublicQuizDetail } from "@/lib/api/types";

export function TakeQuiz({ quizId }: { quizId: number }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<PublicQuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getQuiz(quizId)
      .then((response) => {
        if (active) {
          setQuiz(response);
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

  const answeredCount = useMemo(() => {
    if (!quiz) {
      return 0;
    }
    return quiz.questions.filter((question) => answers[question.id] !== undefined).length;
  }, [answers, quiz]);

  const allAnswered = quiz ? answeredCount === quiz.questions.length : false;
  const progress = quiz && quiz.questions.length > 0 ? Math.round((answeredCount / quiz.questions.length) * 100) : 0;

  async function submit() {
    if (!quiz || !allAnswered) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.submitQuiz(quiz.id, {
        answers: quiz.questions.map((question) => ({
          question_id: question.id,
          answer_id: answers[question.id],
        })),
      });
      router.push(`/quizzes/${quiz.id}/result`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-6 text-sm text-muted">Loading...</div>;
  }

  if (!quiz) {
    return (
      <div className="grid gap-4">
        {error ? <Alert>{error}</Alert> : null}
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal" href="/quizzes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      </div>
    );
  }

  if (quiz.one_attempt && quiz.completed) {
    return (
      <div className="grid gap-4 rounded-md border border-line bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-ink">{quiz.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/quizzes/${quiz.id}/result`}>
            <Button variant="secondary" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
              View Result
            </Button>
          </Link>
          <Link href="/quizzes">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
              Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-teal" href="/quizzes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <h1 className="text-3xl font-bold text-ink">{quiz.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {answeredCount} of {quiz.questions.length} answered
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-teal transition-all" style={{ width: `${progress}%` }} />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-4">
        {quiz.questions.map((question, questionIndex) => (
          <section key={question.id} className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="text-base font-bold text-ink">
              {questionIndex + 1}. {question.text}
            </h2>
            <div className="mt-4 grid gap-2">
              {question.answers.map((answer) => (
                <label
                  key={answer.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-3 text-sm font-medium text-ink transition hover:border-teal hover:bg-teal/5"
                >
                  <input
                    className="mt-1"
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === answer.id}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: answer.id }))}
                  />
                  <span>{answer.text}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!allAnswered || submitting}
          icon={<Send className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void submit()}
        >
          {submitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </div>
    </div>
  );
}
