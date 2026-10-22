"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMemoryCards, paceOf, recentlyStartedCards } from "@/lib/data/memory";
import type { PlanWithProgress } from "@/lib/data/plans";
import { loadToday } from "@/lib/data/today";
import { daysBetween, todayIn } from "@/lib/exam";
import { updateSettings, userTimeZone, type Settings } from "@/lib/data/settings";
import type { MemoryCard } from "@/lib/srs/thermometer";
import { ApprovalChance } from "@/components/memory/ApprovalChance";
import { Thermometer } from "@/components/memory/Thermometer";
import { VesperaNotice } from "@/components/review/ReviewLoader";
import { EditalRadar } from "./EditalRadar";
import { btnPrimary, btnSecondary, card, muted } from "@/components/ui/styles";
import { PlanList } from "./PlanList";

type State =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      plans: PlanWithProgress[];
      dueToday: number;
      settings: Settings;
      memory: MemoryData | null;
      weights: Map<string, number>;
      vespera: PlanWithProgress[];
    };

/** Cartões de cada plano com o estado de memória e o ritmo de cartões novos por dia. */
export type MemoryData = Map<string, { cards: MemoryCard[]; newPerDay: number }>;

async function loadMemory(plans: PlanWithProgress[]): Promise<MemoryData> {
  const [cards, started] = await Promise.all([listMemoryCards(), recentlyStartedCards()]);
  const planOfStep = new Map(plans.flatMap((p) => p.steps.map((s) => [s.id, p.id] as const)));
  const byPlan = new Map<string, MemoryCard[]>(plans.map((p) => [p.id, []]));
  for (const card of cards) {
    const planId = card.step_id ? planOfStep.get(card.step_id) : undefined;
    if (planId) byPlan.get(planId)?.push(card);
  }
  return new Map([...byPlan].map(([id, list]) => [id, { cards: list, newPerDay: paceOf(list, started) }]));
}

/** O plano do termômetro principal: a prova mais próxima ou, sem datas, o mais estudado. */
export function heroPlan(plans: PlanWithProgress[], memory: MemoryData, today: string): PlanWithProgress | null {
  const studied = (p: PlanWithProgress) =>
    memory.get(p.id)?.cards.filter((c) => c.state !== 0).length ?? 0;
  const candidates = plans.filter((p) => p.kind !== "mistakes" && studied(p) > 0);
  const upcoming = candidates
    .filter((p) => p.examDate && p.examDate >= today)
    .sort((a, b) => a.examDate!.localeCompare(b.examDate!));
  return upcoming[0] ?? [...candidates].sort((a, b) => studied(b) - studied(a))[0] ?? null;
}

export function HomeDashboard() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    loadToday()
      .then(async ({ plans, queue, settings, weights, vespera }) => {
        // O termômetro é um extra: se falhar, o painel continua funcionando.
        const memory = await loadMemory(plans).catch(() => null);
        setState({ status: "ready", plans, dueToday: queue.length, settings, memory, weights, vespera });
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  if (state.status === "loading") return <p className={muted}>Carregando…</p>;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        Não foi possível carregar seus dados. Recarregue a página para tentar de novo.
      </p>
    );
  }

  if (state.plans.length === 0) {
    return (
      <div className={`${card} text-center`}>
        <h2 className="text-lg font-semibold">Comece pelo primeiro tema</h2>
        <p className={`mt-1 ${muted}`}>
          Escolha algo que quer aprender. A IA monta o plano e os cartões em poucos minutos.
        </p>
        <Link href="/novo" className={`mt-4 ${btnPrimary}`}>
          Criar meu primeiro plano
        </Link>
      </div>
    );
  }

  const today = todayIn(userTimeZone());
  const hero = state.memory ? heroPlan(state.plans, state.memory, today) : null;
  const heroMemory = hero ? state.memory?.get(hero.id) : undefined;
  const soonest = [...state.vespera].sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
  const vesperaDays = soonest ? daysBetween(today, soonest.examDate!) : 0;

  return (
    <div className="flex flex-col gap-6">
      <EditalRadar />
      {soonest && (
        <VesperaNotice
          text={`${soonest.topic}: ${vesperaDays === 0 ? "a prova é hoje" : vesperaDays === 1 ? "a prova é amanhã" : `faltam ${vesperaDays} dias`}`}
        />
      )}
      {hero && heroMemory && (
        <Thermometer
          variant="hero"
          topic={hero.topic}
          examDate={hero.examDate}
          steps={hero.steps}
          cards={heroMemory.cards}
          newPerDay={heroMemory.newPerDay}
          retention={state.settings.desiredRetention}
        />
      )}
      {hero && heroMemory && (hero.kind === "edital" || hero.examDate) && (
        <ApprovalChance key={hero.id} plan={hero} cards={heroMemory.cards} weights={state.weights} />
      )}
      <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        {state.dueToday > 0 ? (
          <>
            <div>
              <p className="text-4xl font-semibold tabular-nums">{state.dueToday}</p>
              <p className={muted}>cartões para hoje</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/agenda" className={btnSecondary}>
                Ver a agenda do dia
              </Link>
              <Link href="/revisar" className={btnPrimary}>
                Revisar agora
              </Link>
            </div>
          </>
        ) : (
          <div>
            <p className="text-lg font-semibold">Nada para revisar hoje 🎉</p>
            <p className={muted}>Volte amanhã ou crie um novo tema.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Seus planos</h2>
        <PlanList
          plans={state.plans}
          memory={state.memory}
          retention={state.settings.desiredRetention}
          newCardsPerDay={state.settings.newCardsPerDay}
          onRaiseNewPerDay={async (value) => {
            const settings = { ...state.settings, newCardsPerDay: value };
            await updateSettings(settings);
            setState({ ...state, settings });
          }}
        />
      </section>
    </div>
  );
}
