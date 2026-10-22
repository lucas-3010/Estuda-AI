// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { exchangeCodeForSession } }),
}));

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  jar.clear();
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /auth/callback", () => {
  // O host visto pelo servidor pode diferir do usado no navegador (127.0.0.1 x localhost);
  // um redirect relativo mantém os cookies de sessão no mesmo host.
  test("login bem-sucedido redireciona para / de forma relativa", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/callback?code=abc"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  test("volta ao baralho compartilhado aberto antes do login", async () => {
    jar.set("estuda_depois_login", encodeURIComponent("/b/abcdefghijklmnop1234"));
    const res = await GET(new Request("http://localhost:3000/auth/callback?code=abc"));
    expect(res.headers.get("location")).toBe("/b/abcdefghijklmnop1234");
    expect(jar.has("estuda_depois_login")).toBe(false);
  });

  test("ignora destinos que não são baralhos compartilhados", async () => {
    jar.set("estuda_depois_login", encodeURIComponent("https://site-malicioso.com"));
    const res = await GET(new Request("http://localhost:3000/auth/callback?code=abc"));
    expect(res.headers.get("location")).toBe("/");
  });

  test("falha volta para o login com aviso", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "expirado" } });
    const res = await GET(new Request("http://localhost:3000/auth/callback?code=abc"));
    expect(res.headers.get("location")).toBe("/login?erro=1");
  });

  test("sem código volta para o login", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/callback"));
    expect(res.headers.get("location")).toBe("/login?erro=1");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
