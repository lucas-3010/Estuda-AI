import { describe, expect, test, vi } from "vitest";
import { generate, type AiClient } from "@/lib/ai/generate";
import { examSchema, generateRequestSchema, importedExamSchema } from "@/lib/validation/plan";

const card = { front: "O que é fotossíntese?", back: "Produção de glicose a partir de luz, água e CO2." };
const step = { title: "Etapa", goal: "Objetivo", cards: Array(5).fill(card) };
const validPlan = { steps: Array(4).fill(step) };

const fetchOk = {
  type: "web_fetch_tool_result",
  tool_use_id: "t1",
  content: { type: "web_fetch_result", url: "https://exemplo.com", content: {} },
};
const fetchError = {
  type: "web_fetch_tool_result",
  tool_use_id: "t1",
  content: { type: "web_fetch_tool_result_error", error_code: "url_not_accessible" },
};

function fakeClient(...messages: Array<{ stop_reason: string; content: unknown[] }>) {
  const stream = vi.fn();
  for (const m of messages) stream.mockReturnValueOnce({ finalMessage: async () => m });
  return { client: { messages: { stream } } as unknown as AiClient, stream };
}

const text = (body: unknown) => ({ type: "text", text: typeof body === "string" ? body : JSON.stringify(body) });
const link = {
  mode: "link" as const,
  topic: "Fotossíntese",
  level: "iniciante" as const,
  url: "https://pt.wikipedia.org/wiki/Fotoss%C3%ADntese",
};

describe("modo link", () => {
  test("lê a página com web_fetch e usa só o JSON depois do resultado", async () => {
    const { client, stream } = fakeClient({
      stop_reason: "end_turn",
      content: [text("Vou ler a página."), { type: "server_tool_use", id: "t1", name: "web_fetch", input: {} }, fetchOk, text(validPlan)],
    });
    await expect(generate(client, link)).resolves.toEqual(validPlan);
    const params = stream.mock.calls[0][0];
    expect(params.tools).toEqual([expect.objectContaining({ type: "web_fetch_20250910", name: "web_fetch" })]);
    expect(params.messages[0].content).toContain(link.url);
  });

  test("continua o turno pausado pela ferramenta", async () => {
    const { client, stream } = fakeClient(
      { stop_reason: "pause_turn", content: [{ type: "server_tool_use", id: "t1", name: "web_fetch", input: {} }, fetchOk] },
      { stop_reason: "end_turn", content: [text(validPlan)] },
    );
    await expect(generate(client, link)).resolves.toEqual(validPlan);
    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[1][0].messages.at(-1).role).toBe("assistant");
  });

  test("página que não abre vira source_unreadable, sem inventar o conteúdo", async () => {
    const { client } = fakeClient({ stop_reason: "end_turn", content: [fetchError, text(validPlan)] });
    await expect(generate(client, link)).rejects.toMatchObject({ code: "source_unreadable" });
  });

  test("aceita só links http e https", () => {
    expect(generateRequestSchema.safeParse({ ...link, url: "javascript:alert(1)" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...link, url: "ftp://exemplo.com/a" }).success).toBe(false);
    expect(generateRequestSchema.safeParse(link).success).toBe(true);
  });
});

describe("modo reforço", () => {
  test("gera cartões a partir dos erros, sem ferramentas", async () => {
    const reinforce = { cards: Array(4).fill(card) };
    const { client, stream } = fakeClient({ stop_reason: "end_turn", content: [text(reinforce)] });
    const result = await generate(client, {
      mode: "reinforce",
      topic: "Biologia",
      level: "iniciante",
      step: { title: "Fotossíntese", goal: "Entender a fotossíntese" },
      missed: [card],
    });
    expect(result).toEqual(reinforce);
    expect(stream.mock.calls[0][0].tools).toBeUndefined();
    expect(stream.mock.calls[0][0].messages[0].content).toContain(card.front);
  });
});

describe("modo simulado", () => {
  const question = { statement: "Enunciado", options: ["A", "B", "C", "D", "E"], answer: 2, explanation: "Porque sim." };

  test("devolve as questões no estilo da banca", async () => {
    const { client, stream } = fakeClient({ stop_reason: "end_turn", content: [text({ questions: [question] })] });
    const result = await generate(client, {
      mode: "exam",
      topic: "Direito Constitucional",
      level: "intermediario",
      banca: "cebraspe",
      count: 5,
      cards: Array(4).fill(card),
    });
    expect(result).toEqual({ questions: [question] });
    expect(stream.mock.calls[0][0].messages[0].content).toContain("Certo");
  });

  test("resposta fora das alternativas é inválida", () => {
    expect(examSchema.safeParse({ questions: [{ ...question, answer: 5 }] }).success).toBe(false);
  });

  test("pede pelo menos 4 cartões de base", () => {
    const req = { mode: "exam", topic: "Tema", level: "iniciante", banca: "enem", count: 10, cards: [card] };
    expect(generateRequestSchema.safeParse(req).success).toBe(false);
  });
});

describe("modo importar prova", () => {
  const question = { number: 1, statement: "Quanto é 2 + 2?", options: ["3", "4", "5", "6", "7"], answer: 1, fromKey: true };
  const pasted = { kind: "text" as const, text: "1. Quanto é 2 + 2? (A) 3 (B) 4 (C) 5 (D) 6 (E) 7. ".repeat(2) };

  test("manda a prova e o gabarito digitado e devolve as questões", async () => {
    const exam = { title: "Prova teste 2024", questions: [question] };
    const { client, stream } = fakeClient({ stop_reason: "end_turn", content: [text(exam)] });
    const result = await generate(client, { mode: "import", source: pasted, answerKey: "1-B" });
    expect(result).toEqual(exam);
    const content = stream.mock.calls[0][0].messages[0].content;
    expect(content[0].text).toContain("<material>");
    expect(content[1].text).toContain("<gabarito>\n1-B\n</gabarito>");
    expect(stream.mock.calls[0][0].tools).toBeUndefined();
  });

  test("descarta questões mal lidas e mantém as boas", async () => {
    const broken = { ...question, number: 2, answer: 9 };
    const { client } = fakeClient({
      stop_reason: "end_turn",
      content: [text({ title: "Prova", questions: [question, broken, { number: 3 }] })],
    });
    const result = await generate(client, { mode: "import", source: pasted });
    expect(result).toEqual({ title: "Prova", questions: [question] });
  });

  test("material sem questões vira no_questions", async () => {
    const { client } = fakeClient({ stop_reason: "end_turn", content: [text({ title: "Nada", questions: [] })] });
    await expect(generate(client, { mode: "import", source: pasted })).rejects.toMatchObject({ code: "no_questions" });
  });

  test("lê no máximo 40 questões", () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ ...question, number: i + 1 }));
    const parsed = importedExamSchema.parse({ title: "Grande", questions: many });
    expect(parsed.questions).toHaveLength(40);
  });

  test("gabarito digitado tem limite de tamanho", () => {
    const body = { mode: "import", source: pasted, answerKey: "x".repeat(3001) };
    expect(generateRequestSchema.safeParse(body).success).toBe(false);
  });
});
