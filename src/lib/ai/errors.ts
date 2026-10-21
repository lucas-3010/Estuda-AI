import Anthropic from "@anthropic-ai/sdk";

export type AiErrorCode = "no_key" | "bad_key" | "rate_limited" | "refused" | "invalid_output" | "network";

const MESSAGES: Record<AiErrorCode, string> = {
  no_key: "Configure sua chave da Anthropic em Configurações para gerar planos.",
  bad_key: "Sua chave foi recusada. Confira em Configurações.",
  rate_limited: "Limite ou crédito da sua conta Anthropic atingido.",
  refused: "A IA não gerou conteúdo para este tema. Tente reformular.",
  invalid_output: "A IA devolveu uma resposta incompleta. Tente de novo.",
  network: "Não foi possível falar com a IA. Verifique sua conexão e tente de novo.",
};

export class AiError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(MESSAGES[code]);
    this.name = "AiError";
  }
}

export function aiErrorMessage(code: AiErrorCode): string {
  return MESSAGES[code];
}

export function isAiErrorCode(value: unknown): value is AiErrorCode {
  return typeof value === "string" && value in MESSAGES;
}

function isCreditError(e: InstanceType<typeof Anthropic.APIError>): boolean {
  const body = e.error as { error?: { message?: string } } | undefined;
  return /credit balance/i.test(body?.error?.message ?? "");
}

export function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return new AiError("bad_key");
  }
  if (e instanceof Anthropic.RateLimitError) return new AiError("rate_limited");
  if (e instanceof Anthropic.BadRequestError && isCreditError(e)) return new AiError("rate_limited");
  if (e instanceof Anthropic.APIConnectionError) return new AiError("network");
  return new AiError("network");
}
