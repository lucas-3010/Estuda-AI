import { describe, expect, test, vi } from "vitest";
import { generate, type AiClient } from "@/lib/ai/generate";
import { examSchema, generateRequestSchema } from "@/lib/validation/plan";

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
