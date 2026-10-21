import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vitest";
import { AiError, aiErrorMessage, toAiError } from "@/lib/ai/errors";

describe("mensagens de erro", () => {
  test.each([
    ["quota_exceeded", "Você usou todas as gerações com IA do seu plano este mês. Troque de plano para gerar mais."],
    ["rate_limited", "Muitas gerações seguidas. Espere um minuto e tente de novo."],
    ["refused", "A IA não gerou conteúdo para este tema. Tente reformular."],
  ] as const)("%s", (code, text) => {
    expect(aiErrorMessage(code)).toBe(text);
  });

  test("todos os códigos têm mensagem", () => {
    for (const code of ["quota_exceeded", "files_not_allowed", "unavailable", "rate_limited", "refused", "invalid_output", "network"] as const) {
      expect(aiErrorMessage(code).length).toBeGreaterThan(10);
    }
  });
});

describe("toAiError", () => {
  const headers = new Headers();

  test("401 (chave do servidor) vira unavailable", () => {
    const e = new Anthropic.AuthenticationError(401, { error: { message: "invalid x-api-key" } }, undefined, headers);
    expect(toAiError(e).code).toBe("unavailable");
  });

  test("429 da Anthropic vira unavailable", () => {
    const e = new Anthropic.RateLimitError(429, { error: { message: "rate limited" } }, undefined, headers);
    expect(toAiError(e).code).toBe("unavailable");
  });

  test("400 de crédito insuficiente vira unavailable", () => {
    const e = new Anthropic.BadRequestError(
      400,
      { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } },
      undefined,
      headers,
    );
    expect(toAiError(e).code).toBe("unavailable");
  });

  test("falha de conexão vira network", () => {
    expect(toAiError(new Anthropic.APIConnectionError({ message: "fetch failed" })).code).toBe("network");
  });

  test("AiError passa direto", () => {
    const e = new AiError("refused");
    expect(toAiError(e)).toBe(e);
  });
});
