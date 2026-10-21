import type Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { AiError } from "@/lib/ai/errors";
import { SYSTEM_PROMPT, planPrompt, stepPrompt } from "@/lib/ai/prompt";
import {
  planJsonSchema,
  planSchema,
  stepJsonSchema,
  stepSchema,
  type GenerateRequest,
  type GenerateResult,
} from "@/lib/validation/plan";

export const MODEL = "claude-opus-5-5";
const MAX_TOKENS = 32000;
const ATTEMPTS = 2;

export type AiClient = Pick<Anthropic, "beta">;

type StreamParams = Parameters<Anthropic["beta"]["messages"]["stream"]>[0];

function baseParams(): Omit<StreamParams, "messages" | "max_tokens"> {
  return {
    model: MODEL,
    // Recusas por política são refeitas automaticamente num modelo alternativo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
  };
}

function textOf(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

async function generateStructured<T>(
  client: AiClient,
  prompt: string,
  jsonSchema: Record<string, unknown>,
  schema: ZodType<T>,
): Promise<T> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const message = await client.beta.messages
      .stream({
        ...baseParams(),
        max_tokens: MAX_TOKENS,
        output_config: { effort: "medium", format: { type: "json_schema", schema: jsonSchema } },
        messages: [{ role: "user", content: prompt }],
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
    case "ping": {
      const message = await client.beta.messages
        .stream({
          ...baseParams(),
          max_tokens: 1024,
          output_config: { effort: "low" },
          messages: [{ role: "user", content: "Responda apenas: ok" }],
        })
        .finalMessage();
      if (message.stop_reason === "refusal") throw new AiError("refused");
      return { ok: true };
    }
    case "plan":
      return generateStructured(
        client,
        planPrompt(req.topic, req.level, req.context),
        planJsonSchema,
        planSchema,
      );
    case "step":
      return generateStructured(
        client,
        stepPrompt(req.topic, req.level, req.step, req.context),
        stepJsonSchema,
        stepSchema,
      );
  }
}
