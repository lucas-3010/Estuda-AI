// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getClaims } }),
}));

const generate = vi.fn();
vi.mock("@/lib/ai/generate", () => ({ generate: (...args: unknown[]) => generate(...args) }));

import { POST } from "@/app/api/generate/route";
import { AiError } from "@/lib/ai/errors";

const KEY = "sk-ant-api03-SEGREDO-de-teste-123";
const validBody = { mode: "plan", topic: "Índices no PostgreSQL", level: "iniciante" };

function request(body: unknown, key: string | null = KEY) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers["x-anthropic-key"] = key;
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
  generate.mockReset();
});

describe("POST /api/generate", () => {
  test("sem sessão responde 401 unauthenticated", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "unauthenticated" });
    expect(generate).not.toHaveBeenCalled();
  });

  test("sem chave responde 400 no_key", async () => {
    const res = await POST(request(validBody, null));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ code: "no_key" });
  });

  test("corpo inválido responde 400 invalid_input", async () => {
    const res = await POST(request({ mode: "plan", topic: "a", level: "iniciante" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_input");
  });

  test("JSON malformado responde 400 invalid_input", async () => {
    const res = await POST(request("{nao-e-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_input");
  });

  test("sucesso devolve o resultado da IA", async () => {
    const plan = { steps: [] };
    generate.mockResolvedValue(plan);
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(plan);
  });

  test.each([
    ["bad_key", 401],
    ["rate_limited", 429],
    ["refused", 422],
    ["invalid_output", 502],
    ["network", 502],
  ] as const)("erro %s responde %i", async (code, status) => {
    generate.mockRejectedValue(new AiError(code));
    const res = await POST(request(validBody));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ code });
  });

  test("a chave nunca aparece em logs, nem quando há erro", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    generate.mockRejectedValue(new Error(`falha inesperada com ${KEY}`));
    const res = await POST(request(validBody));
    expect(res.status).toBe(502);
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(KEY);
    expect(JSON.stringify(await res.json())).not.toContain(KEY);
    spies.forEach((s) => s.mockRestore());
  });
});
