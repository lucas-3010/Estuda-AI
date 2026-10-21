import type Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { AiError } from "@/lib/ai/errors";
import { SYSTEM_PROMPT, planPrompt, sourcePrompt, stepPrompt } from "@/lib/ai/prompt";
import { AI_MODEL } from "@/lib/billing/plans";
import {
  planJsonSchema,
  planSchema,
  stepJsonSchema,
  stepSchema,
  type GenerateRequest,
  type GenerateResult,
  type Source,
} from "@/lib/validation/plan";

export const MODEL = AI_MODEL;
const MAX_TOKENS = 32000;
const ATTEMPTS = 2;

export type AiClient = Pick<Anthropic, "messages">;

type UserContent = Anthropic.MessageParam["content"];

function textOf(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

/** Material do usuário vem antes da instrução, como recomenda a documentação de PDFs e imagens. */
function sourceBlock(source: Source): Anthropic.ContentBlockParam {
  switch (source.kind) {
    case "text":
      return { type: "text", text: `<material>\n${source.text}\n</material>` };
    case "pdf":
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data: source.data } };
    case "image":
      return { type: "image", source: { type: "base64", media_type: source.mediaType, data: source.data } };
  }
}

async function generateStructured<T>(
  client: AiClient,
  content: UserContent,
  jsonSchema: Record<string, unknown>,
  schema: ZodType<T>,
): Promise<T> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const message = await client.messages
      .stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        output_config: { effort: "medium", format: { type: "json_schema", schema: jsonSchema } },
        messages: [{ role: "user", content }],
      })
      .finalMessage();

    if (message.stop_reason === "refusal") throw new AiError("refused");

    try {
      const parsed = schema.safeParse(JSON.parse(textOf(message)));
      if (parsed.success) return parsed.data;
    } catch {
      // JSON inválido ou cortado: tenta de novo
    }
  }
  throw new AiError("invalid_output");
}

export async function generate(client: AiClient, req: GenerateRequest): Promise<GenerateResult> {
  switch (req.mode) {
    case "plan":
      return generateStructured(client, planPrompt(req.topic, req.level, req.context), planJsonSchema, planSchema);
    case "step":
      return generateStructured(
        client,
        stepPrompt(req.topic, req.level, req.step, req.context),
        stepJsonSchema,
        stepSchema,
      );
    case "source":
      return generateStructured(
        client,
        [sourceBlock(req.source), { type: "text", text: sourcePrompt(req.topic, req.level, req.context) }],
        planJsonSchema,
        planSchema,
      );
  }
}
