"use client";

import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { api, ApiError } from "@/lib/api/client";
import type { QuizSummary } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export function AdminQuizList() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listAdminQuizzes()
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

  async function togglePublish(quiz: QuizSummary) {
    setBusyId(quiz.id);
    setError(null);
    try {
      const updated = await api.publishAdminQuiz(quiz.id, !quiz.is_published);
      setQuizzes((items) =>
        items.map((item) =>
          item.id === quiz.id
            ? {
                ...item,
                is_published: updated.is_published,
                pass_threshold: updated.pass_threshold,
                one_attempt: updated.one_attempt,
                show_answers: updated.show_answers,
                question_count: updated.question_count,
              }
            : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update quiz.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteQuiz(quiz: QuizSummary) {
    if (!window.confirm(`Delete "${quiz.title}"?`)) {
      return;
    }

    setBusyId(quiz.id);
    setError(null);
    try {
      await api.deleteAdminQuiz(quiz.id);
      setQuizzes((items) => items.filter((item) => item.id !== quiz.id));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete quiz.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Admin Quizzes</h1>
          <p className="mt-1 text-sm text-muted">{quizzes.length} total</p>
        </div>
        <Link href="/admin/quizzes/new">
          <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Create Quiz</Button>
        </Link>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {loading ? <div className="rounded-md border border-line bg-white p-6 text-sm text-muted">Loading...</div> : null}

      {!loading && quizzes.length === 0 ? (
        <EmptyState title="No quizzes yet">
          <Link className="font-semibold text-teal" href="/admin/quizzes/new">
            Create Quiz
          </Link>
        </EmptyState>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {quizzes.map((quiz) => (
          <article key={quiz.id} className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold text-ink">{quiz.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {quiz.question_count} questions - Created {formatDate(quiz.created_at)}
                </p>
              </div>
              <Badge tone={quiz.is_published ? "success" : "warning"}>{quiz.is_published ? "Published" : "Draft"}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-line px-3 py-2">
                <div className="text-xs font-bold uppercase text-muted">Threshold</div>
                <div className="mt-1 font-semibold text-ink">{quiz.pass_threshold ?? "None"}</div>
              </div>
              <div className="rounded border border-line px-3 py-2">
                <div className="text-xs font-bold uppercase text-muted">Attempts</div>
                <div className="mt-1 font-semibold text-ink">{quiz.one_attempt ? "One" : "Multiple"}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                <Button variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden="true" />}>
                  Edit
                </Button>
              </Link>
              <Button
                variant="secondary"
                disabled={busyId === quiz.id}
                icon={quiz.is_published ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                onClick={() => void togglePublish(quiz)}
              >
                {quiz.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button
                variant="danger"
                disabled={busyId === quiz.id}
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                onClick={() => void deleteQuiz(quiz)}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
