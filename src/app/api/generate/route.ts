import Anthropic from "@anthropic-ai/sdk";
import { generate } from "@/lib/ai/generate";
import { toAiError, type AiErrorCode } from "@/lib/ai/errors";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateRequestSchema } from "@/lib/validation/plan";

// Planos grandes com raciocínio adaptativo podem levar alguns minutos.
export const maxDuration = 300;

const STATUS: Record<AiErrorCode, number> = {
  no_key: 400,
  bad_key: 401,
  rate_limited: 429,
  refused: 422,
  invalid_output: 502,
  network: 502,
  unauthenticated: 401,
};

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return Response.json({ code: "unauthenticated" }, { status: 401 });
  }

  // A chave do usuário é usada só nesta requisição: nunca é gravada nem logada.
  const apiKey = request.headers.get("x-anthropic-key")?.trim();
  if (!apiKey) {
    return Response.json({ code: "no_key" }, { status: 400 });
  }

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

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    const result = await generate(client, parsed.data);
    return Response.json(result);
  } catch (e) {
    const error = toAiError(e);
    return Response.json({ code: error.code }, { status: STATUS[error.code] });
  }
}
