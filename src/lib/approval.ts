// Chance de aprovação: quanto a pessoa faria na prova hoje, comparado com a nota de corte.
// A nota de cada disciplina é a chance média de lembrar os cartões dela (cartão novo vale zero),
// e o peso no edital diz quanto da prova cada disciplina vale.

import { recallChance, type MemoryCard } from "@/lib/srs/thermometer";

export type DisciplineScore = {
  name: string;
  weight: number;
  /** Parte da disciplina que a pessoa acertaria hoje (0 a 1). */
  expected: number;
  /** Pontos (de 100) que a disciplina ainda pode render. */
  room: number;
};

export type Approval = {
  /** Pontos que a pessoa faria hoje, de 0 a 100. */
  score: number;
  cutoff: number | null;
  /** Pontos que faltam para a nota de corte (0 se já passou), ou null sem nota de corte. */
  gap: number | null;
  disciplines: DisciplineScore[];
  /** Disciplina que mais rende pontos agora, ou null quando não falta nada. */
  best: DisciplineScore | null;
  verdict: "above" | "close" | "below" | "unknown";
};

/** Distância da nota de corte, em pontos, que ainda conta como "perto". */
export const CLOSE_POINTS = 5;

export function approvalChance(
  disciplines: Array<{ name: string; weight: number; cards: MemoryCard[] }>,
  cutoff: number | null,
  at: Date,
): Approval {
  const totalWeight = disciplines.reduce((n, d) => n + Math.max(0, d.weight), 0) || 1;
  const scored = disciplines.map((d) => {
    const expected = d.cards.length ? d.cards.reduce((n, c) => n + recallChance(c, at), 0) / d.cards.length : 0;
    const share = (Math.max(0, d.weight) / totalWeight) * 100;
    return { name: d.name, weight: d.weight, expected, room: share * (1 - expected) };
  });
  const score = scored.reduce((n, d) => n + (Math.max(0, d.weight) / totalWeight) * 100 * d.expected, 0);
  const best = [...scored].sort((a, b) => b.room - a.room)[0];
  const gap = cutoff === null ? null : Math.max(0, cutoff - score);
  return {
    score,
    cutoff,
    gap,
    disciplines: scored,
    best: best && best.room >= 0.5 ? best : null,
    verdict: cutoff === null ? "unknown" : score >= cutoff ? "above" : cutoff - score <= CLOSE_POINTS ? "close" : "below",
  };
}

/** Frase principal: "Se a prova fosse hoje, você faria cerca de 62 pontos…". */
export function approvalSentence(a: Approval): string {
  const score = Math.round(a.score);
  const first = `Se a prova fosse hoje, você faria cerca de ${score} de 100 pontos.`;
  if (a.cutoff === null) return first;
  const cutoff = Math.round(a.cutoff);
  if (a.verdict === "above") return `${first} A nota de corte foi ${cutoff}: hoje você passaria.`;
  const gap = Math.max(1, Math.round(a.gap ?? 0));
  const tail = a.best ? ` O que mais rende agora é ${a.best.name}.` : "";
  return `${first} A nota de corte foi ${cutoff}. Faltam ${gap} ${gap === 1 ? "ponto" : "pontos"}.${tail}`;
}
