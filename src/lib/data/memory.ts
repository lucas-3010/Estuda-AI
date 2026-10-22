import { createBrowserSupabase } from "@/lib/supabase/client";
import type { MemoryCard } from "@/lib/srs/thermometer";

const PAGE = 1000;
const PACE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const MEMORY_COLUMNS =
  "id, step_id, topic, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review";

/** Lê todas as páginas de uma consulta (o Supabase devolve no máximo 1000 linhas por vez). */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Estado de memória de todos os cartões da pessoa. */
export async function listMemoryCards(): Promise<MemoryCard[]> {
  const supabase = createBrowserSupabase();
  return readAll<MemoryCard>((from, to) =>
    supabase.from("cards").select(MEMORY_COLUMNS).order("id").range(from, to),
  );
}

/**
 * Ids dos cartões estudados pela primeira vez nos últimos 14 dias. O log guarda o estado
 * de antes da revisão, então estado 0 é a primeira vez que o cartão foi visto.
 */
export async function recentlyStartedCards(now = new Date()): Promise<{ ids: Set<string>; days: number }> {
  const supabase = createBrowserSupabase();
  const since = new Date(now.getTime() - PACE_DAYS * DAY_MS).toISOString();
  const rows = await readAll<{ card_id: string }>((from, to) =>
    supabase
      .from("review_logs")
      .select("card_id")
      .eq("state", 0)
      .gte("reviewed_at", since)
      .order("reviewed_at")
      .range(from, to),
  );
  return { ids: new Set(rows.map((r) => r.card_id)), days: PACE_DAYS };
}

/** Cartões novos estudados por dia, em média, entre os cartões dados. */
export function paceOf(cards: MemoryCard[], started: { ids: Set<string>; days: number }): number {
  return cards.filter((c) => started.ids.has(c.id)).length / started.days;
}
