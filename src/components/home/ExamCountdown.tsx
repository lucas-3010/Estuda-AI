"use client";

import { useState } from "react";
import { examPlan, shortDate, todayIn } from "@/lib/exam";
import { setExamDate } from "@/lib/data/plans";
import { userTimeZone } from "@/lib/data/settings";
import { input } from "@/components/ui/styles";

const MAX_NEW_PER_DAY = 500;

/** Data da prova do plano, dias que faltam e o ritmo de cartões novos para chegar lá. */
export function ExamCountdown({
  planId,
  initialDate,
  newCards,
  newCardsPerDay,
  onRaiseNewPerDay,
}: {
  planId: string;
  initialDate: string | null;
  newCards: number;
  newCardsPerDay: number;
  onRaiseNewPerDay: (value: number) => Promise<void>;
}) {
  const [date, setDate] = useState(initialDate);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayIn(userTimeZone());

  async function save(value: string | null) {
    setBusy(true);
    setError(null);
    try {
      await setExamDate(planId, value);
      setDate(value);
      setEditing(false);
    } catch {
      setError("Não foi possível salvar a data. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function raise(value: number) {
    setBusy(true);
    setError(null);
    try {
      await onRaiseNewPerDay(value);
    } catch {
      setError("Não foi possível ajustar a meta. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (!date || editing) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={`prova-${planId}`} className="font-medium">
          Data da prova
        </label>
        <input
          id={`prova-${planId}`}
          type="date"
          min={today}
          defaultValue={date ?? ""}
          disabled={busy}
          className={`${input} w-auto`}
          onChange={(e) => {
            if (e.target.value) void save(e.target.value);
          }}
        />
        {date && (
          <button type="button" className="text-zinc-500 hover:underline" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        )}
        {!date && <span className="text-zinc-500">Opcional: mostramos quantos dias faltam e o ritmo ideal.</span>}
        {error && (
          <p role="alert" className="w-full text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  const plan = examPlan(date, today, newCards);
  const needed = plan.kind === "ahead" ? Math.min(plan.newPerDay, MAX_NEW_PER_DAY) : 0;

  return (
    <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-indigo-900 dark:text-indigo-200">
          {plan.kind === "past" && `A prova foi em ${shortDate(date)}.`}
          {plan.kind === "today" && "A prova é hoje. Boa sorte! 🍀"}
          {plan.kind === "ahead" &&
            `${plan.days === 1 ? "Falta 1 dia" : `Faltam ${plan.days} dias`} para a prova (${shortDate(date)})`}
        </p>
        <span className="flex gap-3">
          <button type="button" className="text-indigo-700 hover:underline dark:text-indigo-400" onClick={() => setEditing(true)}>
            Mudar data
          </button>
          <button type="button" disabled={busy} className="text-zinc-500 hover:underline" onClick={() => save(null)}>
            Remover
          </button>
        </span>
      </div>
      {plan.kind === "ahead" && newCards > 0 && (
        <p className="mt-1">
          Para ver os {newCards} cartões novos até lá, estude {needed} {needed === 1 ? "novo" : "novos"} por dia.{" "}
          {needed > newCardsPerDay ? (
            <button
              type="button"
              disabled={busy}
              className="font-medium text-indigo-700 underline disabled:opacity-50 dark:text-indigo-400"
              onClick={() => raise(needed)}
            >
              Aumentar minha meta para {needed} por dia
            </button>
          ) : (
            <span className="text-zinc-600 dark:text-zinc-400">Sua meta de {newCardsPerDay} novos por dia já dá conta.</span>
          )}
        </p>
      )}
      {plan.kind === "ahead" && newCards === 0 && (
        <p className="mt-1">Você já viu todos os cartões. Continue com as revisões do dia até a prova.</p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
