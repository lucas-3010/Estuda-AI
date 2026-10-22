// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const from = vi.fn(() => ({ select: () => ({ eq }) }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getClaims }, from }),
}));

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: () => ({ rpc }) }));

const getUserPlan = vi.fn();
vi.mock("@/lib/billing/server", () => ({ getUserPlan: (...args: unknown[]) => getUserPlan(...args) }));

const tutorReply = vi.fn();
vi.mock("@/lib/ai/tutor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/tutor")>()),
  tutorReply: (...args: unknown[]) => tutorReply(...args),
}));

import { POST } from "@/app/api/tutor/route";
import { AiError } from "@/lib/ai/errors";

const CARD_ID = "7f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f";
const card = { front: "Qual a capital da França?", back: "Paris" };

function request(body: unknown) {
  return new Request("http://localhost/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-teste");
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
  maybeSingle.mockReset().mockResolvedValue({ data: card, error: null });
  getUserPlan.mockReset().mockResolvedValue("gratis");
  rpc.mockReset().mockImplementation(async (fn: string) =>
    fn === "claim_answer_check" ? { data: [{ check_id: 7, used: 1 }], error: null } : { data: null, error: null },
  );
  tutorReply.mockReset().mockResolvedValue("Paris é a capital.");
});

const ask = [{ role: "user", content: "Me explica?" }];

describe("POST /api/tutor", () => {
  test("sem sessão responde 401", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await POST(request({ cardId: CARD_ID, messages: ask }));
    expect(res.status).toBe(401);
  });

  test("conversa inválida responde 400", async () => {
    const res = await POST(request({ cardId: CARD_ID, messages: [] }));
    expect(res.status).toBe(400);
  });

  test("cartão de outro usuário responde 404 sem gastar o limite", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(request({ cardId: CARD_ID, messages: ask }));
    expect(res.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  test("usa o limite diário de correções do plano e devolve a resposta", async () => {
    getUserPlan.mockResolvedValue("basico");
    const res = await POST(request({ cardId: CARD_ID, messages: ask }));
    expect(await res.json()).toEqual({ reply: "Paris é a capital." });
    expect(rpc).toHaveBeenCalledWith("claim_answer_check", { p_user: "user-1", p_limit: 25 });
    expect(tutorReply).toHaveBeenCalledWith(expect.anything(), card, ask);
  });

  test("limite esgotado responde 402", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "quota_exceeded" } });
    const res = await POST(request({ cardId: CARD_ID, messages: ask }));
    expect(res.status).toBe(402);
    expect(tutorReply).not.toHaveBeenCalled();
  });

  test("falha da IA devolve o uso reservado", async () => {
    tutorReply.mockRejectedValue(new AiError("refused"));
    const res = await POST(request({ cardId: CARD_ID, messages: ask }));
    expect(res.status).toBe(422);
    expect(rpc).toHaveBeenCalledWith("refund_answer_check", { p_check_id: 7 });
  });
});
