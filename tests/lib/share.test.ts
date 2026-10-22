import { describe, expect, test } from "vitest";
import { SHARE_PATH, newShareToken, shareUrl } from "@/lib/share";

describe("link compartilhado", () => {
  test("código aleatório com o formato aceito pelo banco", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(a).not.toBe(b);
    expect(SHARE_PATH.test(new URL(shareUrl("https://estuda.ai", a)).pathname)).toBe(true);
  });

  test("só aceita caminhos de baralho como destino depois do login", () => {
    expect(SHARE_PATH.test("/b/abcdefghijklmnop1234")).toBe(true);
    expect(SHARE_PATH.test("//site-malicioso.com")).toBe(false);
    expect(SHARE_PATH.test("/configuracoes")).toBe(false);
  });
});
