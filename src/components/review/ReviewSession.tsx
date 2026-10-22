"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CheckResult } from "@/lib/ai/checkAnswer";
import { CheckError, formatDuration, requestCheck, suggestedRating } from "@/lib/checkAnswerClient";
import { recordReview } from "@/lib/data/reviews";
import { previewIntervals, schedule, type Rating } from "@/lib/srs/fsrs";
import type { CardRow } from "@/lib/supabase/database.types";
import { Markdown } from "@/components/Markdown";
import { TutorChat } from "./TutorChat";
import { btnPrimary, btnSecondary, card, input, label, muted } from "@/components/ui/styles";

const RATINGS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: "Errei", className: "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950" },
  { rating: 2, label: "Difícil", className: "border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950" },
  { rating: 3, label: "Bom", className: "border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950" },
  { rating: 4, label: "Fácil", className: "border-sky-300 text-sky-800 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950" },
];

// Cartões que voltam em poucos minutos (erros, passos de aprendizagem) são
// revistos ainda nesta sessão.
const REQUEUE_WINDOW_MS = 20 * 60 * 1000;

type Checked = CheckResult & { ms: number };

export function ReviewSession({ queue: initialQueue, retention }: { queue: CardRow[]; retention: number }) {
  const [queue, setQueue] = useState(initialQueue);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  // "Não sei": a resposta aparece, mas o cartão conta como erro.
  const [gaveUp, setGaveUp] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
  // Momento em que o cartão atual apareceu, para medir o tempo da resposta.
  const shownAt = useRef(0);

  const current = queue[0];
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  const reviewed = tally[1] + tally[2] + tally[3] + tally[4];
  const intervals = useMemo(
    () => (current && revealed ? previewIntervals(current, new Date(), retention) : null),
    [current, revealed, retention],
  );

  const rate = useCallback(
    async (rating: Rating) => {
      if (!current || !revealed || pending.current) return;
      if (gaveUp && rating !== 1) return;
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
        setAnswer("");
        setChecked(null);
        setCheckError(null);
        setGaveUp(false);
        shownAt.current = performance.now();
      } catch {
        setError(true);
      } finally {
        pending.current = false;
        setSaving(false);
      }
    },
    [current, revealed, retention, gaveUp],
  );

  async function submitAnswer(event?: React.FormEvent) {
    event?.preventDefault();
    const text = answer.trim();
    if (!current || revealed || checking || !text) return;
    const ms = performance.now() - shownAt.current;
    setChecking(true);
    setCheckError(null);
    try {
      const result = await requestCheck(current.id, text);
      setChecked({ ...result, ms });
    } catch (e) {
      setCheckError(e instanceof CheckError ? e.message : "Não foi possível corrigir agora. Compare sua resposta com o verso e avalie.");
    } finally {
      setChecking(false);
      setRevealed(true);
    }
  }

  function giveUp() {
    if (checking) return;
    setGaveUp(true);
    setRevealed(true);
  }

  const suggested = gaveUp ? 1 : checked ? suggestedRating(checked.correct, checked.ms) : null;

  // O campo de resposta recebe o foco a cada cartão novo.
  useEffect(() => {
    if (!revealed) answerRef.current?.focus();
  }, [revealed, queue]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      // Não há atalho para ver o verso: a resposta só aparece depois de uma tentativa ou do "Não sei".
      if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
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

      <article className={`${card} min-h-48`}>
        <Markdown source={current.front} className="text-lg" />
        {revealed && (
          <>
            <hr className="my-5 border-zinc-200 dark:border-zinc-800" />
            <p className={`mb-1 ${muted}`}>Resposta esperada</p>
            <Markdown source={current.back} />
          </>
        )}
      </article>

      {!revealed && (
        <form onSubmit={submitAnswer} className="flex flex-col gap-2">
          <label htmlFor="resposta" className={label}>
            Sua resposta
          </label>
          <textarea
            ref={answerRef}
            id="resposta"
            rows={3}
            value={answer}
            maxLength={2000}
            disabled={checking}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitAnswer();
              }
            }}
            placeholder="Escreva com suas palavras e aperte Enter"
            className={input}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={checking || !answer.trim()} className={`${btnPrimary} py-3 sm:flex-1`}>
              {checking ? "Corrigindo…" : "Responder"}
            </button>
            <button type="button" disabled={checking} className={`${btnSecondary} py-3`} onClick={giveUp}>
              Não sei <span className="ml-1 text-xs opacity-75">(conta como erro)</span>
            </button>
          </div>
        </form>
      )}

      {revealed && checked && (
        <section
          aria-live="polite"
          className={`rounded-xl border p-5 ${
            checked.correct
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
              : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
          }`}
        >
          <h2 className={`font-sans text-lg font-semibold ${checked.correct ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
            {checked.correct ? `✓ Você acertou em ${formatDuration(checked.ms)}!` : "✗ Resposta incorreta"}
          </h2>
          <p className={`mt-1 ${muted}`}>Sua resposta: {answer.trim()}</p>
          {checked.feedback && (
            <div className="mt-3">
              {!checked.correct && <h3 className="text-sm font-semibold">Por que está errada</h3>}
              <Markdown source={checked.feedback} />
            </div>
          )}
          {checked.howTo && (
            <div className="mt-3">
              <h3 className="text-sm font-semibold">Como chegar na resposta certa</h3>
              <Markdown source={checked.howTo} />
            </div>
          )}
        </section>
      )}

      {revealed && gaveUp && (
        <p role="status" className="rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
          Sem problema. Leia a resposta com atenção: este cartão volta daqui a pouco para você tentar de novo.
        </p>
      )}

      {revealed && checkError && (
        <p role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {checkError}
        </p>
      )}

      {revealed && <TutorChat key={current.id} cardId={current.id} />}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Não foi possível salvar a revisão. Tente avaliar de novo.
        </p>
      )}

      {revealed && gaveUp && (
        <button type="button" disabled={saving} onClick={() => rate(1)} className={`${btnPrimary} w-full py-3`}>
          Continuar
        </button>
      )}

      {revealed && !gaveUp && (
        <div>
          <p className={`mb-2 ${muted}`}>
            {suggested ? "Como foi? A nota sugerida está destacada." : "Como foi? Avalie para agendar a próxima revisão."}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((r) => (
              <button
                key={r.rating}
                type="button"
                disabled={saving}
                onClick={() => rate(r.rating)}
                className={`flex flex-col items-center rounded-lg border px-3 py-2 font-medium disabled:opacity-50 ${r.className} ${
                  suggested === r.rating ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--background)]" : ""
                }`}
              >
                <span>{r.label}</span>
                <span className="text-xs font-normal opacity-75">
                  {intervals?.[r.rating].label} · {r.rating}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
