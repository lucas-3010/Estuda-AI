import { QuizSession } from "@/components/quiz/QuizSession";

export default function QuizPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Quiz</h1>
      <QuizSession />
    </div>
  );
}
