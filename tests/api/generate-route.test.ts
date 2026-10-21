// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getClaims } }),
}));

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: () => ({ rpc }) }));

const getUserPlan = vi.fn();
vi.mock("@/lib/billing/server", () => ({ getUserPlan: (...args: unknown[]) => getUserPlan(...args) }));

const generate = vi.fn();
vi.mock("@/lib/ai/generate", () => ({ generate: (...args: unknown[]) => generate(...args) }));

import { POST } from "@/app/api/generate/route";
import { AiError } from "@/lib/ai/errors";

const SERVER_KEY = "sk-ant-api03-SEGREDO-do-servidor-123";
const validBody = { mode: "plan", topic: "Índices no PostgreSQL", level: "iniciante" };

function request(body: unknown) {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", SERVER_KEY);
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
  getUserPlan.mockReset().mockResolvedValue("gratis");
  rpc.mockReset().mockImplementation(async (fn: string) =>
    fn === "claim_generation" ? { data: [{ usage_id: 42, used: 1 }], error: null } : { data: null, error: null },
  );
  generate.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/generate", () => {
  test("sem sessão responde 401 unauthenticated", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await POST(request(validBody));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "unauthenticated" });
    expect(generate).not.toHaveBeenCalled();
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

  test("sem chave no servidor responde 503 sem gastar a cota", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(request(validBody));
    expect(res.status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  test("reserva uma geração com a cota do plano e devolve o resultado", async () => {
    getUserPlan.mockResolvedValue("pro");
    const plan = { steps: [] };
    generate.mockResolvedValue(plan);
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(plan);
    expect(rpc).toHaveBeenCalledWith("claim_generation", { p_user: "user-1", p_kind: "plan", p_limit: 60 });
  });

  test("cota esgotada responde 402 quota_exceeded", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "quota_exceeded" } });
    const res = await POST(request(validBody));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ code: "quota_exceeded" });
    expect(generate).not.toHaveBeenCalled();
  });

  test("muitas gerações por minuto responde 429", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "rate_limited" } });
    const res = await POST(request(validBody));
    expect(res.status).toBe(429);
  });

  test("plano grátis não gera a partir de PDF", async () => {
    const res = await POST(request({ ...validBody, mode: "source", source: { kind: "pdf", data: "JVBERi0x" } }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: "files_not_allowed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  test("plano grátis gera a partir de texto colado", async () => {
    generate.mockResolvedValue({ steps: [] });
    const res = await POST(
      request({ ...validBody, mode: "source", source: { kind: "text", text: "Conteúdo de estudo. ".repeat(5) } }),
    );
    expect(res.status).toBe(200);
  });

  test.each([
    ["unavailable", 503],
    ["refused", 422],
    ["invalid_output", 502],
    ["network", 502],
  ] as const)("erro %s responde %i e devolve a geração", async (code, status) => {
    generate.mockRejectedValue(new AiError(code));
    const res = await POST(request(validBody));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ code });
    expect(rpc).toHaveBeenCalledWith("refund_generation", { p_usage_id: 42 });
  });

  test("a chave do servidor nunca aparece em logs nem na resposta", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    generate.mockRejectedValue(new Error(`falha inesperada com ${SERVER_KEY}`));
    const res = await POST(request(validBody));
    expect(res.status).toBe(502);
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(SERVER_KEY);
    expect(JSON.stringify(await res.json())).not.toContain(SERVER_KEY);
    spies.forEach((s) => s.mockRestore());
  });
});
