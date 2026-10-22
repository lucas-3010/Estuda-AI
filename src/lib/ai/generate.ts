import type Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { AiError } from "@/lib/ai/errors";
import {
  SYSTEM_PROMPT,
  editalPrompt,
  editalStepPrompt,
  examPrompt,
  importPrompt,
  lawPrompt,
  linkPrompt,
  planPrompt,
  reinforcePrompt,
  sourcePrompt,
  stepPrompt,
} from "@/lib/ai/prompt";
import { AI_MODEL } from "@/lib/billing/plans";
import {
  editalCardsJsonSchema,
  editalCardsSchema,
  editalJsonSchema,
  editalSchema,
  lawPlanJsonSchema,
  lawPlanSchema,
  examJsonSchema,
  examSchema,
  importedExamJsonSchema,
  importedExamSchema,
  planJsonSchema,
  planSchema,
  reinforceJsonSchema,
  reinforceSchema,
  stepJsonSchema,
  stepSchema,
  type EditalDiscipline,
  type GeneratedEdital,
  type GeneratedLawPlan,
  type GenerateRequest,
  type GenerateResult,
  type Source,
} from "@/lib/validation/plan";

export const MODEL = AI_MODEL;
const MAX_TOKENS = 32000;
const ATTEMPTS = 2;
/** Continuações quando a API pausa um turno longo de ferramenta de servidor. */
const MAX_CONTINUATIONS = 3;

/** Leitura de páginas feita pelos servidores da Anthropic: nosso servidor nunca acessa o link. */
export const WEB_FETCH_TOOL = {
  type: "web_fetch_20250910",
  name: "web_fetch",
  max_uses: 2,
  max_content_tokens: 50_000,
} as const satisfies Anthropic.WebFetchTool20250910;

export type AiClient = Pick<Anthropic, "messages">;

type UserContent = Anthropic.MessageParam["content"];

function textOf(message: { content: Array<{ type: string; text?: string }> }): string {
  // Com ferramentas, a IA pode escrever antes de usá-las: o JSON vem depois do último resultado.
  const lastTool = message.content.findLastIndex((block) => block.type.endsWith("_tool_result"));
  return message.content
    .slice(lastTool + 1)
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

/** A página do link foi lida com sucesso pelo menos uma vez. */
function fetchedPage(blocks: Anthropic.ContentBlock[]): boolean {
  return blocks.some((block) => block.type === "web_fetch_tool_result" && block.content.type === "web_fetch_result");
}

async function generateStructured<T>(
  client: AiClient,
  content: UserContent,
  jsonSchema: Record<string, unknown>,
  schema: ZodType<T>,
  options: { webFetch?: boolean } = {},
): Promise<T> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content }];
    const seen: Anthropic.ContentBlock[] = [];
    let message: Anthropic.Message;
    for (let turn = 0; ; turn++) {
      message = await client.messages
        .stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          output_config: { effort: "medium", format: { type: "json_schema", schema: jsonSchema } },
          ...(options.webFetch ? { tools: [WEB_FETCH_TOOL] } : {}),
          messages,
        })
        .finalMessage();
      seen.push(...message.content);
      if (message.stop_reason !== "pause_turn" || turn >= MAX_CONTINUATIONS) break;
      messages.push({ role: "assistant", content: message.content });
    }

    if (message.stop_reason === "refusal") throw new AiError("refused");
    // Sem a página lida, a IA inventaria o conteúdo a partir do tema.
    if (options.webFetch && !fetchedPage(seen)) throw new AiError("source_unreadable");

    try {
      const parsed = schema.safeParse(JSON.parse(textOf(message)));
      if (parsed.success) return parsed.data;
    } catch {
      // JSON inválido ou cortado: tenta de novo
    }
  }
  throw new AiError("invalid_output");
}

/** Pedidos que a rota resolve com passos próprios (banco ou download da lei). */
type RouteOnly = "edital_step" | "law";
export type DirectRequest = Exclude<GenerateRequest, { mode: RouteOnly }>;

/** Cartões de uma disciplina do edital, cada um com o tópico que cobre. */
export function generateEditalCards(
  client: AiClient,
  title: string,
  banca: string | null,
  discipline: EditalDiscipline,
) {
  return generateStructured(
    client,
    editalStepPrompt(title, banca, discipline),
    editalCardsJsonSchema,
    editalCardsSchema,
  );
}

/** Plano de lei seca a partir do texto (já baixado e recortado) da lei. */
export function generateLawPlan(
  client: AiClient,
  lawText: string,
  req: Extract<GenerateRequest, { mode: "law" }>,
): Promise<GeneratedLawPlan> {
  return generateStructured(
    client,
    [
      { type: "text", text: `<lei>\n${lawText}\n</lei>` },
      { type: "text", text: lawPrompt(req.lawName, req.level, req.banca, req.articles) },
    ],
    lawPlanJsonSchema,
    lawPlanSchema,
  );
}

export async function generate(client: AiClient, req: DirectRequest): Promise<GenerateResult | GeneratedEdital> {
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
    case "link":
      return generateStructured(
        client,
        linkPrompt(req.url, req.topic, req.level, req.context),
        planJsonSchema,
        planSchema,
        { webFetch: true },
      );
    case "reinforce":
      return generateStructured(
        client,
        reinforcePrompt(req.topic, req.level, req.step, req.missed, req.context),
        reinforceJsonSchema,
        reinforceSchema,
      );
    case "exam":
      return generateStructured(
        client,
        examPrompt(req.topic, req.level, req.banca, req.count, req.cards),
        examJsonSchema,
        examSchema,
      );
    case "edital":
      return req.source.kind === "link"
        ? generateStructured(client, editalPrompt(req.banca, req.source.url), editalJsonSchema, editalSchema, {
            webFetch: true,
          })
        : generateStructured(
            client,
            [sourceBlock(req.source), { type: "text", text: editalPrompt(req.banca) }],
            editalJsonSchema,
            editalSchema,
          );
    case "import": {
      const exam = await generateStructured(
        client,
        [sourceBlock(req.source), { type: "text", text: importPrompt(req.answerKey) }],
        importedExamJsonSchema,
        importedExamSchema,
      );
      if (exam.questions.length === 0) throw new AiError("no_questions");
      return exam;
    }
  }
}
