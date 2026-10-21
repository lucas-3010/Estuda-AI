import { afterEach, describe, expect, test, vi } from "vitest";
import { clearApiKey, getApiKey, maskKey, setApiKey } from "@/lib/apiKey";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("chave da Anthropic no navegador", () => {
  test("salva, lê e remove", () => {
    setApiKey("  sk-ant-abc123xyz9 ");
    expect(getApiKey()).toBe("sk-ant-abc123xyz9");
    clearApiKey();
    expect(getApiKey()).toBeNull();
  });

  test("maskKey mostra só o começo e o fim", () => {
    expect(maskKey("sk-ant-abc123xyz9")).toBe("sk-ant-…xyz9");
  });

  test("getApiKey devolve null quando o localStorage falha", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(getApiKey()).toBeNull();
  });

  test("setApiKey não quebra quando o localStorage falha", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => setApiKey("sk-ant-x")).not.toThrow();
  });
});

describe("callGenerate", () => {
  test("envia a chave no header e devolve o JSON", async () => {
    setApiKey("sk-ant-teste");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { callGenerate } = await import("@/lib/apiKey");
    await expect(callGenerate({ mode: "ping" })).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init!.headers).get("x-anthropic-key")).toBe("sk-ant-teste");
  });

  test("sem chave lança no_key sem chamar o servidor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { callGenerate } = await import("@/lib/apiKey");
    await expect(callGenerate({ mode: "ping" })).rejects.toMatchObject({ code: "no_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("erro do servidor vira AiError com o código", async () => {
    setApiKey("sk-ant-teste");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "bad_key" }), { status: 401 }),
    );
    const { callGenerate } = await import("@/lib/apiKey");
    await expect(callGenerate({ mode: "ping" })).rejects.toMatchObject({ code: "bad_key" });
  });

  test("falha de rede vira network", async () => {
    setApiKey("sk-ant-teste");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const { callGenerate } = await import("@/lib/apiKey");
    await expect(callGenerate({ mode: "ping" })).rejects.toMatchObject({ code: "network" });
  });
});
