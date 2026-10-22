import type { TutorTurn } from "@/lib/ai/tutor";

export type TutorFailure = "quota_exceeded" | "rate_limited" | "unauthenticated" | "unavailable";

const FAILURE_MESSAGES: Record<TutorFailure, string> = {
  quota_exceeded: "Você usou todas as correções e explicações da IA de hoje. Amanhã tem mais.",
  rate_limited: "Muitas perguntas seguidas. Espere um minuto e tente de novo.",
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  unavailable: "O tutor está indisponível agora. Tente de novo em alguns minutos.",
};

export class TutorError extends Error {
  constructor(public readonly code: TutorFailure) {
    super(FAILURE_MESSAGES[code]);
    this.name = "TutorError";
  }
}

/** Pede ao servidor a próxima resposta do tutor sobre um cartão. */
export async function requestTutor(cardId: string, messages: TutorTurn[]): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId, messages }),
    });
  } catch {
    throw new TutorError("unavailable");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.reply !== "string") {
    const code = data?.code;
    throw new TutorError(code === "quota_exceeded" || code === "rate_limited" || code === "unauthenticated" ? code : "unavailable");
  }
  return data.reply;
}
