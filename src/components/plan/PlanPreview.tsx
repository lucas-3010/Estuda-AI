"use client";

import { useState } from "react";
import { btnDanger, btnSecondary, card, input, muted } from "@/components/ui/styles";
import { newKey, type DraftCard, type DraftStep } from "./types";

export function PlanPreview({
  steps,
  onChange,
  onRegenerate,
}: {
  steps: DraftStep[];
  onChange: (steps: DraftStep[]) => void;
  onRegenerate: (stepKey: string) => void;
}) {
  const updateStep = (key: string, patch: Partial<DraftStep>) =>
    onChange(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const updateCard = (step: DraftStep, cardKey: string, patch: Partial<DraftCard>) =>
    updateStep(step.key, { cards: step.cards.map((c) => (c.key === cardKey ? { ...c, ...patch } : c)) });

  // Os versos ficam escondidos para a pessoa não ver as respostas antes de estudar.
  const [showBacks, setShowBacks] = useState(false);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const reveal = (key: string) => setRevealed((r) => (r.has(key) ? r : new Set(r).add(key)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={muted}>As respostas ficam escondidas para você não decorar antes de estudar.</p>
        <button type="button" className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400" onClick={() => setShowBacks((v) => !v)}>
          {showBacks ? "Esconder respostas" : "Mostrar todas as respostas para revisar"}
        </button>
      </div>
      {steps.map((step, index) => (
        <section key={step.key} className={card} aria-busy={step.regenerating || undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Etapa {index + 1}
              </p>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className={muted}>{step.goal}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={step.regenerating}
                onClick={() => onRegenerate(step.key)}
              >
                {step.regenerating ? "Gerando…" : "Gerar de novo"}
              </button>
              <button
                type="button"
                className={btnDanger}
                onClick={() => onChange(steps.filter((s) => s.key !== step.key))}
              >
                Apagar etapa
              </button>
            </div>
          </div>

          <ol className="mt-4 flex flex-col gap-3">
            {step.cards.map((c, i) => (
              <li key={c.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-zinc-500">
                    Frente {i + 1}
                    <textarea
                      rows={3}
                      value={c.front}
                      onChange={(e) => updateCard(step, c.key, { front: e.target.value })}
                      className={`mt-1 font-mono text-sm ${input}`}
                    />
                  </label>
                  <div className="text-xs font-medium text-zinc-500">
                    <span>Verso {i + 1}</span>
                    {(() => {
                      const field = (
                        <textarea
                          rows={3}
                          aria-label={`Verso ${i + 1}`}
                          value={c.back}
                          onChange={(e) => {
                            reveal(c.key);
                            updateCard(step, c.key, { back: e.target.value });
                          }}
                          className={`mt-1 font-mono text-sm ${input}`}
                        />
                      );
                      // Cartão novo, ainda vazio, já mostra o campo para preencher.
                      if (showBacks || !c.back || revealed.has(c.key)) return field;
                      return (
                        <button
                          type="button"
                          onClick={() => reveal(c.key)}
                          className="mt-1 flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-sm font-normal text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                        >
                          Mostrar verso
                        </button>
                      );
                    })()}
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm text-red-700 hover:underline dark:text-red-400"
                  onClick={() => updateStep(step.key, { cards: step.cards.filter((x) => x.key !== c.key) })}
                >
                  Apagar cartão
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
            onClick={() => updateStep(step.key, { cards: [...step.cards, { key: newKey(), front: "", back: "" }] })}
          >
            + Adicionar cartão
          </button>
        </section>
      ))}
    </div>
  );
}
