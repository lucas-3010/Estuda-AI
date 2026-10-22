import Anthropic from "@anthropic-ai/sdk";

export type AiErrorCode =
  | "quota_exceeded"
  | "files_not_allowed"
  | "unavailable"
  | "rate_limited"
  | "refused"
  | "invalid_output"
  | "network"
  | "unauthenticated"
  | "source_unreadable"
  | "no_questions"
  | "law_too_long"
  | "law_unreadable"
  | "already_generated";

const MESSAGES: Record<AiErrorCode, string> = {
  quota_exceeded: "Você usou todas as gerações com IA do seu plano este mês. Troque de plano para gerar mais.",
  files_not_allowed: "Usar PDF e foto está nos planos Pro e Max.",
  unavailable: "A geração com IA está indisponível agora. Tente de novo em alguns minutos.",
  rate_limited: "Muitas gerações seguidas. Espere um minuto e tente de novo.",
  refused: "A IA não gerou conteúdo para este tema. Tente reformular.",
  invalid_output: "A IA devolveu uma resposta incompleta. Tente de novo.",
  network: "Não foi possível falar com a IA. Verifique sua conexão e tente de novo.",
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  source_unreadable:
    "Não consegui ler esse link. Confira se a página é pública. Se for vídeo ou página com login, copie o texto ou a transcrição e use \"Colar texto\".",
  law_too_long:
    "Esse trecho da lei é grande demais para uma vez só. Escolha um intervalo de artigos menor, como \"1 a 30\".",
  law_unreadable:
    "Não consegui ler a lei nesse link. Use o link da lei no site do Planalto ou do Senado, ou cole o texto dos artigos.",
  already_generated: "Os cartões dessa disciplina já foram gerados.",
  no_questions: "Não encontrei questões de múltipla escolha nesse material. Confira se enviou a prova certa e se ela está legível.",
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
  // Problemas na chave ou no saldo do servidor não são culpa do usuário.
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return new AiError("unavailable");
  }
  if (e instanceof Anthropic.RateLimitError) return new AiError("unavailable");
  if (e instanceof Anthropic.BadRequestError && isCreditError(e)) return new AiError("unavailable");
  if (e instanceof Anthropic.APIConnectionError) return new AiError("network");
  return new AiError("network");
}
