import { describe, expect, test, vi } from "vitest";
import { fakeSupabase } from "./fakeSupabase";

const fake = fakeSupabase();
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => fake.client }));

import { updateSettings } from "@/lib/data/settings";

describe("updateSettings", () => {
  test("faz upsert com o id do usuário para funcionar mesmo sem linha existente", async () => {
    await updateSettings({ newCardsPerDay: 30, desiredRetention: 0.85, dailyGoal: 15, emailReminders: false });
    expect(fake.calls).toContainEqual({
      table: "user_settings",
      op: "upsert",
      args: [
        {
          user_id: "user-1",
          new_cards_per_day: 30,
          desired_retention: 0.85,
          daily_goal: 15,
          email_reminders: false,
          time_zone: expect.any(String),
        },
        { onConflict: "user_id" },
      ],
    });
  });
});
