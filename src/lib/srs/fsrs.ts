import {
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
  type State,
} from "ts-fsrs";
import type { CardRow } from "@/lib/supabase/database.types";

export type Rating = 1 | 2 | 3 | 4;

/** Estado FSRS no formato do parâmetro `p_next` da função `record_review`. */
export type NextState = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

const schedulers = new Map<number, ReturnType<typeof fsrs>>();

function scheduler(retention: number) {
  let f = schedulers.get(retention);
  if (!f) {
    f = fsrs(generatorParameters({ request_retention: retention }));
    schedulers.set(retention, f);
  }
  return f;
}

export function toFsrsCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function toNextState(card: Card): NextState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function schedule(row: CardRow, rating: Rating, now: Date, retention: number): NextState {
  const { card } = scheduler(retention).next(toFsrsCard(row), now, rating as Grade);
  return toNextState(card);
}

export function previewIntervals(
  row: CardRow,
  now: Date,
  retention: number,
): Record<Rating, { due: Date; label: string }> {
  const preview = scheduler(retention).repeat(toFsrsCard(row), now);
  const entry = (r: Rating) => {
    const due = preview[r as Grade].card.due;
    return { due, label: formatInterval(due.getTime() - now.getTime()) };
  };
  return { 1: entry(1), 2: entry(2), 3: entry(3), 4: entry(4) };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatInterval(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = Math.round(ms / DAY);
  if (days < 7) return `${days} d`;
  if (days < 30) return `${Math.round(days / 7)} sem`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} ${months === 1 ? "mês" : "meses"}`;
  }
  const years = Math.round(days / 365);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}
