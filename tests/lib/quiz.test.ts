import { describe, expect, test } from "vitest";
import { buildQuiz, type QuizCard } from "@/lib/quiz";

const cards: QuizCard[] = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i}`,
  front: `Pergunta ${i}`,
  back: `Resposta ${i}`,
  stepId: i < 4 ? "s1" : "s2",
}));

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe("buildQuiz", () => {
  test("cada pergunta tem 4 alternativas distintas e a certa é a resposta do cartão", () => {
    const quiz = buildQuiz(cards, 5, seeded());
    expect(quiz).toHaveLength(5);
    for (const q of quiz) {
      expect(new Set(q.options).size).toBe(4);
      const card = cards.find((c) => c.id === q.cardId)!;
      expect(q.options[q.answer]).toBe(card.back);
    }
  });

  test("prefere alternativas da mesma etapa", () => {
    const q = buildQuiz(cards, 8, seeded(7)).find((x) => x.cardId === "c0")!;
    const sameStep = q.options.filter((o) => ["Resposta 1", "Resposta 2", "Resposta 3"].includes(o));
    expect(sameStep).toHaveLength(3);
  });

  test("com menos de 4 cartões não há quiz", () => {
    expect(buildQuiz(cards.slice(0, 3), 5)).toEqual([]);
  });
});
