"use client";

import { useEffect, useMemo, useState } from "react";
import { createCard, deleteCard, listCards, updateCard } from "@/lib/data/cards";
import { listPlansWithProgress, type PlanWithProgress } from "@/lib/data/plans";
import type { CardRow } from "@/lib/supabase/database.types";
import { Markdown } from "@/components/Markdown";
import { btnDanger, btnPrimary, btnSecondary, card, input, muted } from "@/components/ui/styles";
import { CardEditor } from "./CardEditor";

const STATE_LABEL = ["Novo", "Aprendendo", "Revisão", "Reaprendendo"];

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function CardsManager() {
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [plans, setPlans] = useState<PlanWithProgress[]>([]);
  const [planId, setPlanId] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    listPlansWithProgress().then(setPlans).catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    listCards({ planId: planId || undefined })
      .then((rows) => {
        setCards(rows);
        setError(false);
      })
      .catch(() => setError(true));
  }, [planId]);

  const stepTitle = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => p.steps.forEach((s) => map.set(s.id, `${p.topic} · ${s.title}`)));
    return map;
  }, [plans]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    if (!cards || !q) return cards ?? [];
    return cards.filter((c) => normalize(`${c.front}\n${c.back}`).includes(q));
  }, [cards, query]);

  async function remove(id: string) {
    try {
      await deleteCard(id);
      setCards((cs) => cs?.filter((c) => c.id !== id) ?? null);
    } catch {
      setError(true);
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          role="searchbox"
          aria-label="Buscar cartões"
          placeholder="Buscar na frente ou no verso"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={input}
        />
        <select
          aria-label="Filtrar por plano"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className={`${input} sm:w-56`}
        >
          <option value="">Todos os planos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.topic}
            </option>
          ))}
        </select>
        <button type="button" className={`${btnPrimary} shrink-0`} onClick={() => setCreating(true)}>
          Novo cartão
        </button>
      </div>

      {creating && (
        <div className={card}>
          <CardEditor
            ariaLabel="Novo cartão"
            initial={{ front: "", back: "" }}
            onCancel={() => setCreating(false)}
            onSave={async (value) => {
              const created = await createCard({ ...value, stepId: null });
              setCards((cs) => [created, ...(cs ?? [])]);
              setCreating(false);
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Algo deu errado ao falar com o servidor. Tente de novo.
        </p>
      )}

      {cards === null && !error && <p className={muted}>Carregando…</p>}
      {cards && visible.length === 0 && (
        <p className={muted}>{query ? "Nenhum cartão encontrado." : "Você ainda não tem cartões."}</p>
      )}
      {cards && visible.length > 0 && (
        <p className={muted}>
          {visible.length} {visible.length === 1 ? "cartão" : "cartões"}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {visible.map((c) => (
          <li key={c.id} className={card}>
            {editing === c.id ? (
              <CardEditor
                initial={{ front: c.front, back: c.back }}
                onCancel={() => setEditing(null)}
                onSave={async (value) => {
                  await updateCard(c.id, value);
                  setCards((cs) => cs?.map((x) => (x.id === c.id ? { ...x, ...value } : x)) ?? null);
                  setEditing(null);
                }}
              />
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{STATE_LABEL[c.state]}</span>
                  {c.step_id && stepTitle.get(c.step_id) && <span>{stepTitle.get(c.step_id)}</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Markdown source={c.front} />
                  <Markdown source={c.back} className="text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {confirming === c.id ? (
                    <>
                      <span className="self-center text-sm">Apagar este cartão e o histórico dele?</span>
                      <button type="button" className={btnDanger} onClick={() => remove(c.id)}>
                        Confirmar
                      </button>
                      <button type="button" className={btnSecondary} onClick={() => setConfirming(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={btnSecondary} onClick={() => setEditing(c.id)}>
                        Editar
                      </button>
                      <button type="button" className={btnDanger} onClick={() => setConfirming(c.id)}>
                        Apagar
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
