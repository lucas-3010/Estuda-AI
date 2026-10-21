import { createBrowserSupabase } from "@/lib/supabase/client";

export type Settings = { newCardsPerDay: number; desiredRetention: number };

export const DEFAULT_SETTINGS: Settings = { newCardsPerDay: 20, desiredRetention: 0.9 };

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await createBrowserSupabase()
    .from("user_settings")
    .select("new_cards_per_day, desired_retention")
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return { newCardsPerDay: data.new_cards_per_day, desiredRetention: data.desired_retention };
}

export async function updateSettings(settings: Settings): Promise<void> {
  const supabase = createBrowserSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) throw new Error("Sessão expirada");
  const { error } = await supabase
    .from("user_settings")
    .update({ new_cards_per_day: settings.newCardsPerDay, desired_retention: settings.desiredRetention })
    .eq("user_id", userId);
  if (error) throw error;
}
