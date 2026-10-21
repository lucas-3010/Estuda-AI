import { z } from "zod";

export const LEVELS = ["iniciante", "intermediario", "avancado"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const LIMITS = {
  topicMin: 3,
  topicMax: 200,
  contextMax: 1000,
  stepsMin: 4,
  stepsMax: 8,
  cardsMin: 5,
  cardsMax: 10,
  sourceTextMax: 60_000,
  /** Tamanho máximo do arquivo em base64 (~3 MB de arquivo). A Vercel aceita até 4,5 MB por requisição. */
  sourceFileMax: 4_000_000,
} as const;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const sourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().trim().min(50).max(LIMITS.sourceTextMax) }),
  z.object({
    kind: z.literal("pdf"),
    data: z.string().min(1).max(LIMITS.sourceFileMax),
  }),
  z.object({
    kind: z.literal("image"),
    mediaType: z.enum(IMAGE_TYPES),
    data: z.string().min(1).max(LIMITS.sourceFileMax),
  }),
]);

export type Source = z.infer<typeof sourceSchema>;

export const cardSchema = z.object({
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
});

export const stepSchema = z.object({
  title: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  cards: z.array(cardSchema).min(LIMITS.cardsMin).max(LIMITS.cardsMax),
});

export const planSchema = z.object({
  steps: z.array(stepSchema).min(LIMITS.stepsMin).max(LIMITS.stepsMax),
});

export type GeneratedCard = z.infer<typeof cardSchema>;
export type GeneratedStep = z.infer<typeof stepSchema>;
export type GeneratedPlan = z.infer<typeof planSchema>;

const topicFields = {
  topic: z.string().trim().min(LIMITS.topicMin).max(LIMITS.topicMax),
  level: z.enum(LEVELS),
  context: z.string().trim().max(LIMITS.contextMax).optional(),
};

export const generateRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("plan"), ...topicFields }),
  z.object({
    mode: z.literal("step"),
    ...topicFields,
    step: z.object({ title: z.string().trim().min(1).max(200), goal: z.string().trim().min(1).max(500) }),
  }),
  z.object({ mode: z.literal("source"), ...topicFields, source: sourceSchema }),
]);

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateResult = GeneratedPlan | GeneratedStep;

// JSON Schema enviado à API. Os limites de quantidade ficam de fora porque a saída
// estruturada não aceita todos eles; a validação completa é feita com zod depois.
const cardJsonSchema = {
  type: "object",
  properties: { front: { type: "string" }, back: { type: "string" } },
  required: ["front", "back"],
  additionalProperties: false,
} as const;

export const stepJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    goal: { type: "string" },
    cards: { type: "array", items: cardJsonSchema },
  },
  required: ["title", "goal", "cards"],
  additionalProperties: false,
} as const;

export const planJsonSchema = {
  type: "object",
  properties: { steps: { type: "array", items: stepJsonSchema } },
  required: ["steps"],
  additionalProperties: false,
} as const;
