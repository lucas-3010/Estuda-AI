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

const checkAnswer = vi.fn();
vi.mock("@/lib/ai/checkAnswer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/checkAnswer")>()),
  checkAnswer: (...args: unknown[]) => checkAnswer(...args),
}));

import { POST } from "@/app/api/check-answer/route";
import { AiError } from "@/lib/ai/errors";

const CARD_ID = "7f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f";
const card = { front: "Qual a capital da França?", back: "Paris" };

function request(body: unknown) {
  return new Request("http://localhost/api/check-answer", {
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
  checkAnswer.mockReset();
});

describe("POST /api/check-answer", () => {
  test("sem sessão responde 401", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await POST(request({ cardId: CARD_ID, answer: "Lyon" }));
    expect(res.status).toBe(401);
  });

  test("resposta vazia responde 400", async () => {
    const res = await POST(request({ cardId: CARD_ID, answer: "   " }));
    expect(res.status).toBe(400);
  });

  test("cartão de outro usuário (invisível pelo RLS) responde 404", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(request({ cardId: CARD_ID, answer: "Lyon" }));
    expect(res.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  test("resposta idêntica ao verso acerta sem IA e sem gastar o limite", async () => {
    const res = await POST(request({ cardId: CARD_ID, answer: "paris." }));
    expect(await res.json()).toEqual({ correct: true, feedback: "", howTo: "" });
    expect(rpc).not.toHaveBeenCalled();
    expect(checkAnswer).not.toHaveBeenCalled();
  });

  test("reserva com o limite diário do plano e devolve a correção", async () => {
    getUserPlan.mockResolvedValue("pro");
    const result = { correct: false, feedback: "Lyon é outra cidade.", howTo: "Paris." };
    checkAnswer.mockResolvedValue(result);
    const res = await POST(request({ cardId: CARD_ID, answer: "Lyon" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(rpc).toHaveBeenCalledWith("claim_answer_check", { p_user: "user-1", p_limit: 40 });
    expect(checkAnswer).toHaveBeenCalledWith(expect.anything(), card, "Lyon");
  });

  test("limite do dia esgotado responde 402", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "quota_exceeded" } });
    const res = await POST(request({ cardId: CARD_ID, answer: "Lyon" }));
    expect(res.status).toBe(402);
    expect(checkAnswer).not.toHaveBeenCalled();
  });

  test("falha da IA devolve a correção reservada", async () => {
    checkAnswer.mockRejectedValue(new AiError("invalid_output"));
    const res = await POST(request({ cardId: CARD_ID, answer: "Lyon" }));
    expect(res.status).toBe(502);
    expect(rpc).toHaveBeenCalledWith("refund_answer_check", { p_check_id: 7 });
  });
});
