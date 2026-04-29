"use client";

import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import type { QuizResult } from "@/lib/api/types";
import { formatPercent } from "@/lib/format";

export function QuizResultView({ quizId }: { quizId: number }) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getQuizResult(quizId)
      .then((response) => {
        if (active) {
          setResult(response);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Could not load result.");
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

  if (loading) {
    return <div className="rounded-md border border-line bg-white p-6 text-sm text-muted">Loading...</div>;
  }

  if (!result) {
    return (
      <div className="grid gap-4">
        {error ? <Alert>{error}</Alert> : null}
        <Link href="/quizzes">
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Back
          </Button>
        </Link>
      </div>
    );
  }

  const passed = result.passed;

  return (
    <div className="grid gap-6">
      <div>
        <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-teal" href="/quizzes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <h1 className="text-3xl font-bold text-ink">{result.quiz_title}</h1>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <section className="rounded-md border border-line bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted">Score</p>
            <p className="mt-2 text-4xl font-bold text-ink">
              {result.score} / {result.total}
            </p>
            <p className="mt-1 text-lg font-semibold text-teal">{formatPercent(result.percentage)}</p>
          </div>
          {passed !== undefined ? (
            <Badge tone={passed ? "success" : "danger"}>{passed ? "Pass" : "Fail"}</Badge>
          ) : (
            <Badge tone="neutral">Recorded</Badge>
          )}
        </div>
      </section>

      {result.show_answers && result.questions ? (
        <section className="grid gap-4">
          <h2 className="text-xl font-bold text-ink">Answers</h2>
          {result.questions.map((question, index) => (
            <article key={question.question_id} className="rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-ink">
                  {index + 1}. {question.text}
                </h3>
                {question.is_correct ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                )}
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <ResultLine label="Your answer" value={question.user_answer?.text ?? "No answer"} />
                <ResultLine label="Correct answer" value={question.correct_answer?.text ?? "Unavailable"} />
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
