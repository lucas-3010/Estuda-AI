import type { CardRow } from "@/lib/supabase/database.types";

export function makeCardRow(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: "card-1",
    user_id: "user-1",
    step_id: null,
    front: "Frente",
    back: "Verso",
    created_at: "2026-10-01T12:00:00.000Z",
    updated_at: "2026-10-01T12:00:00.000Z",
    due: "2026-10-01T12:00:00.000Z",
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: null,
    origin: null,
    topic: null,
    law_ref: null,
    ...overrides,
  };
}
