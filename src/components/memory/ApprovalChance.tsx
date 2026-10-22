"use client";

import Link from "next/link";
import { useState } from "react";
import { AiError, aiErrorMessage } from "@/lib/ai/errors";
import { approvalChance, approvalSentence } from "@/lib/approval";
import { setCutoff, type PlanWithProgress } from "@/lib/data/plans";
import { callGenerate } from "@/lib/generateClient";
import type { MemoryCard } from "@/lib/srs/thermometer";
import type { CutoffResult } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, card, input, muted } from "@/components/ui/styles";

const VERDICT: Record<ReturnType<typeof approvalChance>["verdict"], { label: string; className: string }> = {
  above: { label: "Acima da nota de corte", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  close: { label: "Perto da nota de corte", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  below: { label: "Abaixo da nota de corte", className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
  unknown: { label: "Sem nota de corte", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

/**
 * Chance de aprovação: a nota que a pessoa faria hoje (memória de cada disciplina pesada pelo
 * edital) comparada com a nota de corte do último concurso, e a disciplina que mais rende.
 */
export function ApprovalChance({
  plan,
  cards,
  weights,
  banca,
  onCutoff,
}: {
  plan: PlanWithProgress;
  cards: MemoryCard[];
  weights: Map<string, number>;
  banca?: string | null;
  onCutoff?: (cutoff: number | null, note: string | null) => void;
}) {
  const [cutoff, setLocalCutoff] = useState(plan.cutoff);
  const [note, setNote] = useState(plan.cutoffNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan.cutoff === null ? "" : String(plan.cutoff));
  const [busy, setBusy] = useState<"save" | "ai" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = plan.steps.filter((s) => s.kind !== "mistakes");
  const approval = approvalChance(
    steps.map((s) => ({ name: s.title, weight: weights.get(s.id) ?? 1, cards: cards.filter((c) => c.step_id === s.id) })),
    cutoff,
    new Date(),
  );
  const verdict = VERDICT[approval.verdict];
  const top = [...approval.disciplines].sort((a, b) => b.room - a.room).filter((d) => d.room >= 0.5).slice(0, 3);

  async function save(value: number | null, source: string | null) {
    setBusy("save");
    setError(null);
    try {
      await setCutoff(plan.id, value, source);
      setLocalCutoff(value);
      setNote(source);
      setEditing(false);
      onCutoff?.(value, source);
    } catch {
      setError("Não foi possível salvar a nota de corte. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  async function estimate() {
    setBusy("ai");
    setError(null);
    try {
      const result = await callGenerate<CutoffResult>({ mode: "cutoff", exam: plan.topic, banca: banca || undefined });
      if (result.cutoff === null) {
        setError(result.note || "A IA não achou a nota de corte. Digite a do último concurso, se souber.");
        setBusy(null);
        return;
      }
      setDraft(String(Math.round(result.cutoff * 10) / 10));
      await save(Math.round(result.cutoff * 100) / 100, `Estimada pela IA: ${result.note}`.slice(0, 500));
    } catch (e) {
      setError(aiErrorMessage(e instanceof AiError ? e.code : "network"));
      setBusy(null);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(draft.replace(",", "."));
    if (!draft.trim()) return void save(null, null);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError("Use um número de 0 a 100: a porcentagem dos pontos da prova.");
      return;
    }
    void save(value, "Informada por você");
  }

  return (
    <section className={card} aria-labelledby={`aprovacao-${plan.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`aprovacao-${plan.id}`} className="font-semibold">
          🎯 Chance de aprovação
        </h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict.className}`}>{verdict.label}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p>
          <span className="text-4xl font-semibold tabular-nums">{Math.round(approval.score)}</span>
          <span className={`ml-1 ${muted}`}>de 100 pontos hoje</span>
        </p>
        {cutoff !== null && (
          <p>
            <span className="text-2xl font-semibold tabular-nums">{Math.round(cutoff)}</span>
            <span className={`ml-1 ${muted}`}>nota de corte</span>
          </p>
        )}
      </div>
      <div className="relative mt-3 h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden>
        <span
          className="block h-full rounded-full bg-indigo-600"
          style={{ width: `${Math.min(100, approval.score)}%` }}
        />
        {cutoff !== null && (
          <span className="absolute -top-1 h-5 w-0.5 bg-zinc-900 dark:bg-zinc-100" style={{ left: `${cutoff}%` }} />
        )}
      </div>
      <p className="mt-3">{approvalSentence(approval)}</p>

      {top.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Onde estão os pontos que faltam</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {top.map((d) => (
              <li key={d.name} className="flex justify-between gap-2">
                <span>{d.name}</span>
                <span className={`tabular-nums ${muted}`}>até +{Math.round(d.room)} pontos</span>
              </li>
            ))}
          </ul>
          <Link href={`/revisar?plano=${plan.id}`} className={`mt-3 ${btnSecondary}`}>
            Estudar agora
          </Link>
        </div>
      )}

      <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {cutoff !== null && !editing ? (
          <p className={muted}>
            {note ? `${note} ` : ""}
            <button type="button" className="font-medium text-indigo-700 underline dark:text-indigo-400" onClick={() => setEditing(true)}>
              Mudar a nota de corte
            </button>
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <label htmlFor={`corte-${plan.id}`} className="text-sm font-medium">
              Nota de corte do último concurso (de 0 a 100)
            </label>
            <p className={muted}>
              Em porcentagem dos pontos: 70 acertos em 100 questões = 70. Costuma sair no resultado final do concurso anterior.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                id={`corte-${plan.id}`}
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ex.: 70"
                className={`${input} max-w-28`}
              />
              <button type="submit" disabled={busy !== null} className={btnPrimary}>
                {busy === "save" ? "Salvando…" : "Salvar"}
              </button>
              <button type="button" disabled={busy !== null} className={btnSecondary} onClick={estimate}>
                {busy === "ai" ? "Pesquisando…" : "Estimar com IA"}
              </button>
            </div>
            <p className="text-xs text-zinc-500">A estimativa com IA pesquisa na internet e conta como uma geração.</p>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
