import { createBrowserSupabase } from "@/lib/supabase/client";

export type Streak = { current: number; best: number; reviewsToday: number };

/** Dias seguidos com pelo menos uma revisão e revisões feitas hoje, no fuso do usuário. */
export async function getStreak(timeZone: string): Promise<Streak> {
  const { data, error } = await createBrowserSupabase().rpc("study_streak", { p_tz: timeZone });
  if (error) throw error;
  const row = data?.[0];
  return {
    current: row?.current_streak ?? 0,
    best: row?.best_streak ?? 0,
    reviewsToday: row?.reviews_today ?? 0,
  };
}
