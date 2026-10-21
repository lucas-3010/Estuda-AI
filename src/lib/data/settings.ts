import { createBrowserSupabase } from "@/lib/supabase/client";

export type Settings = {
  newCardsPerDay: number;
  desiredRetention: number;
  dailyGoal: number;
  emailReminders: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 20,
  desiredRetention: 0.9,
  dailyGoal: 20,
  emailReminders: true,
};

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

async function currentUserId(): Promise<string> {
  const { data: claims } = await createBrowserSupabase().auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) throw new Error("Sessão expirada");
  return userId;
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await createBrowserSupabase()
    .from("user_settings")
    .select("new_cards_per_day, desired_retention, daily_goal, email_reminders")
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;
  return {
    newCardsPerDay: data.new_cards_per_day,
    desiredRetention: data.desired_retention,
    dailyGoal: data.daily_goal,
    emailReminders: data.email_reminders,
  };
}

export async function updateSettings(settings: Settings): Promise<void> {
  const { error } = await createBrowserSupabase()
    .from("user_settings")
    .upsert(
      {
        user_id: await currentUserId(),
        new_cards_per_day: settings.newCardsPerDay,
        desired_retention: settings.desiredRetention,
        daily_goal: settings.dailyGoal,
        email_reminders: settings.emailReminders,
        time_zone: userTimeZone(),
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}

/** Guarda o fuso do navegador (o lembrete diário usa) e diz se a pessoa já viu as boas-vindas. */
export async function syncProfile(): Promise<{ onboarded: boolean }> {
  const supabase = createBrowserSupabase();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, time_zone: userTimeZone() }, { onConflict: "user_id" })
    .select("onboarded_at")
    .single();
  if (error) throw error;
  return { onboarded: Boolean(data.onboarded_at) };
}

export async function markOnboarded(): Promise<void> {
  const { error } = await createBrowserSupabase()
    .from("user_settings")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", await currentUserId());
  if (error) throw error;
}
