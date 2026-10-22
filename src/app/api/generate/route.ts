import Anthropic from "@anthropic-ai/sdk";
import { generate, generateEditalCards, generateLawPlan } from "@/lib/ai/generate";
import { AiError, toAiError, type AiErrorCode } from "@/lib/ai/errors";
import { articleKey, fetchLawText, isLawUrl, parseRange, selectArticles, splitArticles } from "@/lib/law";
import { PLANS } from "@/lib/billing/plans";
import { getUserPlan } from "@/lib/billing/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  LAW_LIMITS,
  editalDisciplineSchema,
  generateRequestSchema,
  type GenerateRequest,
  type LawResult,
} from "@/lib/validation/plan";

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
  source_unreadable: 422,
  no_questions: 422,
  law_too_long: 422,
  law_unreadable: 422,
  already_generated: 409,
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
  const client = new Anthropic({ apiKey, maxRetries: 1 });

  // Cartões de uma disciplina do edital: já pagos pela leitura do edital.
  if (req.mode === "edital_step") return editalStep(admin, client, userId, req);

  // Lei seca: baixa e recorta a lei antes de cobrar, para não gastar geração com link errado.
  let lawText = "";
  if (req.mode === "law") {
    const prepared = await prepareLaw(req);
    if (prepared instanceof AiError) return fail(prepared.code);
    lawText = prepared;
  }

  let usageId: number;
  try {
    const plan = PLANS[await getUserPlan(userId)];
    const usesFile =
      (req.mode === "source" || req.mode === "import" || req.mode === "edital") &&
      req.source.kind !== "text" &&
      req.source.kind !== "link";
    if (usesFile && !plan.files) {
      return fail("files_not_allowed");
    }

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
    if (req.mode === "law") {
      const plan = await generateLawPlan(client, lawText, req);
      return Response.json(withSnapshots(plan, lawText, req));
    }
    const result = await generate(client, req);
    if (req.mode === "edital" && "disciplines" in result) {
      // Guarda o edital: a pessoa revisa e depois gera os cartões de cada disciplina por ele.
      const { data: edital, error } = await admin
        .from("editais")
        .insert({ user_id: userId, title: result.title, banca: result.banca || null, disciplines: result.disciplines })
        .select("id")
        .single();
      if (error || !edital) throw error ?? new Error("Edital não salvo");
      return Response.json({ ...result, editalId: edital.id });
    }
    return Response.json(result);
  } catch (e) {
    // A geração falhou: devolve o crédito ao usuário.
    await admin.rpc("refund_generation", { p_usage_id: usageId });
    const error = toAiError(e);
    return fail(error.code);
  }
}

type Admin = ReturnType<typeof createAdminSupabase>;

/** Gera e grava os cartões de uma disciplina do edital, intercalados com as outras disciplinas na fila. */
async function editalStep(
  admin: Admin,
  client: Anthropic,
  userId: string,
  req: Extract<GenerateRequest, { mode: "edital_step" }>,
) {
  const { data: claim, error } = await admin.rpc("claim_edital_step", {
    p_user: userId,
    p_edital_id: req.editalId,
    p_index: req.index,
  });
  if (error) {
    if (error.message === "already_generated") return fail("already_generated");
    if (error.message === "quota_exceeded") return fail("quota_exceeded");
    if (error.message === "not_found" || error.message === "invalid_input") {
      return Response.json({ code: "not_found" }, { status: 404 });
    }
    console.error("Falha ao reservar disciplina do edital:", error);
    return fail("unavailable");
  }
  const row = claim?.[0];
  const discipline = editalDisciplineSchema.safeParse(row?.discipline);
  if (!row || !discipline.success) {
    await admin.rpc("release_edital_step", { p_edital_id: req.editalId, p_index: req.index });
    return fail("unavailable");
  }

  try {
    const { cards } = await generateEditalCards(client, row.title, row.banca, discipline.data);
    // Fila intercalada: o 1º cartão de cada disciplina, depois o 2º de cada uma, e assim por diante.
    const base = Date.parse(row.plan_created_at);
    const { error: insertError } = await admin.from("cards").insert(
      cards.map((c, i) => ({
        user_id: userId,
        step_id: row.step_id,
        front: c.front,
        back: c.back,
        topic: c.topic,
        due: new Date(base + i * row.discipline_count + req.index).toISOString(),
      })),
    );
    if (insertError) throw insertError;
    return Response.json({ stepId: row.step_id, cards: cards.length });
  } catch (e) {
    await admin.rpc("release_edital_step", { p_edital_id: req.editalId, p_index: req.index });
    if (!(e instanceof AiError)) console.error("Falha ao gerar disciplina do edital:", e);
    return fail(toAiError(e).code);
  }
}

/** Texto da lei recortado no intervalo pedido, pronto para a IA. */
async function prepareLaw(req: Extract<GenerateRequest, { mode: "law" }>): Promise<string | AiError> {
  let text: string;
  if (req.source.kind === "link") {
    if (!isLawUrl(req.source.url)) return new AiError("law_unreadable");
    try {
      text = await fetchLawText(req.source.url);
    } catch (e) {
      console.error("Falha ao baixar a lei:", e);
      return new AiError("law_unreadable");
    }
  } else {
    text = req.source.text;
  }
  const articles = splitArticles(text);
  const range = req.articles ? parseRange(req.articles) : null;
  const chosen = selectArticles(articles, range);
  if (range && chosen.length === 0) return new AiError("law_unreadable");
  const body = chosen.length > 0 ? chosen.map((a) => a.text).join("\n") : text;
  if (body.length > LAW_LIMITS.textMax) return new AiError("law_too_long");
  if (body.trim().length < 50) return new AiError("law_unreadable");
  return body;
}

/** Junta ao plano o texto de cada artigo citado nos cartões, para vigiar mudanças na lei. */
function withSnapshots(
  plan: Omit<LawResult, "articles" | "sourceUrl">,
  lawText: string,
  req: Extract<GenerateRequest, { mode: "law" }>,
): LawResult {
  const byKey = new Map(splitArticles(lawText).map((a) => [a.key, a.text]));
  const used = new Set(plan.steps.flatMap((s) => s.cards.map((c) => articleKey(c.law_ref))));
  const articles = [...used]
    .filter((key): key is string => Boolean(key && byKey.has(key)))
    .map((key) => ({ article: key, text: byKey.get(key)!.slice(0, 20000) }));
  return { ...plan, articles, sourceUrl: req.source.kind === "link" ? req.source.url : null };
}
