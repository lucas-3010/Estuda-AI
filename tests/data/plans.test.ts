import { beforeEach, describe, expect, test, vi } from "vitest";
import { fakeSupabase } from "./fakeSupabase";

let fake = fakeSupabase();
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => fake.client }));

import { savePlan } from "@/lib/data/plans";
import { recordReview } from "@/lib/data/reviews";

const plan = {
  steps: [
    { title: "Básico", goal: "Entender", cards: [{ front: "P1", back: "R1" }, { front: "P2", back: "R2" }] },
    { title: "Avançado", goal: "Aplicar", cards: [{ front: "P3", back: "R3" }] },
  ],
};

beforeEach(() => {
  fake = fakeSupabase();
});

describe("savePlan", () => {
  test("grava tudo numa única chamada save_plan", async () => {
    fake = fakeSupabase({ "rpc.save_plan": { data: "plan-1", error: null } });
    const id = await savePlan({ topic: "Joins", level: "iniciante", context: "", plan });
    expect(id).toBe("plan-1");
    expect(fake.client.rpc).toHaveBeenCalledTimes(1);
    expect(fake.client.rpc).toHaveBeenCalledWith("save_plan", {
      p_topic: "Joins",
      p_level: "iniciante",
      p_context: null,
      p_steps: plan.steps,
    });
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  test("erro do banco é relançado", async () => {
    fake = fakeSupabase({ "rpc.save_plan": { data: null, error: { message: "falhou" } } });
    await expect(savePlan({ topic: "Joins", level: "iniciante", plan })).rejects.toBeTruthy();
  });
});

describe("recordReview", () => {
  test("chama a função record_review com o novo estado", async () => {
    const next = {
      due: "2026-10-22T00:00:00.000Z",
      stability: 2,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      learning_steps: 0,
      reps: 1,
      lapses: 0,
      state: 1,
      last_review: "2026-10-21T00:00:00.000Z",
    };
    await recordReview("card-1", 3, next);
    expect(fake.client.rpc).toHaveBeenCalledWith("record_review", {
      p_card_id: "card-1",
      p_rating: 3,
      p_next: next,
    });
  });

  test("erro na RPC é relançado", async () => {
    fake = fakeSupabase({ "rpc.record_review": { data: null, error: { message: "x" } } });
    await expect(
      recordReview("card-1", 3, {
        due: "", stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0,
        learning_steps: 0, reps: 0, lapses: 0, state: 0, last_review: null,
      }),
    ).rejects.toBeTruthy();
  });
});
