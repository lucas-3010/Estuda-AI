"use client";

import { useMemo, useState } from "react";
import {
  memoryBy,
  memoryOf,
  memoryTone,
  percent,
  projectExam,
  shareText,
  type Memory,
  type MemoryCard,
} from "@/lib/srs/thermometer";
import { muted } from "@/components/ui/styles";

const TONE_BAR: Record<ReturnType<typeof memoryTone>, string> = {
  low: "bg-red-500",
  mid: "bg-amber-400",
  high: "bg-emerald-500",
  none: "bg-zinc-300 dark:bg-zinc-700",
};

const TONE_TEXT: Record<ReturnType<typeof memoryTone>, string> = {
  low: "text-red-700 dark:text-red-400",
  mid: "text-amber-700 dark:text-amber-400",
  high: "text-emerald-700 dark:text-emerald-400",
  none: "text-zinc-500",
};

/** Barra de uma etapa: a largura é a chance de lembrar; o texto mostra quanto já foi estudado. */
export function MemoryBar({ label, memory }: { label: string; memory: Memory }) {
  const tone = memoryTone(memory.memory);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500">
          <strong className={`tabular-nums ${TONE_TEXT[tone]}`}>{percent(memory.memory)}</strong> lembrado ·{" "}
          {memory.studied} de {memory.total} estudados
        </span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="meter"
        aria-label={`Memória em ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((memory.memory ?? 0) * 100)}
      >
        <span className={`block h-full ${TONE_BAR[tone]}`} style={{ width: `${(memory.memory ?? 0) * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * Termômetro da prova de um plano: "Hoje você lembra de 72% do que estudou", uma barra por
 * etapa (disciplina) e a projeção para o dia da prova.
 */
export function Thermometer({
  topic,
  examDate,
  steps,
  cards,
  newPerDay,
  retention,
  variant = "compact",
}: {
  topic: string;
  examDate: string | null;
  steps: { id: string; title: string }[];
  cards: MemoryCard[];
  newPerDay: number;
  retention: number;
  variant?: "hero" | "compact";
}) {
  const [copied, setCopied] = useState(false);
  const now = useMemo(() => new Date(), []);
  const total = useMemo(() => memoryOf(cards, now), [cards, now]);
  const bySteps = useMemo(
    () => memoryBy(cards, steps.map((s) => s.id), (c) => c.step_id ?? "", now),
    [cards, steps, now],
  );
  const projection = useMemo(
    () => (examDate ? projectExam({ cards, now, examDate, newPerDay, retention }) : null),
    [cards, now, examDate, newPerDay, retention],
  );

  if (total.total === 0) return null;
  const tone = memoryTone(total.memory);

  async function share() {
    const text = shareText(topic, total, window.location.origin);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // A pessoa cancelou o compartilhamento.
    }
  }

  const headline =
    total.memory === null ? (
      <>Faça a primeira revisão para medir sua memória em {topic}.</>
    ) : (
      <>
        Hoje você lembra de <span className={TONE_TEXT[tone]}>{percent(total.memory)}</span> do que estudou para{" "}
        {topic}
      </>
    );

  const projectionLine = projection && projection.days > 0 && (
    <p className="text-sm">
      No dia da prova, daqui a {projection.days} {projection.days === 1 ? "dia" : "dias"}: mantendo o ritmo, você chega
      lembrando <strong className="tabular-nums">{percent(projection.keepPace)}</strong> do plano. Se parar hoje,{" "}
      <strong className="tabular-nums">{percent(projection.ifStop)}</strong>.
    </p>
  );

  const stepBars = (
    <div className="flex flex-col gap-3">
      {steps.map((s) => {
        const m = bySteps.get(s.id);
        return m && m.total > 0 ? <MemoryBar key={s.id} label={s.title} memory={m} /> : null;
      })}
    </div>
  );

  if (variant === "hero") {
    return (
      <section
        aria-label="Termômetro da prova"
        className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-900 dark:from-indigo-950/60 dark:to-zinc-900"
      >
        <p className="text-xs font-medium tracking-wide text-indigo-700 uppercase dark:text-indigo-400">
          Termômetro da prova
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className={`text-6xl font-semibold tabular-nums ${TONE_TEXT[tone]}`} data-testid="thermometer-memory">
            {percent(total.memory)}
          </p>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{headline}</h2>
            <p className={muted}>
              {total.studied} de {total.total} cartões estudados ({percent(total.coverage)} do plano)
            </p>
          </div>
        </div>
        {projectionLine && <div className="mt-3">{projectionLine}</div>}
        <div className="mt-5">{stepBars}</div>
        {total.memory !== null && (
          <button
            type="button"
            onClick={share}
            className="mt-4 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
          >
            {copied ? "Texto copiado ✓" : "Compartilhar meu resultado"}
          </button>
        )}
      </section>
    );
  }

  return (
    <details className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm">
        <span className="font-semibold">
          🌡️ Memória: <span className={`tabular-nums ${TONE_TEXT[tone]}`}>{percent(total.memory)}</span>
        </span>
        <span className="text-zinc-500">
          {" "}
          · {percent(total.coverage)} do plano estudado
          {projection && projection.days > 0 ? ` · ${percent(projection.keepPace)} previsto para a prova` : ""}
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {projectionLine}
        {stepBars}
      </div>
    </details>
  );
}
