import { describe, expect, test, vi } from "vitest";
import { checkAnswer, isExactAnswer, normalizeAnswer } from "@/lib/ai/checkAnswer";
import type { AiClient } from "@/lib/ai/generate";

const card = { front: "Qual a capital da França?", back: "**Paris**." };

function fakeClient(text: string, stop_reason = "end_turn") {
  const create = vi.fn().mockResolvedValue({ stop_reason, content: [{ type: "text", text }] });
  return { client: { messages: { create } } as unknown as AiClient, create };
}

describe("normalizeAnswer e isExactAnswer", () => {
  test("ignora maiúsculas, acentos, pontuação e Markdown", () => {
    expect(normalizeAnswer("  **Átomo**, de  CARBONO! ")).toBe("atomo de carbono");
    expect(isExactAnswer("paris", card.back)).toBe(true);
  });

  test("resposta diferente ou vazia não é idêntica", () => {
    expect(isExactAnswer("Lyon", card.back)).toBe(false);
    expect(isExactAnswer("...", card.back)).toBe(false);
  });
});

describe("checkAnswer", () => {
  test("devolve a correção da IA e manda pergunta, gabarito e resposta", async () => {
    const result = { correct: false, feedback: "Lyon é outra cidade.", howTo: "1. Lembre da Torre Eiffel.\n2. Paris." };
    const { client, create } = fakeClient(JSON.stringify(result));
    await expect(checkAnswer(client, card, "Lyon")).resolves.toEqual(result);
    const content = create.mock.calls[0][0].messages[0].content as string;
    expect(content).toContain("Qual a capital da França?");
    expect(content).toContain("<resposta_do_estudante>\nLyon");
  });

  test("quando acerta, o passo a passo vem vazio", async () => {
    const { client } = fakeClient(JSON.stringify({ correct: true, feedback: "Isso!", howTo: "texto extra" }));
    await expect(checkAnswer(client, card, "a capital é paris")).resolves.toEqual({
      correct: true,
      feedback: "Isso!",
      howTo: "",
    });
  });

  test("JSON inválido vira invalid_output", async () => {
    const { client } = fakeClient("não é json");
    await expect(checkAnswer(client, card, "Lyon")).rejects.toMatchObject({ code: "invalid_output" });
  });

  test("recusa vira refused", async () => {
    const { client } = fakeClient("", "refusal");
    await expect(checkAnswer(client, card, "Lyon")).rejects.toMatchObject({ code: "refused" });
  });
});
