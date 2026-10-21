import { describe, expect, test } from "vitest";
import { previewIntervals, schedule, toFsrsCard, toNextState } from "@/lib/srs/fsrs";
import { makeCardRow } from "./helpers";

const now = new Date("2026-10-21T12:00:00.000Z");

describe("adaptador FSRS", () => {
  test("ida e volta preserva todos os campos do estado", () => {
    const row = makeCardRow({
      due: "2026-10-25T12:00:00.000Z",
      stability: 4.2,
      difficulty: 5.5,
      elapsed_days: 3,
      scheduled_days: 4,
      learning_steps: 0,
      reps: 3,
      lapses: 1,
      state: 2,
      last_review: "2026-10-21T12:00:00.000Z",
    });
    expect(toNextState(toFsrsCard(row))).toEqual({
      due: "2026-10-25T12:00:00.000Z",
      stability: 4.2,
      difficulty: 5.5,
      elapsed_days: 3,
      scheduled_days: 4,
      learning_steps: 0,
      reps: 3,
      lapses: 1,
      state: 2,
      last_review: "2026-10-21T12:00:00.000Z",
    });
  });

  test("cartão novo avaliado como Bom passa a aprendendo e vence no futuro", () => {
    const next = schedule(makeCardRow(), 3, now, 0.9);
    expect(next.state).toBe(1);
    expect(new Date(next.due).getTime()).toBeGreaterThan(now.getTime());
    expect(next.reps).toBe(1);
  });

  test("notas maiores agendam para mais longe", () => {
    const row = makeCardRow({
      state: 2,
      stability: 5,
      difficulty: 5,
      reps: 4,
      scheduled_days: 5,
      due: now.toISOString(),
      last_review: "2026-10-16T12:00:00.000Z",
    });
    const due = (r: 2 | 3 | 4) => new Date(schedule(row, r, now, 0.9).due).getTime();
    expect(due(4)).toBeGreaterThan(due(3));
    expect(due(3)).toBeGreaterThan(due(2));
  });

  test("errar um cartão em revisão incrementa lapses", () => {
    const row = makeCardRow({
      state: 2,
      stability: 5,
      difficulty: 5,
      reps: 4,
      lapses: 0,
      scheduled_days: 5,
      due: now.toISOString(),
      last_review: "2026-10-16T12:00:00.000Z",
    });
    expect(schedule(row, 1, now, 0.9).lapses).toBe(1);
  });

  test("previewIntervals devolve um rótulo legível para cada nota", () => {
    const preview = previewIntervals(makeCardRow(), now, 0.9);
    expect(Object.keys(preview).sort()).toEqual(["1", "2", "3", "4"]);
    for (const r of [1, 2, 3, 4] as const) {
      expect(preview[r].label).toMatch(/^\d+ (min|h|d|sem|mês|meses|ano|anos)$/);
    }
  });
});
