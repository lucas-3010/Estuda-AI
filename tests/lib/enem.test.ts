import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ENEM_AREA_IDS, ENEM_FIRST_YEAR, ENEM_LAST_YEAR, enemToQuiz, pickEnem, type EnemQuestion } from "@/lib/enem";
import { NO_KEY_NOTE, importedToQuiz, pickFromExam } from "@/lib/quiz";

function q(id: string, year: number, language: EnemQuestion["language"] = null): EnemQuestion {
  return { id, year, number: 1, language, context: "Texto", question: "Pergunta", options: ["a", "b", "c", "d", "e"], answer: 2 };
}

const pool = [q("a", 2023), q("b", 2023, "ingles"), q("c", 2023, "espanhol"), q("d", 2019)];

describe("pickEnem", () => {
  test("filtra pelo ano e pela língua estrangeira escolhida", () => {
    const ids = pickEnem(pool, { year: 2023, language: "ingles" }, 10).map((x) => x.id);
    expect(ids.sort()).toEqual(["a", "b"]);
  });

  test("sem ano, usa todos os anos e respeita a quantidade", () => {
    expect(pickEnem(pool, { year: null, language: "espanhol" }, 2)).toHaveLength(2);
    expect(pickEnem(pool, { year: null, language: "espanhol" }, 10).map((x) => x.id).sort()).toEqual(["a", "c", "d"]);
  });

  test("vira questão do quiz com a origem e o texto de apoio", () => {
    const quiz = enemToQuiz({ ...q("2023-100", 2023), number: 100 });
    expect(quiz).toMatchObject({ prompt: "Texto\n\nPergunta", answer: 2, source: "ENEM 2023 · Questão 100" });
  });
});

describe("arquivos de questões do ENEM", () => {
  test.each(ENEM_AREA_IDS)("%s tem questões completas e com gabarito", (area) => {
    const list: EnemQuestion[] = JSON.parse(readFileSync(join(process.cwd(), "public/enem", `${area}.json`), "utf8"));
    expect(list.length).toBeGreaterThan(500);
    expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    for (const item of list) {
      expect(item.options).toHaveLength(5);
      expect(item.options.every((o) => o.trim().length > 0)).toBe(true);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(5);
      expect(item.year).toBeGreaterThanOrEqual(ENEM_FIRST_YEAR);
      expect(item.year).toBeLessThanOrEqual(ENEM_LAST_YEAR);
      expect(item.context || item.question).toBeTruthy();
    }
  });
});

describe("provas importadas", () => {
  const question = { number: 7, statement: "Enunciado", options: ["Certo", "Errado"], answer: 0, fromKey: true };

  test("mostra a origem e avisa quando a resposta veio da IA", () => {
    expect(importedToQuiz(question, "Cebraspe 2022", 0)).toMatchObject({ source: "Cebraspe 2022 · Questão 7", note: undefined });
    expect(importedToQuiz({ ...question, fromKey: false }, "Cebraspe 2022", 0).note).toBe(NO_KEY_NOTE);
  });

  test("prova inteira mantém a ordem; com limite, sorteia", () => {
    const items = [1, 2, 3, 4, 5];
    expect(pickFromExam(items, null)).toEqual(items);
    expect(pickFromExam(items, 3)).toHaveLength(3);
  });
});
