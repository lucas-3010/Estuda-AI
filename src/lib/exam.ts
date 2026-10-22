// Contagem regressiva para a prova e quantos cartões novos por dia cabem até lá.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Data de hoje (AAAA-MM-DD) no fuso da pessoa. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Dias inteiros de `from` até `to`, as duas no formato AAAA-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export type ExamPlan =
  | { kind: "past" }
  | { kind: "today" }
  | { kind: "ahead"; days: number; newPerDay: number };

/**
 * Para ver todos os cartões novos antes da prova, estuda até a véspera:
 * com 10 dias e 40 cartões novos, são 4 por dia.
 */
export function examPlan(examDate: string, today: string, newCards: number): ExamPlan {
  const days = daysBetween(today, examDate);
  if (days < 0) return { kind: "past" };
  if (days === 0) return { kind: "today" };
  return { kind: "ahead", days, newPerDay: Math.ceil(newCards / days) };
}

/** "12/11" a partir de "2026-11-12". */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}
