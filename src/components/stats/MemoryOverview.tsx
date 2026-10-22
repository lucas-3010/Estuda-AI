"use client";

import { useEffect, useState } from "react";
import { listMemoryCards } from "@/lib/data/memory";
import { listPlansWithProgress } from "@/lib/data/plans";
import { memoryBy, memoryOf, type Memory } from "@/lib/srs/thermometer";
import { MemoryBar } from "@/components/memory/Thermometer";
import { card, muted } from "@/components/ui/styles";

type PlanMemory = { id: string; topic: string; total: Memory; steps: { id: string; title: string; memory: Memory }[] };

/** Termômetro de todos os planos: quanto a pessoa lembra de cada um e de cada etapa. */
export function MemoryOverview() {
  const [plans, setPlans] = useState<PlanMemory[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([listPlansWithProgress(), listMemoryCards()])
      .then(([list, cards]) => {
        const now = new Date();
        const planOfStep = new Map(list.flatMap((p) => p.steps.map((s) => [s.id, p.id] as const)));
        setPlans(
          list
            .map((p) => {
              const own = cards.filter((c) => c.step_id && planOfStep.get(c.step_id) === p.id);
              const bySteps = memoryBy(own, p.steps.map((s) => s.id), (c) => c.step_id ?? "", now);
              return {
                id: p.id,
                topic: p.topic,
                total: memoryOf(own, now),
                steps: p.steps.map((s) => ({ id: s.id, title: s.title, memory: bySteps.get(s.id)! })),
              };
            })
            .filter((p) => p.total.studied > 0),
        );
      })
      .catch(() => setError(true));
  }, []);

  if (error || !plans || plans.length === 0) return null;

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Termômetro da prova</h2>
      <p className={`mt-1 ${muted}`}>
        Chance média de você lembrar hoje dos cartões que já estudou, calculada pelo FSRS. Abra um plano para ver cada etapa.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {plans.map((p) => (
          <details key={p.id}>
            <summary className="cursor-pointer list-none">
              <MemoryBar label={p.topic} memory={p.total} />
            </summary>
            <div className="mt-3 flex flex-col gap-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
              {p.steps
                .filter((s) => s.memory.total > 0)
                .map((s) => (
                  <MemoryBar key={s.id} label={s.title} memory={s.memory} />
                ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
