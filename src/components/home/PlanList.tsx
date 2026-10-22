import Link from "next/link";
import type { PlanWithProgress } from "@/lib/data/plans";
import { LEVEL_LABELS } from "@/lib/validation/plan";
import { card, muted } from "@/components/ui/styles";
import { LawAlerts } from "@/components/law/LawAlerts";
import { Thermometer } from "@/components/memory/Thermometer";
import type { MemoryData } from "./HomeDashboard";
import { ExamCountdown } from "./ExamCountdown";
import { SharePlan } from "./SharePlan";

function ProgressBar({ counts }: { counts: { new: number; learning: number; review: number } }) {
  const total = counts.new + counts.learning + counts.review || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden>
      <span className="bg-emerald-500" style={{ width: pct(counts.review) }} />
      <span className="bg-amber-400" style={{ width: pct(counts.learning) }} />
    </div>
  );
}

const KIND_LABEL: Record<PlanWithProgress["kind"], string | null> = {
  topic: null,
  edital: "Edital",
  law: "Lei seca",
  mistakes: "Caderno de erros",
};

export function PlanList({
  plans,
  memory = null,
  retention = 0.9,
  newCardsPerDay,
  onRaiseNewPerDay,
}: {
  plans: PlanWithProgress[];
  memory?: MemoryData | null;
  retention?: number;
  newCardsPerDay: number;
  onRaiseNewPerDay: (value: number) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {plans.map((plan) => (
        <article key={plan.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{plan.topic}</h3>
              <p className={muted}>
                {KIND_LABEL[plan.kind] && (
                  <span className="mr-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                    {KIND_LABEL[plan.kind]}
                  </span>
                )}
                {plan.kind === "mistakes" ? "Questões que você errou, para não errar de novo" : LEVEL_LABELS[plan.level]}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {plan.kind === "edital" && (
                <Link
                  href={`/edital?plano=${plan.id}`}
                  className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
                >
                  Edital verticalizado
                </Link>
              )}
              <SharePlan planId={plan.id} initialToken={plan.shareToken} />
              <Link
                href={`/revisar?plano=${plan.id}`}
                className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
              >
                Revisar este plano
              </Link>
            </div>
          </div>
          {plan.kind === "law" && <LawAlerts planId={plan.id} />}
          {memory?.get(plan.id) && (
            <Thermometer
              topic={plan.topic}
              examDate={plan.examDate}
              steps={plan.steps}
              cards={memory.get(plan.id)!.cards}
              newPerDay={memory.get(plan.id)!.newPerDay}
              retention={retention}
            />
          )}
          {plan.kind !== "mistakes" && <ExamCountdown
            planId={plan.id}
            initialDate={plan.examDate}
            newCards={plan.steps.reduce((n, s) => n + s.counts.new, 0)}
            newCardsPerDay={newCardsPerDay}
            onRaiseNewPerDay={onRaiseNewPerDay}
          />}
          <ol className="mt-4 flex flex-col gap-3">
            {plan.steps.map((step) => (
              <li key={step.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{step.title}</span>
                  <span className="text-zinc-500">
                    {step.counts.new} novos · {step.counts.learning} aprendendo · {step.counts.review} em revisão
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar counts={step.counts} />
                </div>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}
