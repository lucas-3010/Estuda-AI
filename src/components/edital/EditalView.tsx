"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiError, aiErrorMessage } from "@/lib/ai/errors";
import { getEditalByPlan, type Edital } from "@/lib/data/edital";
import { listMemoryCards, paceOf, recentlyStartedCards } from "@/lib/data/memory";
import { listPlansWithProgress, type PlanWithProgress } from "@/lib/data/plans";
import { getSettings } from "@/lib/data/settings";
import { shortDate } from "@/lib/exam";
import { callGenerate } from "@/lib/generateClient";
import { memoryBy, memoryOf, memoryTone, percent, type MemoryCard } from "@/lib/srs/thermometer";
import type { EditalStepResult } from "@/lib/validation/plan";
import { ApprovalChance } from "@/components/memory/ApprovalChance";
import { MemoryBar, Thermometer } from "@/components/memory/Thermometer";
import { btnPrimary, btnSecondary, card, muted } from "@/components/ui/styles";

/** Disciplinas geradas ao mesmo tempo. */
const PARALLEL = 2;

type StepStatus = "waiting" | "working" | "done" | { error: string };

type Loaded = {
  plan: PlanWithProgress;
  edital: Edital;
  cards: MemoryCard[];
  newPerDay: number;
  retention: number;
};

const TOPIC_TONE: Record<ReturnType<typeof memoryTone>, string> = {
  low: "text-red-700 dark:text-red-400",
  mid: "text-amber-700 dark:text-amber-400",
  high: "text-emerald-700 dark:text-emerald-400",
  none: "text-zinc-500",
};

async function fetchEdital(planId: string): Promise<Loaded | "missing" | "error"> {
  try {
    const [plans, edital, settings, all, recent] = await Promise.all([
      listPlansWithProgress(),
      getEditalByPlan(planId),
      getSettings(),
      listMemoryCards(),
      recentlyStartedCards(),
    ]);
    const plan = plans.find((p) => p.id === planId);
    if (!plan || !edital) return "missing";
    const stepIds = new Set(plan.steps.map((s) => s.id));
    const cards = all.filter((c) => c.step_id && stepIds.has(c.step_id));
    return { plan, edital, cards, newPerDay: paceOf(cards, recent), retention: settings.desiredRetention };
  } catch {
    return "error";
  }
}

/** Edital verticalizado: disciplinas, tópicos, o que já foi estudado e o termômetro de cada item. */
export function EditalView() {
  const params = useSearchParams();
  const planId = params.get("plano") ?? "";
  const [data, setData] = useState<Loaded | null | "error" | "missing">(null);
  const [status, setStatus] = useState<Record<number, StepStatus>>({});
  const started = useRef(false);

  const load = useCallback(async () => {
    const loaded = await fetchEdital(planId);
    setData(loaded);
    return typeof loaded === "object" ? loaded : null;
  }, [planId]);

  const generate = useCallback(
    async (edital: Edital, indexes: number[]) => {
      setStatus((s) => ({ ...s, ...Object.fromEntries(indexes.map((i) => [i, "waiting" as const])) }));
      const queue = [...indexes];
      async function worker() {
        for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
          setStatus((s) => ({ ...s, [index]: "working" }));
          try {
            await callGenerate<EditalStepResult>({ mode: "edital_step", editalId: edital.id, index });
            setStatus((s) => ({ ...s, [index]: "done" }));
          } catch (e) {
            const code = e instanceof AiError ? e.code : "network";
            setStatus((s) => ({ ...s, [index]: code === "already_generated" ? "done" : { error: aiErrorMessage(code) } }));
          }
        }
      }
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      await load();
    },
    [load],
  );

  useEffect(() => {
    void fetchEdital(planId).then((result) => {
      setData(result);
      const loaded = typeof result === "object" ? result : null;
      if (!loaded || started.current || params.get("gerar") !== "1") return;
      started.current = true;
      const missing = loaded.edital.disciplines.map((_, i) => i).filter((i) => !loaded.edital.generated.includes(i));
      if (missing.length > 0) void generate(loaded.edital, missing);
    });
  }, [planId, generate, params]);

  if (data === null) return <p className={muted}>Carregando o edital…</p>;
  if (data === "error") {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        Não foi possível carregar o edital. Recarregue a página para tentar de novo.
      </p>
    );
  }
  if (data === "missing") {
    return (
      <div className={`${card} text-center`}>
        <p className="font-semibold">Edital não encontrado.</p>
        <Link href="/novo" className={`mt-4 ${btnPrimary}`}>
          Ler um edital
        </Link>
      </div>
    );
  }

  const { plan, edital, cards } = data;
  const now = new Date();
  const steps = [...plan.steps].sort((a, b) => a.position - b.position);
  const byStep = memoryBy(cards, steps.map((s) => s.id), (c) => c.step_id ?? "", now);
  const running = Object.values(status).some((s) => s === "waiting" || s === "working");
  const missing = edital.disciplines
    .map((_, i) => i)
    .filter((i) => !edital.generated.includes(i) || typeof status[i] === "object");
  const generatedCount = edital.disciplines.length - missing.length;
  const totalTopics = edital.disciplines.reduce((n, d) => n + d.topics.length, 0);
  const coveredTopics = edital.disciplines.reduce((n, d, i) => {
    const own = cards.filter((c) => c.step_id === steps[i]?.id && c.state !== 0);
    return n + d.topics.filter((t) => own.some((c) => c.topic === t)).length;
  }, 0);

  return (
    <>
      <div>
        <p className="text-xs font-medium tracking-wide text-indigo-700 uppercase dark:text-indigo-400">Edital verticalizado</p>
        <h1 className="mt-1 text-2xl font-semibold">{edital.title}</h1>
        <p className={muted}>
          {edital.banca ? `Banca ${edital.banca} · ` : ""}
          {edital.disciplines.length} disciplinas · {coveredTopics} de {totalTopics} tópicos já estudados
          {plan.examDate ? ` · prova em ${shortDate(plan.examDate)}` : ""}
        </p>
      </div>

      {(running || missing.length > 0) && (
        <section className={card} aria-live="polite">
          <h2 className="font-semibold">
            {running
              ? `Gerando os cartões: ${generatedCount} de ${edital.disciplines.length} disciplinas prontas`
              : `${missing.length} ${missing.length === 1 ? "disciplina ainda sem" : "disciplinas ainda sem"} cartões`}
          </h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {edital.disciplines.map((d, i) => {
              const s = status[i] ?? (edital.generated.includes(i) ? "done" : "waiting");
              return (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  <span>{d.name}</span>
                  <span className={typeof s === "object" ? "text-red-700 dark:text-red-400" : muted}>
                    {s === "done" ? "✓ pronto" : s === "working" ? "gerando…" : s === "waiting" ? "na fila" : s.error}
                  </span>
                </li>
              );
            })}
          </ul>
          {!running && (
            <button type="button" className={`mt-4 ${btnPrimary}`} onClick={() => generate(edital, missing)}>
              Gerar os cartões que faltam
            </button>
          )}
          {running && <p className={`mt-3 ${muted}`}>Pode continuar navegando no site; se sair, volte aqui para terminar.</p>}
        </section>
      )}

      {cards.length > 0 && (
        <Thermometer
          variant="hero"
          topic={edital.title}
          examDate={plan.examDate}
          steps={steps}
          cards={cards}
          newPerDay={data.newPerDay}
          retention={data.retention}
        />
      )}

      {cards.length > 0 && (
        <ApprovalChance
          plan={plan}
          cards={cards}
          banca={edital.banca}
          weights={new Map(edital.disciplines.flatMap((d, i) => (steps[i] ? [[steps[i].id, d.weight] as const] : [])))}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/revisar?plano=${plan.id}`} className={btnPrimary}>
          Revisar este edital
        </Link>
        <Link href="/quiz" className={btnSecondary}>
          Fazer um simulado
        </Link>
      </div>

      <ol className="flex flex-col gap-4">
        {edital.disciplines.map((d, i) => {
          const step = steps[i];
          const own = step ? cards.filter((c) => c.step_id === step.id) : [];
          const memory = step ? byStep.get(step.id) : undefined;
          const byTopic = memoryBy(own, d.topics, (c) => c.topic ?? "", now);
          const others = own.filter((c) => !d.topics.includes(c.topic ?? ""));
          return (
            <li key={i} className={card}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{d.name}</h2>
                <span className={`text-sm ${muted}`}>Peso {d.weight} de 5</span>
              </div>
              {memory && memory.total > 0 && (
                <div className="mt-3">
                  <MemoryBar label="Disciplina" memory={memory} />
                </div>
              )}
              <ul className="mt-4 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                {d.topics.map((topic) => {
                  const m = byTopic.get(topic) ?? memoryOf([], now);
                  return (
                    <li key={topic} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <span className="min-w-0 flex-1">
                        <span aria-hidden className="mr-2">
                          {m.total === 0 ? "○" : m.studied === m.total ? "●" : "◐"}
                        </span>
                        {topic}
                      </span>
                      <span className="text-zinc-500 tabular-nums">
                        {m.total === 0 ? (
                          "sem cartões"
                        ) : (
                          <>
                            {m.studied}/{m.total} estudados ·{" "}
                            <strong className={TOPIC_TONE[memoryTone(m.memory)]}>{percent(m.memory)}</strong>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
                {others.length > 0 && (
                  <li className="flex justify-between gap-2 py-2 text-zinc-500">
                    <span>Outros cartões da disciplina</span>
                    <span>{others.length}</span>
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ol>
    </>
  );
}
