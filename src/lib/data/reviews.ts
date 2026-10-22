import type { NextState, Rating } from "@/lib/srs/fsrs";
import { createBrowserSupabase } from "@/lib/supabase/client";

/** `confident`: a pessoa marcou "Tenho certeza" (true) ou "Estou chutando" (false) antes da resposta. */
export async function recordReview(
  cardId: string,
  rating: Rating,
  next: NextState,
  confident: boolean | null = null,
): Promise<void> {
  const { error } = await createBrowserSupabase().rpc("record_review", {
    p_card_id: cardId,
    p_rating: rating,
    p_next: next,
    p_confident: confident,
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

export type Calibration = { sureTotal: number; sureCorrect: number; guessTotal: number; guessCorrect: number };

/** Acertos quando a pessoa disse que tinha certeza e quando disse que estava chutando. */
export async function confidenceStats(days: number): Promise<Calibration> {
  const { data, error } = await createBrowserSupabase().rpc("confidence_stats", { p_days: days });
  if (error) throw error;
  const row = data?.[0];
  return {
    sureTotal: row?.sure_total ?? 0,
    sureCorrect: row?.sure_correct ?? 0,
    guessTotal: row?.guess_total ?? 0,
    guessCorrect: row?.guess_correct ?? 0,
  };
}
