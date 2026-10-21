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
  fake = fakeSupabase({
    "study_plans.insert": { data: { id: "plan-1" }, error: null },
    "plan_steps.insert": {
      data: [
        { id: "step-a", position: 0 },
        { id: "step-b", position: 1 },
      ],
      error: null,
    },
    "cards.insert": { data: null, error: null },
  });
});

describe("savePlan", () => {
  test("insere plano, etapas em ordem e cartões novos ligados às etapas", async () => {
    const id = await savePlan({ topic: "Joins", level: "iniciante", plan });
    expect(id).toBe("plan-1");

    const insert = (table: string) => fake.calls.find((c) => c.table === table && c.op === "insert")!.args[0];
    expect(insert("study_plans")).toMatchObject({ topic: "Joins", level: "iniciante" });
    expect(insert("plan_steps")).toEqual([
      { plan_id: "plan-1", position: 0, title: "Básico", goal: "Entender" },
      { plan_id: "plan-1", position: 1, title: "Avançado", goal: "Aplicar" },
    ]);
    const cards = insert("cards") as Array<Record<string, unknown>>;
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.step_id)).toEqual(["step-a", "step-a", "step-b"]);
    expect(cards.every((c) => c.state === 0)).toBe(true);
  });

  test("falha ao inserir cartões apaga o plano e relança o erro", async () => {
    fake = fakeSupabase({
      "study_plans.insert": { data: { id: "plan-1" }, error: null },
      "plan_steps.insert": { data: [{ id: "step-a", position: 0 }, { id: "step-b", position: 1 }], error: null },
      "cards.insert": { data: null, error: { message: "falhou" } },
    });
    await expect(savePlan({ topic: "Joins", level: "iniciante", plan })).rejects.toBeTruthy();
    const del = fake.calls.find((c) => c.table === "study_plans" && c.op === "delete");
    expect(del).toBeDefined();
    expect(fake.calls).toContainEqual({ table: "study_plans", op: "eq", args: ["id", "plan-1"] });
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
