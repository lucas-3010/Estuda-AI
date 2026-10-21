import type { CardRow } from "@/lib/supabase/database.types";

export type QueueOptions = {
  now: Date;
  timeZone: string;
  newPerDay: number;
  newStudiedToday: number;
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

  const due = cards
    .filter((c) => c.state !== 0 && isDueToday(c))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due));

  const remainingNew = Math.max(0, opts.newPerDay - opts.newStudiedToday);
  const fresh = cards
    .filter((c) => c.state === 0)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due) || a.id.localeCompare(b.id))
    .slice(0, remainingNew);

  return [...due, ...fresh];
}
