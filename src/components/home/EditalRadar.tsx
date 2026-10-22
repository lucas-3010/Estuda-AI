"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addWatch, dismissWatch, listWatches, RADAR_LIMIT, removeWatch, type Watch } from "@/lib/data/radar";
import { btnPrimary, btnSecondary, card, input, muted } from "@/components/ui/styles";

/** Link para ler o edital encontrado e montar o plano. */
export function editalPlanHref(url: string | null): string {
  return url ? `/novo?edital=${encodeURIComponent(url)}` : "/novo?edital=";
}

/**
 * Radar de editais: a pessoa diz o cargo ou órgão que quer, o site procura o edital todo dia
 * e avisa aqui (e por e-mail) quando ele sai, com um atalho para montar o plano.
 */
export function EditalRadar() {
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    listWatches()
      .then(setWatches)
      .catch(() => setWatches([]));
  useEffect(() => {
    void refresh();
  }, []);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      await addWatch(query);
      setQuery("");
      await refresh();
    } catch (e) {
      setError(
        (e as { message?: string })?.message === "watch_limit"
          ? `Você já acompanha ${RADAR_LIMIT} concursos. Tire um para incluir outro.`
          : "Não foi possível incluir. Tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function act(action: () => Promise<void>) {
    try {
      await action();
    } finally {
      await refresh();
    }
  }

  if (watches === null) return null;
  const alerts = watches.filter((w) => w.found && !w.seen);

  return (
    <>
      {alerts.map((w) => (
        <section
          key={w.id}
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40"
        >
          <p className="text-xs font-medium tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
            📡 Radar de editais · {w.query}
          </p>
          <h2 className="mt-1 text-lg font-semibold">Saiu o edital: {w.found!.title}</h2>
          <p className={`mt-1 ${muted}`}>
            Monte o plano agora: a IA lê o edital, separa as disciplinas por peso e cria os cartões até a data da prova.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={editalPlanHref(w.found!.url)} className={btnPrimary}>
              Montar o plano do edital
            </Link>
            {w.found!.url && (
              <a href={w.found!.url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                Abrir o edital
              </a>
            )}
            <button type="button" className={btnSecondary} onClick={() => act(() => dismissWatch(w.id))}>
              Dispensar
            </button>
          </div>
        </section>
      ))}

      <details className={card}>
        <summary className="cursor-pointer font-semibold">
          📡 Radar de editais{" "}
          <span className={`font-normal ${muted}`}>
            {watches.length === 0 ? "· avise-me quando sair o edital" : `· acompanhando ${watches.length}`}
          </span>
        </summary>
        <p className={`mt-2 ${muted}`}>
          Diga o cargo ou o órgão que você quer. Todo dia o site procura o edital de abertura e avisa aqui e por e-mail
          quando ele sair.
        </p>
        {watches.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {watches.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <strong>{w.query}</strong>
                  <span className={`ml-2 ${muted}`}>
                    {w.found ? "✓ edital encontrado" : w.checkedAt ? "nenhum edital ainda" : "primeira busca hoje"}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-sm text-red-700 underline dark:text-red-400"
                  onClick={() => act(() => removeWatch(w.id))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        {watches.length < RADAR_LIMIT && (
          <form onSubmit={add} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="radar" className="sr-only">
              Cargo ou órgão
            </label>
            <input
              id="radar"
              value={query}
              maxLength={120}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: Analista Judiciário TJ-RJ, Polícia Federal"
              className={input}
            />
            <button type="submit" disabled={busy || query.trim().length < 3} className={btnPrimary}>
              {busy ? "Incluindo…" : "Acompanhar"}
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </details>
    </>
  );
}
