"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiError } from "@/lib/ai/errors";
import { addReinforcement, missedCards, weakSteps, type WeakStep } from "@/lib/data/weak";
import { callGenerate } from "@/lib/generateClient";
import type { GeneratedCard, GeneratedReinforce } from "@/lib/validation/plan";
import { HiddenAnswer } from "@/components/HiddenAnswer";
import { Markdown } from "@/components/Markdown";
import { btnPrimary, btnSecondary, card, muted } from "@/components/ui/styles";

type Row = { status: "idle" } | { status: "busy" } | { status: "preview"; cards: GeneratedCard[] } | { status: "saved"; count: number };

/** Etapas em que a pessoa mais erra, com cartões de reforço gerados pela IA. */
export function WeakSpots() {
  const [steps, setSteps] = useState<WeakStep[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    weakSteps(30)
      .then(setSteps)
      .catch(() => setFailed(true));
  }, []);

  const setRow = (stepId: string, row: Row) => setRows((current) => ({ ...current, [stepId]: row }));

  async function reinforce(step: WeakStep) {
    setError(null);
    setRow(step.stepId, { status: "busy" });
    try {
      const missed = await missedCards(step.stepId);
      if (missed.length === 0) throw new Error("sem erros");
      const result = await callGenerate<GeneratedReinforce>({
        mode: "reinforce",
        topic: step.topic,
        level: step.level,
        step: { title: step.title, goal: step.goal },
        missed,
      });
      setRow(step.stepId, { status: "preview", cards: result.cards });
    } catch (e) {
      setError(e instanceof AiError ? e.message : "Não foi possível gerar os cartões de reforço. Tente de novo.");
      setRow(step.stepId, { status: "idle" });
    }
  }

  async function save(step: WeakStep, cards: GeneratedCard[]) {
    setRow(step.stepId, { status: "busy" });
    try {
      setRow(step.stepId, { status: "saved", count: await addReinforcement(step.stepId, cards) });
    } catch {
      setError("Não foi possível salvar os cartões. Tente de novo.");
      setRow(step.stepId, { status: "preview", cards });
    }
  }

  if (failed) return null;

  return (
    <section className={card} aria-labelledby="pontos-fracos">
      <h2 id="pontos-fracos" className="text-lg font-semibold">
        Pontos fracos
      </h2>
      <p className={muted}>Etapas em que você mais errou nos últimos 30 dias.</p>

      {!steps ? (
        <p className={`mt-4 ${muted}`}>Carregando…</p>
      ) : steps.length === 0 ? (
        <p className="mt-4">Nenhum erro nos últimos 30 dias. Continue assim! 💪</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {steps.map((step) => {
            const row = rows[step.stepId] ?? { status: "idle" };
            const rate = Math.round((step.misses / step.reviews) * 100);
            return (
              <li key={step.stepId} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-zinc-500">{step.topic}</p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {step.misses} {step.misses === 1 ? "erro" : "erros"} em {step.reviews} revisões ({rate}%)
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden>
                  <span className="block h-full bg-red-400" style={{ width: `${rate}%` }} />
                </div>

                {row.status === "idle" && (
                  <button type="button" className={`${btnSecondary} self-start text-sm`} onClick={() => reinforce(step)}>
                    Gerar cartões de reforço
                  </button>
                )}
                {row.status === "busy" && (
                  <p role="status" className={muted}>
                    A IA está preparando cartões para os seus erros…
                  </p>
                )}
                {row.status === "preview" && (
                  <div className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
                    <p className="text-sm font-medium">{row.cards.length} cartões de reforço. Confira antes de salvar:</p>
                    <ul className="flex flex-col gap-2">
                      {row.cards.map((c, i) => (
                        <li key={i} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                          <Markdown source={c.front} />
                          <div className="mt-2">
                            <HiddenAnswer>
                              <Markdown source={c.back} />
                            </HiddenAnswer>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-3">
                      <button type="button" className={btnPrimary} onClick={() => save(step, row.cards)}>
                        Salvar {row.cards.length} cartões
                      </button>
                      <button type="button" className={btnSecondary} onClick={() => setRow(step.stepId, { status: "idle" })}>
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
                {row.status === "saved" && (
                  <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
                    {row.count} cartões salvos nesta etapa. Eles entram nas suas{" "}
                    <Link href="/revisar" className="underline">
                      revisões
                    </Link>{" "}
                    como novos.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <p className={`mt-4 text-xs ${muted}`}>Cada geração de reforço conta como uma geração com IA do seu plano.</p>
    </section>
  );
}
