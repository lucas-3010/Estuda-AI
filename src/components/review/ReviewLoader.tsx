"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listDueCandidates } from "@/lib/data/cards";
import { newCardsStudiedToday } from "@/lib/data/reviews";
import { getSettings, userTimeZone } from "@/lib/data/settings";
import { buildQueue } from "@/lib/srs/queue";
import type { CardRow } from "@/lib/supabase/database.types";
import { muted } from "@/components/ui/styles";
import { ReviewSession } from "./ReviewSession";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; queue: CardRow[]; retention: number };

export function ReviewLoader() {
  const planId = useSearchParams().get("plano") ?? undefined;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const timeZone = userTimeZone();
    Promise.all([listDueCandidates(planId), getSettings(), newCardsStudiedToday(timeZone)])
      .then(([candidates, settings, studied]) =>
        setState({
          status: "ready",
          retention: settings.desiredRetention,
          queue: buildQueue(candidates, {
            now: new Date(),
            timeZone,
            newPerDay: settings.newCardsPerDay,
            newStudiedToday: studied,
          }),
        }),
      )
      .catch(() => setState({ status: "error" }));
  }, [planId]);

  if (state.status === "loading") return <p className={muted}>Montando sua fila…</p>;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        Não foi possível carregar seus cartões. Recarregue a página para tentar de novo.
      </p>
    );
  }
  return <ReviewSession queue={state.queue} retention={state.retention} />;
}
