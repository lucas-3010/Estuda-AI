import { newCardState } from "@/lib/data/plans";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { CardRow } from "@/lib/supabase/database.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cartões que podem entrar na fila de hoje: novos ou com vencimento até amanhã.
 * O corte exato pelo fim do dia local é feito por `buildQueue`.
 */
export async function listDueCandidates(planId?: string, now = new Date()): Promise<CardRow[]> {
  const horizon = new Date(now.getTime() + DAY_MS).toISOString();
  const supabase = createBrowserSupabase();
  const base = planId
    ? supabase.from("cards").select("*, plan_steps!inner(plan_id)").eq("plan_steps.plan_id", planId)
    : supabase.from("cards").select("*");
  const { data, error } = await base.or(`state.eq.0,due.lte.${horizon}`).order("due");
  if (error) throw error;
  return (data ?? []).map(stripJoin);
}

export type CardFilters = { q?: string; planId?: string; stepId?: string };

export async function listCards(filters: CardFilters = {}): Promise<CardRow[]> {
  const supabase = createBrowserSupabase();
  let query = filters.planId
    ? supabase.from("cards").select("*, plan_steps!inner(plan_id)").eq("plan_steps.plan_id", filters.planId)
    : supabase.from("cards").select("*");
  if (filters.stepId) query = query.eq("step_id", filters.stepId);

  // Remove caracteres com significado na sintaxe de filtros do PostgREST.
  const q = filters.q?.replace(/[,()%*\\]/g, " ").trim();
  if (q) query = query.or(`front.ilike.%${q}%,back.ilike.%${q}%`);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map(stripJoin);
}

export async function createCard(input: { front: string; back: string; stepId?: string | null }): Promise<CardRow> {
  const { data, error } = await createBrowserSupabase()
    .from("cards")
    .insert({ ...newCardState(), front: input.front, back: input.back, step_id: input.stepId ?? null })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Cartão não criado");
  return data;
}

export async function updateCard(id: string, input: { front: string; back: string }): Promise<void> {
  const { error } = await createBrowserSupabase()
    .from("cards")
    .update({ front: input.front, back: input.back })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await createBrowserSupabase().from("cards").delete().eq("id", id);
  if (error) throw error;
}

function stripJoin<T extends CardRow & { plan_steps?: unknown }>(row: T): CardRow {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { plan_steps, ...card } = row;
  return card;
}
