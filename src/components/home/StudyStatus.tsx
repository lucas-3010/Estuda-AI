"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccount, type Account } from "@/lib/data/account";
import { getSettings, userTimeZone } from "@/lib/data/settings";
import { getStreak, type Streak } from "@/lib/data/streak";
import { card, muted } from "@/components/ui/styles";

type State = { streak: Streak; goal: number; account: Account };

/** Sequência de dias, meta diária de revisões e gerações de IA restantes. */
export function StudyStatus() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    Promise.all([getStreak(userTimeZone()), getSettings(), getAccount()])
      .then(([streak, settings, account]) => setState({ streak, goal: settings.dailyGoal, account }))
      .catch(() => setState(null));
  }, []);

  if (!state) return null;
  const { streak, goal, account } = state;
  const progress = Math.min(1, streak.reviewsToday / goal);
  const done = streak.reviewsToday >= goal;

  return (
    <section aria-label="Seu progresso" className="grid gap-3 sm:grid-cols-3">
      <div className={card}>
        <p className={muted}>Sequência</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          <span aria-hidden>🔥 </span>
          {streak.current} {streak.current === 1 ? "dia" : "dias"}
        </p>
        <p className={`mt-1 ${muted}`}>Recorde: {streak.best}</p>
      </div>
      <div className={card}>
        <p className={muted}>Meta de hoje</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {Math.min(streak.reviewsToday, goal)}/{goal}
        </p>
        <div
          role="progressbar"
          aria-label="Meta diária de revisões"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(streak.reviewsToday, goal)}
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <div
            className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-indigo-600"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className={`mt-1 ${muted}`}>{done ? "Meta batida! 🎉" : "revisões"}</p>
      </div>
      <div className={card}>
        <p className={muted}>Gerações com IA no mês</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {account.remaining}
          <span className="text-base font-normal text-zinc-500"> de {account.plan.generations}</span>
        </p>
        <p className={`mt-1 ${muted}`}>
          Plano {account.plan.name}
          {account.plan.id !== "max" && (
            <>
              {" · "}
              <Link href="/precos" className="font-medium text-indigo-700 underline dark:text-indigo-400">
                ver planos
              </Link>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
