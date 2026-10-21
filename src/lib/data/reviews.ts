import type { NextState, Rating } from "@/lib/srs/fsrs";
import { createBrowserSupabase } from "@/lib/supabase/client";

export async function recordReview(cardId: string, rating: Rating, next: NextState): Promise<void> {
  const { error } = await createBrowserSupabase().rpc("record_review", {
    p_card_id: cardId,
    p_rating: rating,
    p_next: next,
  });
  if (error) throw error;
}

export async function newCardsStudiedToday(timeZone: string): Promise<number> {
  const { data, error } = await createBrowserSupabase().rpc("new_cards_studied_today", { p_tz: timeZone });
  if (error) throw error;
  return data ?? 0;
}

export type DayStat = { day: string; reviews: number; correct: number };

export async function reviewStats(days: number, timeZone: string): Promise<DayStat[]> {
  const { data, error } = await createBrowserSupabase().rpc("review_stats", { p_days: days, p_tz: timeZone });
  if (error) throw error;
  return data ?? [];
}

export type ForecastDay = { day: string; dueCount: number };

export async function dueForecast(days: number, timeZone: string): Promise<ForecastDay[]> {
  const { data, error } = await createBrowserSupabase().rpc("due_forecast", { p_days: days, p_tz: timeZone });
  if (error) throw error;
  return (data ?? []).map((d) => ({ day: d.day, dueCount: d.due_count }));
}
