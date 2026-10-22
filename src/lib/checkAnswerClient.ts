import type { CheckResult } from "@/lib/ai/checkAnswer";

export type CheckFailure = "quota_exceeded" | "rate_limited" | "unauthenticated" | "unavailable";

const FAILURE_MESSAGES: Record<CheckFailure, string> = {
  quota_exceeded: "Você usou todas as correções pela IA de hoje. Compare sua resposta com o verso e avalie.",
  rate_limited: "Muitas correções seguidas. Compare sua resposta com o verso e avalie.",
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  unavailable: "Não foi possível corrigir agora. Compare sua resposta com o verso e avalie.",
};

export class CheckError extends Error {
  constructor(public readonly code: CheckFailure) {
    super(FAILURE_MESSAGES[code]);
    this.name = "CheckError";
  }
}

/** Pede ao servidor a correção da resposta digitada para um cartão. */
export async function requestCheck(cardId: string, answer: string): Promise<CheckResult> {
  let response: Response;
  try {
    response = await fetch("/api/check-answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId, answer }),
    });
  } catch {
    throw new CheckError("unavailable");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = data?.code;
    throw new CheckError(code === "quota_exceeded" || code === "rate_limited" || code === "unauthenticated" ? code : "unavailable");
  }
  return data as CheckResult;
}

/** "8 segundos", "1 min 05 s". */
export function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  if (total < 60) return `${total} ${total === 1 ? "segundo" : "segundos"}`;
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min} min ${String(sec).padStart(2, "0")} s`;
}

/** Nota sugerida: errou = Errei; acertou rápido = Fácil; acertou = Bom. */
export function suggestedRating(correct: boolean, ms: number): 1 | 3 | 4 {
  if (!correct) return 1;
  return ms <= 8000 ? 4 : 3;
}
