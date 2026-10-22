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
  /** Gabarito digitado pela pessoa ao importar uma prova. */
  answerKeyMax: 3000,
  /** Questões lidas por importação: mantém a saída da IA e o custo dentro de uma geração. */
  importQuestionsMax: 40,
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

/** Bancas e formatos de prova do simulado. */
export const BANCAS = {
  enem: "ENEM",
  cebraspe: "Cebraspe (certo ou errado)",
  fgv: "FGV",
  fcc: "FCC",
  vunesp: "Vunesp",
  vestibular: "Vestibular",
  faculdade: "Prova de faculdade",
} as const;
export type Banca = keyof typeof BANCAS;
export const BANCA_IDS = Object.keys(BANCAS) as [Banca, ...Banca[]];

export const EXAM_SIZES = [5, 10] as const;

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Use um link que comece com http ou https");

const cardInput = z.object({
  front: z.string().trim().min(1).max(1000),
  back: z.string().trim().min(1).max(2000),
});

export const generateRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("plan"), ...topicFields }),
  z.object({
    mode: z.literal("step"),
    ...topicFields,
    step: z.object({ title: z.string().trim().min(1).max(200), goal: z.string().trim().min(1).max(500) }),
  }),
  z.object({ mode: z.literal("source"), ...topicFields, source: sourceSchema }),
  z.object({ mode: z.literal("link"), ...topicFields, url: httpUrl }),
  z.object({
    mode: z.literal("reinforce"),
    ...topicFields,
    step: z.object({ title: z.string().trim().min(1).max(200), goal: z.string().trim().min(1).max(500) }),
    missed: z.array(cardInput).min(1).max(15),
  }),
  z.object({
    mode: z.literal("exam"),
    ...topicFields,
    banca: z.enum(BANCA_IDS),
    count: z.union([z.literal(5), z.literal(10)]),
    cards: z.array(cardInput).min(4).max(40),
  }),
  z.object({
    mode: z.literal("import"),
    source: sourceSchema,
    answerKey: z.string().trim().max(LIMITS.answerKeyMax).optional(),
  }),
]);

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** Cartões extras para os assuntos em que a pessoa mais erra. */
export const reinforceSchema = z.object({
  cards: z.array(cardSchema).min(3).max(10),
});
export type GeneratedReinforce = z.infer<typeof reinforceSchema>;

export const examQuestionSchema = z
  .object({
    statement: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(5),
    answer: z.number().int().min(0),
    explanation: z.string().trim().min(1),
  })
  .refine((q) => q.answer < q.options.length, "Resposta fora das alternativas");

export const examSchema = z.object({
  questions: z.array(examQuestionSchema).min(1).max(10),
});
export type GeneratedExam = z.infer<typeof examSchema>;
export type ExamQuestion = z.infer<typeof examQuestionSchema>;

/** Questões reais lidas de uma prova enviada pela pessoa. */
export const importedQuestionSchema = z
  .object({
    number: z.number().int().min(0),
    statement: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(5),
    answer: z.number().int().min(0),
    /** A resposta veio do gabarito (da prova ou digitado), e não da IA. */
    fromKey: z.boolean(),
  })
  .refine((q) => q.answer < q.options.length, "Resposta fora das alternativas");

// Uma questão mal lida (por exemplo, sem alternativas) não derruba a prova inteira: fica de fora.
export const importedExamSchema = z.object({
  title: z.string().trim().min(1).max(200),
  questions: z
    .array(z.unknown())
    .transform((items) =>
      items
        .flatMap((item) => {
          const parsed = importedQuestionSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        })
        .slice(0, LIMITS.importQuestionsMax),
    ),
});
export type ImportedExam = z.infer<typeof importedExamSchema>;
export type ImportedQuestion = z.infer<typeof importedQuestionSchema>;

export type GenerateResult = GeneratedPlan | GeneratedStep | GeneratedReinforce | GeneratedExam | ImportedExam;

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

export const reinforceJsonSchema = {
  type: "object",
  properties: { cards: { type: "array", items: cardJsonSchema } },
  required: ["cards"],
  additionalProperties: false,
} as const;

export const examJsonSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["statement", "options", "answer", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

export const importedExamJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: { type: "integer" },
          statement: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          fromKey: { type: "boolean" },
        },
        required: ["number", "statement", "options", "answer", "fromKey"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "questions"],
  additionalProperties: false,
} as const;
