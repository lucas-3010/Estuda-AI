// Termômetro da prova: quanto do plano a pessoa lembra hoje e quanto vai lembrar no dia da prova.
// Usa a chance de lembrar (retrievability) que o FSRS calcula para cada cartão.

import { fsrs } from "ts-fsrs";
import { toFsrsCard } from "@/lib/srs/fsrs";
import type { CardRow } from "@/lib/supabase/database.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Campos do cartão que o termômetro usa. */
export type MemoryCard = Pick<
  CardRow,
  | "id"
  | "step_id"
  | "topic"
  | "due"
  | "stability"
  | "difficulty"
  | "elapsed_days"
  | "scheduled_days"
  | "learning_steps"
  | "reps"
  | "lapses"
  | "state"
  | "last_review"
>;

export type Memory = {
  /** Cartões no grupo. */
  total: number;
  /** Cartões que já passaram por pelo menos uma revisão. */
  studied: number;
  /** Chance média de lembrar os cartões estudados (0 a 1), ou null sem nenhum estudado. */
  memory: number | null;
  /** Parte do grupo que já foi estudada (0 a 1). */
  coverage: number;
};

// A chance de lembrar não depende da retenção desejada: um agendador com os parâmetros padrão basta.
const engine = fsrs();

/** Chance de lembrar o cartão no momento `at` (0 a 1). Cartão novo vale 0. */
export function recallChance(card: MemoryCard, at: Date): number {
  if (card.state === 0 || !card.last_review) return 0;
  const r = engine.get_retrievability(toFsrsCard(card as CardRow), at, false);
  return Number.isFinite(r) ? Math.min(1, Math.max(0, r)) : 0;
}

export function memoryOf(cards: MemoryCard[], at: Date): Memory {
  const studied = cards.filter((c) => c.state !== 0 && c.last_review);
  const sum = studied.reduce((n, c) => n + recallChance(c, at), 0);
  return {
    total: cards.length,
    studied: studied.length,
    memory: studied.length ? sum / studied.length : null,
    coverage: cards.length ? studied.length / cards.length : 0,
  };
}

/** Agrupa os cartões por chave (etapa, tópico) e calcula a memória de cada grupo, na ordem dada. */
export function memoryBy<K>(cards: MemoryCard[], keys: K[], keyOf: (card: MemoryCard) => K, at: Date): Map<K, Memory> {
  const groups = new Map<K, MemoryCard[]>(keys.map((k) => [k, []]));
  for (const card of cards) groups.get(keyOf(card))?.push(card);
  return new Map([...groups].map(([k, list]) => [k, memoryOf(list, at)]));
}

export type Projection = {
  days: number;
  /** Parte do plano que a pessoa lembra no dia da prova se continuar no ritmo atual (0 a 1). */
  keepPace: number;
  /** Parte do plano que a pessoa lembra no dia da prova se parar de estudar hoje (0 a 1). */
  ifStop: number;
};

/**
 * Projeção para o dia da prova. Mantendo o ritmo, os cartões revisados ficam perto da retenção
 * desejada e os novos entram no ritmo dos últimos dias. Parando, a memória atual vai caindo.
 */
export function projectExam(input: {
  cards: MemoryCard[];
  now: Date;
  examDate: string;
  /** Cartões novos estudados por dia, em média, nos últimos dias. */
  newPerDay: number;
  /** Retenção desejada nas configurações (0,7 a 0,99). */
  retention: number;
}): Projection | null {
  const exam = new Date(`${input.examDate}T12:00:00`);
  const days = Math.ceil((exam.getTime() - input.now.getTime()) / DAY_MS);
  const total = input.cards.length;
  if (days < 0 || total === 0) return null;

  const studied = input.cards.filter((c) => c.state !== 0 && c.last_review).length;
  const studiedByExam = Math.min(total, studied + Math.max(0, input.newPerDay) * days);
  const keepPace = (studiedByExam / total) * input.retention;
  const ifStop = input.cards.reduce((n, c) => n + recallChance(c, exam), 0) / total;
  return { days, keepPace, ifStop: Math.min(ifStop, keepPace) };
}

/** 0,723 → "72%". */
export function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/** Cor da faixa de memória: vermelho abaixo de 50%, âmbar até 75%, verde acima. */
export function memoryTone(value: number | null): "low" | "mid" | "high" | "none" {
  if (value === null) return "none";
  if (value < 0.5) return "low";
  if (value < 0.75) return "mid";
  return "high";
}

/** Texto para compartilhar o resultado. */
export function shareText(topic: string, memory: Memory, siteUrl: string): string {
  return `🧠 Hoje eu lembro de ${percent(memory.memory)} do que estudei para ${topic} (${percent(
    memory.coverage,
  )} do plano já estudado). Medido pelo Estuda-AI: ${siteUrl}`;
}
