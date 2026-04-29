import { QuizResultView } from "@/features/quizzes/quiz-result";

export default async function QuizResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizResultView quizId={Number(id)} />;
}
