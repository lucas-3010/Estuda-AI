import Anthropic from "@anthropic-ai/sdk";
import { generate } from "@/lib/ai/generate";
import { toAiError, type AiErrorCode } from "@/lib/ai/errors";
import { PLANS } from "@/lib/billing/plans";
import { getUserPlan } from "@/lib/billing/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateRequestSchema } from "@/lib/validation/plan";

// Planos grandes e PDFs podem levar alguns minutos.
export const maxDuration = 300;

const STATUS: Record<AiErrorCode, number> = {
  quota_exceeded: 402,
  files_not_allowed: 403,
  unavailable: 503,
  rate_limited: 429,
  refused: 422,
  invalid_output: 502,
  network: 502,
  unauthenticated: 401,
};

function fail(code: AiErrorCode) {
  return Response.json({ code }, { status: STATUS[code] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return fail("unauthenticated");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid_input", issues: [] }, { status: 400 });
  }
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ code: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const req = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY não definida");
    return fail("unavailable");
  }

  const admin = createAdminSupabase();
  let usageId: number;
  try {
    const plan = PLANS[await getUserPlan(userId)];
    if (req.mode === "source" && req.source.kind !== "text" && !plan.files) return fail("files_not_allowed");

    // Reserva a geração antes de chamar a IA: pedidos simultâneos não passam da cota.
    const { data: claim, error } = await admin.rpc("claim_generation", {
      p_user: userId,
      p_kind: req.mode,
      p_limit: plan.generations,
    });
    if (error) {
      if (error.message === "quota_exceeded") return fail("quota_exceeded");
      if (error.message === "rate_limited") return fail("rate_limited");
      throw error;
    }
    usageId = claim[0].usage_id;
  } catch (e) {
    console.error("Falha ao reservar geração:", e);
    return fail("unavailable");
  }

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    const result = await generate(client, req);
    return Response.json(result);
  } catch (e) {
    // A geração falhou: devolve o crédito ao usuário.
    await admin.rpc("refund_generation", { p_usage_id: usageId });
    const error = toAiError(e);
    return fail(error.code);
  }
}
