import { Suspense } from "react";
import { NewTopicFlow } from "@/components/plan/NewTopicFlow";

export default function NewTopicPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo tema</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Diga o que quer aprender. A IA monta um plano em etapas com flashcards, e você revisa antes de salvar.
        </p>
      </div>
      <Suspense fallback={null}>
        <NewTopicFlow />
      </Suspense>
    </div>
  );
}
