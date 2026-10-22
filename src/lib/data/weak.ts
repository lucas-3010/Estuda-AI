import { createCard } from "@/lib/data/cards";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { GeneratedCard, Level } from "@/lib/validation/plan";

export type WeakStep = {
  stepId: string;
  planId: string;
  topic: string;
  level: Level;
  title: string;
  goal: string;
  reviews: number;
  misses: number;
};

/** Etapas com mais erros nos últimos `days` dias, da pior para a melhor. */
export async function weakSteps(days = 30): Promise<WeakStep[]> {
  const { data, error } = await createBrowserSupabase().rpc("weak_steps", { p_days: days });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    stepId: row.step_id,
    planId: row.plan_id,
    topic: row.topic,
    level: row.level as Level,
    title: row.title,
    goal: row.goal,
    reviews: row.reviews,
    misses: row.misses,
  }));
}

/** Cartões da etapa marcados como "Errei" recentemente, sem repetir. */
export async function missedCards(stepId: string, limit = 15): Promise<GeneratedCard[]> {
  const { data, error } = await createBrowserSupabase()
    .from("review_logs")
    .select("card_id, cards!inner(front, back, step_id)")
    .eq("rating", 1)
    .eq("cards.step_id", stepId)
    .order("reviewed_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const seen = new Set<string>();
  const cards: GeneratedCard[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.card_id) || !row.cards) continue;
    seen.add(row.card_id);
    cards.push({ front: row.cards.front, back: row.cards.back });
    if (cards.length >= limit) break;
  }
  return cards;
}

/** Salva os cartões de reforço na mesma etapa, como novos. */
export async function addReinforcement(stepId: string, cards: GeneratedCard[]): Promise<number> {
  for (const card of cards) await createCard({ front: card.front, back: card.back, stepId });
  return cards.length;
}
