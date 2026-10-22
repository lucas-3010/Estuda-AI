import Anthropic from "@anthropic-ai/sdk";
import { toAiError, type AiErrorCode } from "@/lib/ai/errors";
import { tutorReply, tutorRequestSchema } from "@/lib/ai/tutor";
import { PLANS } from "@/lib/billing/plans";
import { getUserPlan } from "@/lib/billing/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const maxDuration = 60;

const STATUS: Partial<Record<AiErrorCode, number>> = {
  quota_exceeded: 402,
  unavailable: 503,
  rate_limited: 429,
  refused: 422,
  invalid_output: 502,
  network: 502,
  unauthenticated: 401,
};

function fail(code: AiErrorCode) {
  return Response.json({ code }, { status: STATUS[code] ?? 500 });
}

/** Explica um cartão do próprio usuário. Cada mensagem conta como uma correção do dia. */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return fail("unauthenticated");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid_input" }, { status: 400 });
  }
  const parsed = tutorRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ code: "invalid_input" }, { status: 400 });
  const { cardId, messages } = parsed.data;

  // O RLS garante que só o dono lê o cartão.
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("front, back")
    .eq("id", cardId)
    .maybeSingle();
  if (cardError) {
    console.error("Falha ao ler cartão:", cardError);
    return fail("unavailable");
  }
  if (!card) return Response.json({ code: "not_found" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY não definida");
    return fail("unavailable");
  }

  const admin = createAdminSupabase();
  let checkId: number;
  try {
    const plan = PLANS[await getUserPlan(userId)];
    const { data: claim, error } = await admin.rpc("claim_answer_check", {
      p_user: userId,
      p_limit: plan.answerChecks,
    });
    if (error) {
      if (error.message === "quota_exceeded") return fail("quota_exceeded");
      if (error.message === "rate_limited") return fail("rate_limited");
      throw error;
    }
    checkId = claim[0].check_id;
  } catch (e) {
    console.error("Falha ao reservar explicação:", e);
    return fail("unavailable");
  }

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    return Response.json({ reply: await tutorReply(client, card, messages) });
  } catch (e) {
    await admin.rpc("refund_answer_check", { p_check_id: checkId });
    return fail(toAiError(e).code);
  }
}
