import { AiError, isAiErrorCode } from "@/lib/ai/errors";
import type { GenerateRequest, GenerateResult } from "@/lib/validation/plan";

const STORAGE_KEY = "estuda-ai:anthropic-key";

// A chave fica só no navegador de quem a colou. Todo acesso ao localStorage é
// protegido porque ele pode estar bloqueado (aba anônima, política do navegador).
export function getApiKey(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // sem armazenamento disponível
  }
}

export function clearApiKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sem armazenamento disponível
  }
}

export function maskKey(key: string): string {
  if (key.length <= 12) return "…";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export async function callGenerate<T extends GenerateResult = GenerateResult>(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<T> {
  const key = getApiKey();
  if (!key) throw new AiError("no_key");

  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json", "x-anthropic-key": key },
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
