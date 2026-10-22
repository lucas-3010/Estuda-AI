"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { loadToday } from "@/lib/data/today";
import { userTimeZone } from "@/lib/data/settings";
import { daysBetween, todayIn } from "@/lib/exam";
import type { CardRow } from "@/lib/supabase/database.types";
import { muted } from "@/components/ui/styles";
import { ReviewSession } from "./ReviewSession";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; queue: CardRow[]; retention: number; vespera: string | null };

export function ReviewLoader() {
  const params = useSearchParams();
  const planId = params.get("plano") ?? undefined;
  // A agenda do dia abre a revisão de uma etapa com o número de cartões que cabe no bloco.
  const stepId = params.get("etapa");
  const limit = Number(params.get("limite")) || null;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    loadToday(planId)
      .then(({ queue, settings, vespera }) => {
        const today = todayIn(userTimeZone());
        const soonest = [...vespera].sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
        const days = soonest ? daysBetween(today, soonest.examDate!) : 0;
        const filtered = stepId ? queue.filter((c) => c.step_id === stepId) : queue;
        setState({
          status: "ready",
          retention: settings.desiredRetention,
          queue: limit ? filtered.slice(0, limit) : filtered,
          vespera: soonest
            ? `${soonest.topic}: ${days === 0 ? "a prova é hoje" : days === 1 ? "a prova é amanhã" : `faltam ${days} dias`}`
            : null,
        });
      })
      .catch(() => setState({ status: "error" }));
  }, [planId, stepId, limit]);

  if (state.status === "loading") return <p className={muted}>Montando sua fila…</p>;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        Não foi possível carregar seus cartões. Recarregue a página para tentar de novo.
      </p>
    );
  }
  return (
    <>
      {state.vespera && <VesperaNotice text={state.vespera} />}
      <ReviewSession queue={state.queue} retention={state.retention} />
    </>
  );
}

/** Aviso do modo véspera: sem cartões novos, os mais fracos primeiro. */
export function VesperaNotice({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-100">
      <strong>🔥 Modo véspera · {text}.</strong> Sem cartões novos até a prova: primeiro vêm os cartões que você tem
      mais chance de esquecer, nas disciplinas que valem mais.
    </p>
  );
}
