"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDueCandidates } from "@/lib/data/cards";
import { listPlansWithProgress, type PlanWithProgress } from "@/lib/data/plans";
import { newCardsStudiedToday } from "@/lib/data/reviews";
import { getSettings, updateSettings, userTimeZone, type Settings } from "@/lib/data/settings";
import { buildQueue } from "@/lib/srs/queue";
import { btnPrimary, card, muted } from "@/components/ui/styles";
import { PlanList } from "./PlanList";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; plans: PlanWithProgress[]; dueToday: number; settings: Settings };

export function HomeDashboard() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const timeZone = userTimeZone();
    Promise.all([listPlansWithProgress(), listDueCandidates(), getSettings(), newCardsStudiedToday(timeZone)])
      .then(([plans, candidates, settings, studied]) => {
        const queue = buildQueue(candidates, {
          now: new Date(),
          timeZone,
          newPerDay: settings.newCardsPerDay,
          newStudiedToday: studied,
        });
        setState({ status: "ready", plans, dueToday: queue.length, settings });
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

  return (
    <div className="flex flex-col gap-6">
      <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
        {state.dueToday > 0 ? (
          <>
            <div>
              <p className="text-4xl font-semibold tabular-nums">{state.dueToday}</p>
              <p className={muted}>cartões para hoje</p>
            </div>
            <Link href="/revisar" className={btnPrimary}>
              Revisar agora
            </Link>
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
