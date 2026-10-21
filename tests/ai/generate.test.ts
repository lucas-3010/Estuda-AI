import { describe, expect, test, vi } from "vitest";
import { generate, type AiClient } from "@/lib/ai/generate";
import { AiError } from "@/lib/ai/errors";

const card = { front: "O que é um índice?", back: "Uma estrutura que acelera buscas." };
const step = (n: number) => ({ title: "Etapa", goal: "Objetivo", cards: Array(n).fill(card) });
const validPlan = { steps: Array(4).fill(step(5)) };
const invalidPlan = { steps: [...Array(3).fill(step(5)), step(3)] };

function message(body: unknown, stop_reason = "end_turn") {
  return {
    stop_reason,
    content: [
      { type: "thinking", thinking: "", signature: "x" },
      { type: "text", text: typeof body === "string" ? body : JSON.stringify(body) },
    ],
  };
}

function fakeClient(...responses: ReturnType<typeof message>[]) {
  const stream = vi.fn();
  for (const r of responses) stream.mockReturnValueOnce({ finalMessage: async () => r });
  const client = { beta: { messages: { stream } } } as unknown as AiClient;
  return { client, stream };
}

const planRequest = { mode: "plan" as const, topic: "Índices no PostgreSQL", level: "iniciante" as const };

describe("generate", () => {
  test("devolve o plano quando a resposta é válida", async () => {
    const { client } = fakeClient(message(validPlan));
    await expect(generate(client, planRequest)).resolves.toEqual(validPlan);
  });

  test("tenta de novo uma vez quando a resposta está fora dos limites", async () => {
    const { client, stream } = fakeClient(message(invalidPlan), message(validPlan));
    await expect(generate(client, planRequest)).resolves.toEqual(validPlan);
    expect(stream).toHaveBeenCalledTimes(2);
  });

  test("tenta de novo quando o JSON vem cortado", async () => {
    const { client, stream } = fakeClient(message('{"steps": [', "max_tokens"), message(validPlan));
    await expect(generate(client, planRequest)).resolves.toEqual(validPlan);
    expect(stream).toHaveBeenCalledTimes(2);
  });

  test("duas respostas inválidas viram invalid_output", async () => {
    const { client } = fakeClient(message(invalidPlan), message("não é json"));
    await expect(generate(client, planRequest)).rejects.toMatchObject({ code: "invalid_output" });
  });

  test("recusa do modelo vira refused sem nova tentativa", async () => {
    const { client, stream } = fakeClient(message("", "refusal"));
    const err = await generate(client, planRequest).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe("refused");
    expect(stream).toHaveBeenCalledTimes(1);
  });

  test("usa o Claude Opus 5.5 com pensamento adaptativo e saída estruturada", async () => {
    const { client, stream } = fakeClient(message(validPlan));
    await generate(client, planRequest);
    const params = stream.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.thinking).toEqual({ type: "adaptive" });
    expect(params.output_config.effort).toBe("medium");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(JSON.stringify(params)).not.toContain("budget_tokens");
    expect(params.tool_choice).toBeUndefined();
  });

  test("o tema e o nível vão na mensagem do usuário", async () => {
    const { client, stream } = fakeClient(message(validPlan));
    await generate(client, { ...planRequest, context: "Já sei SELECT" });
    const text = JSON.stringify(stream.mock.calls[0][0].messages);
    expect(text).toContain("Índices no PostgreSQL");
    expect(text).toContain("iniciante");
    expect(text).toContain("Já sei SELECT");
  });

  test("modo step devolve uma etapa", async () => {
    const { client } = fakeClient(message(step(6)));
    await expect(
      generate(client, { ...planRequest, mode: "step", step: { title: "Etapa", goal: "Objetivo" } }),
    ).resolves.toEqual(step(6));
  });

  test("modo ping devolve ok", async () => {
    const { client, stream } = fakeClient(message("ok"));
    await expect(generate(client, { mode: "ping" })).resolves.toEqual({ ok: true });
    expect(stream.mock.calls[0][0].max_tokens).toBeLessThanOrEqual(1024);
  });
});
