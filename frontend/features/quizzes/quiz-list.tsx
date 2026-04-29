"use client";

import { CheckCircle2, ClipboardList, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { api, ApiError } from "@/lib/api/client";
import type { QuizSummary } from "@/lib/api/types";

export function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listQuizzes()
      .then((response) => {
        if (active) {
          setQuizzes(response.quizzes);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : "Could not load quizzes.");
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
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Quizzes</h1>
        <p className="mt-1 text-sm text-muted">{quizzes.length} available</p>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {loading ? <div className="rounded-md border border-line bg-white p-6 text-sm text-muted">Loading...</div> : null}

      {!loading && quizzes.length === 0 ? (
        <EmptyState title="No published quizzes">
          <span>Check back later.</span>
        </EmptyState>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {quizzes.map((quiz) => {
          const completed = Boolean(quiz.completed);
          const locked = quiz.one_attempt && completed;
          return (
            <article key={quiz.id} className="rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold text-ink">{quiz.title}</h2>
                  <p className="mt-1 text-sm text-muted">{quiz.question_count} questions</p>
                </div>
                {completed ? <Badge tone="success">Completed</Badge> : <Badge tone="neutral">Open</Badge>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1 rounded border border-line px-2 py-1">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  {quiz.one_attempt ? "One attempt" : "Multiple attempts"}
                </span>
                {quiz.pass_threshold !== undefined ? (
                  <span className="rounded border border-line px-2 py-1">Pass at {quiz.pass_threshold}%</span>
                ) : null}
              </div>

              <div className="mt-5">
                {locked ? (
                  <Link href={`/quizzes/${quiz.id}/result`}>
                    <Button variant="secondary" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
                      View Result
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/quizzes/${quiz.id}`}>
                    <Button icon={<PlayCircle className="h-4 w-4" aria-hidden="true" />}>Take Quiz</Button>
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
