"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordReview } from "@/lib/data/reviews";
import { previewIntervals, schedule, type Rating } from "@/lib/srs/fsrs";
import type { CardRow } from "@/lib/supabase/database.types";
import { Markdown } from "@/components/Markdown";
import { btnPrimary, btnSecondary, card, muted } from "@/components/ui/styles";

const RATINGS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: "Errei", className: "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950" },
  { rating: 2, label: "Difícil", className: "border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950" },
  { rating: 3, label: "Bom", className: "border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950" },
  { rating: 4, label: "Fácil", className: "border-sky-300 text-sky-800 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950" },
];

// Cartões que voltam em poucos minutos (erros, passos de aprendizagem) são
// revistos ainda nesta sessão.
const REQUEUE_WINDOW_MS = 20 * 60 * 1000;

export function ReviewSession({ queue: initialQueue, retention }: { queue: CardRow[]; retention: number }) {
  const [queue, setQueue] = useState(initialQueue);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const pending = useRef(false);

  const current = queue[0];
  const reviewed = tally[1] + tally[2] + tally[3] + tally[4];
  const intervals = useMemo(
    () => (current && revealed ? previewIntervals(current, new Date(), retention) : null),
    [current, revealed, retention],
  );

  const rate = useCallback(
    async (rating: Rating) => {
      if (!current || !revealed || pending.current) return;
      pending.current = true;
      setSaving(true);
      setError(false);
      const now = new Date();
      const next = schedule(current, rating, now, retention);
      try {
        await recordReview(current.id, rating, next);
        const updated: CardRow = { ...current, ...next };
        const again = Date.parse(next.due) - now.getTime() <= REQUEUE_WINDOW_MS;
        setQueue((q) => (again ? [...q.slice(1), updated] : q.slice(1)));
        setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
        setRevealed(false);
      } catch {
        setError(true);
      } finally {
        pending.current = false;
        setSaving(false);
      }
    },
    [current, revealed, retention],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key === " " || event.key === "Enter") {
        if (!revealed) {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void rate(Number(event.key) as Rating);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate, revealed]);

  if (initialQueue.length === 0) {
    return (
      <div className={`${card} text-center`}>
        <p className="text-lg font-semibold">Nada para revisar agora 🎉</p>
        <p className={`mt-1 ${muted}`}>Volte mais tarde ou crie um novo tema.</p>
        <Link href="/" className={`mt-4 ${btnSecondary}`}>
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (!current) {
    return (
      <div className={`${card} text-center`}>
        <h2 className="text-xl font-semibold">Sessão concluída</h2>
        <p className={`mt-1 ${muted}`}>
          {reviewed} {reviewed === 1 ? "cartão revisado" : "cartões revisados"}
        </p>
        <ul className="mt-4 flex justify-center gap-4 text-sm">
          {RATINGS.map((r) => (
            <li key={r.rating}>
              {r.label}: <strong className="tabular-nums">{tally[r.rating]}</strong>
            </li>
          ))}
        </ul>
        <Link href="/" className={`mt-6 ${btnPrimary}`}>
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={muted} aria-live="polite">
        {queue.length} {queue.length === 1 ? "cartão restante" : "cartões restantes"}
      </p>

      <article className={`${card} min-h-64`}>
        <Markdown source={current.front} className="text-lg" />
        {revealed && (
          <>
            <hr className="my-5 border-zinc-200 dark:border-zinc-800" />
            <Markdown source={current.back} />
          </>
        )}
      </article>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Não foi possível salvar a revisão. Tente avaliar de novo.
        </p>
      )}

      {!revealed ? (
        <button type="button" className={`${btnPrimary} py-3`} onClick={() => setRevealed(true)}>
          Mostrar resposta <span className="ml-2 text-xs opacity-75">(espaço)</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((r) => (
            <button
              key={r.rating}
              type="button"
              disabled={saving}
              onClick={() => rate(r.rating)}
              className={`flex flex-col items-center rounded-lg border px-3 py-2 font-medium disabled:opacity-50 ${r.className}`}
            >
              <span>{r.label}</span>
              <span className="text-xs font-normal opacity-75">
                {intervals?.[r.rating].label} · {r.rating}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
