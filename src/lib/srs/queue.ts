import { recallChance } from "@/lib/srs/thermometer";
import type { CardRow } from "@/lib/supabase/database.types";

/** Dias antes da prova em que o modo véspera liga. */
export const VESPERA_DAYS = 7;

/**
 * Modo véspera: nos últimos dias antes da prova, as etapas do plano não recebem cartões novos
 * e os cartões de memória mais fraca (pesando a disciplina) vêm primeiro, mesmo antes de vencer.
 */
export type Vespera = {
  /** Etapas em véspera: peso da disciplina e data da prova. */
  steps: Map<string, { weight: number; exam: Date }>;
  /** Cartões já estudados dessas etapas, inclusive os que ainda não venceram. */
  extra: CardRow[];
  /** Abaixo desta chance de lembrar no dia da prova, o cartão é revisado antes. */
  retention: number;
  /** Máximo de revisões antecipadas por dia. */
  limit: number;
};

export type QueueOptions = {
  now: Date;
  timeZone: string;
  newPerDay: number;
  newStudiedToday: number;
  vespera?: Vespera | null;
};

/** Data local (AAAA-MM-DD) de um instante no fuso informado. */
export function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Fila de revisão do dia: cartões já estudados que vencem até o fim do dia local
 * (mais atrasados primeiro), seguidos dos novos dentro do limite diário restante
 * (na ordem de vencimento, que segue a ordem das etapas do plano).
 */
export function buildQueue(cards: CardRow[], opts: QueueOptions): CardRow[] {
  const today = localDay(opts.now, opts.timeZone);
  const isDueToday = (c: CardRow) => localDay(new Date(c.due), opts.timeZone) <= today;
  const vespera = opts.vespera?.steps.size ? opts.vespera : null;
  const inVespera = (c: CardRow) => Boolean(vespera && c.step_id && vespera.steps.has(c.step_id));
  // Quanto o cartão pode render na prova: chance de esquecer até lá vezes o peso da disciplina.
  const urgency = (c: CardRow) => {
    const step = vespera!.steps.get(c.step_id!)!;
    return (1 - recallChance(c, step.exam)) * step.weight;
  };

  const due = cards
    .filter((c) => c.state !== 0 && isDueToday(c))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due));

  const remainingNew = Math.max(0, opts.newPerDay - opts.newStudiedToday);
  const fresh = cards
    .filter((c) => c.state === 0 && !inVespera(c))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due) || a.id.localeCompare(b.id))
    .slice(0, remainingNew);

  if (!vespera) return [...due, ...fresh];

  const dueIds = new Set(due.map((c) => c.id));
  const early = vespera.extra
    .filter((c) => c.state !== 0 && !dueIds.has(c.id) && inVespera(c))
    .filter((c) => recallChance(c, vespera.steps.get(c.step_id!)!.exam) < vespera.retention)
    .sort((a, b) => urgency(b) - urgency(a))
    .slice(0, vespera.limit);
  const dueVespera = due.filter(inVespera).sort((a, b) => urgency(b) - urgency(a));
  const dueOthers = due.filter((c) => !inVespera(c));
  return [...dueVespera, ...early, ...dueOthers, ...fresh];
}

/** Planos em véspera: prova marcada entre hoje e daqui a VESPERA_DAYS dias. */
export function vesperaPlans<T extends { examDate: string | null; kind?: string }>(plans: T[], today: string): T[] {
  const limit = addDays(today, VESPERA_DAYS);
  return plans.filter((p) => p.kind !== "mistakes" && p.examDate && p.examDate >= today && p.examDate <= limit);
}

/** "2026-10-22" + 7 → "2026-10-29". */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
