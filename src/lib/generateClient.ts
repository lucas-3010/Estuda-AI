import { AiError, isAiErrorCode } from "@/lib/ai/errors";
import type { GenerateRequest, GenerateResult } from "@/lib/validation/plan";

/** Chama a geração com IA. A chave da Anthropic fica só no servidor. */
export async function callGenerate<T extends GenerateResult = GenerateResult>(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new AiError("network");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = data?.code;
    throw new AiError(isAiErrorCode(code) ? code : code === "invalid_input" ? "invalid_output" : "network");
  }
  return data as T;
}
