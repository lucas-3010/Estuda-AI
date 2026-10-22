"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { acknowledgeLawChange, listLawArticles, type LawArticleRow } from "@/lib/data/law";
import { muted } from "@/components/ui/styles";

/** Avisos de lei alterada num plano de lei seca e o que está sendo vigiado. */
export function LawAlerts({ planId }: { planId: string }) {
  const [rows, setRows] = useState<LawArticleRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listLawArticles(planId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [planId]);

  if (!rows || rows.length === 0) return null;
  const changed = rows.filter((r) => r.changed_at);
  const watched = rows.filter((r) => r.source_url);

  async function acknowledge(id: string) {
    setBusy(id);
    try {
      await acknowledgeLawChange(id);
      setRows((list) => list?.map((r) => (r.id === id ? { ...r, changed_at: null, snapshot: r.current_snapshot ?? r.snapshot, current_snapshot: null } : r)) ?? null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {changed.map((r) => (
        <div
          key={r.id}
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <p className="font-semibold">
            ⚠️ O art. {r.article} da {r.law_name} mudou desde que seus cartões foram criados.
          </p>
          <p className="mt-1">Confira a redação nova e ajuste os cartões desse artigo em Cartões.</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Comparar o texto</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase">Quando você criou os cartões</p>
                <p className="mt-1 whitespace-pre-line">{r.snapshot}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase">Texto atual na fonte</p>
                <p className="mt-1 whitespace-pre-line">{r.current_snapshot}</p>
              </div>
            </div>
          </details>
          <div className="mt-2 flex flex-wrap gap-4">
            <Link href={`/cartoes?plano=${planId}&q=${encodeURIComponent(`Art. ${r.article}`)}`} className="font-medium underline">
              Ver os cartões
            </Link>
            {r.source_url && (
              <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Abrir a lei
              </a>
            )}
            <button type="button" disabled={busy === r.id} className="font-medium underline disabled:opacity-50" onClick={() => acknowledge(r.id)}>
              Já revisei os cartões
            </button>
          </div>
        </div>
      ))}
      {changed.length === 0 && (
        <p className={`text-sm ${muted}`}>
          {watched.length > 0
            ? `⚖️ Vigiando ${watched.length} ${watched.length === 1 ? "artigo" : "artigos"} na fonte oficial. Avisamos aqui se a lei mudar.`
            : "⚖️ Lei colada como texto: para receber avisos quando ela mudar, crie o plano com o link do Planalto."}
        </p>
      )}
    </div>
  );
}
