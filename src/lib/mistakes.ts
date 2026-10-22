// Caderno de erros: a questão errada no quiz vira um cartão de revisão.

import type { QuizQuestion } from "@/lib/quiz";

const LETTERS = ["A", "B", "C", "D", "E"];
const MAX_TEXT = 20000;

/** Frente com o enunciado e as alternativas; verso com a certa, a marcada e a explicação. */
export function mistakeCard(question: QuizQuestion, picked: number): { front: string; back: string } {
  const options = question.options.map((option, i) => `**${LETTERS[i] ?? i + 1})** ${option}`).join("\n\n");
  const front = [question.source ? `*${question.source}*` : null, question.prompt, options]
    .filter(Boolean)
    .join("\n\n");
  const right = `${LETTERS[question.answer] ?? question.answer + 1}) ${question.options[question.answer]}`;
  const wrong = `${LETTERS[picked] ?? picked + 1}) ${question.options[picked]}`;
  const back = [
    `**Resposta certa: ${right}**`,
    `Você tinha marcado ${wrong}.`,
    question.explanation ?? null,
    question.note ? `_${question.note}_` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { front: front.slice(0, MAX_TEXT), back: back.slice(0, MAX_TEXT) };
}
