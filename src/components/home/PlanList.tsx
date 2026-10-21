import Link from "next/link";
import type { PlanWithProgress } from "@/lib/data/plans";
import { LEVEL_LABELS } from "@/lib/validation/plan";
import { card, muted } from "@/components/ui/styles";

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

export function PlanList({ plans }: { plans: PlanWithProgress[] }) {
  return (
    <div className="flex flex-col gap-4">
      {plans.map((plan) => (
        <article key={plan.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{plan.topic}</h3>
              <p className={muted}>{LEVEL_LABELS[plan.level]}</p>
            </div>
            <Link
              href={`/revisar?plano=${plan.id}`}
              className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Revisar este plano
            </Link>
          </div>
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
