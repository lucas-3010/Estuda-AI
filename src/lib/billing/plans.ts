// Planos, cotas e o modelo de custos usado para chegar aos preços.
// Todos os valores em reais (BRL). Os custos em dólar são convertidos por USD_BRL.

export const PLAN_IDS = ["gratis", "basico", "pro", "max"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type PaidPlanId = Exclude<PlanId, "gratis">;
export const PAID_PLAN_IDS: PaidPlanId[] = ["basico", "pro", "max"];

/** Modelo de IA usado nas gerações. Haiku 5.5: US$ 0,10 / US$ 0,50 por milhão de tokens. */
export const AI_MODEL = "claude-haiku-5-5";

export type Plan = {
  id: PlanId;
  name: string;
  /** Preço mensal em reais. */
  price: number;
  /** Gerações de IA por mês (plano novo, etapa refeita ou cartões a partir de material). */
  generations: number;
  /** Pode gerar a partir de PDF e foto. Texto colado vale para todos. */
  files: boolean;
  /** Recebe o lembrete diário por e-mail. */
  reminders: boolean;
  highlights: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  gratis: {
    id: "gratis",
    name: "Grátis",
    price: 0,
    generations: 3,
    files: false,
    reminders: false,
    highlights: ["3 gerações com IA por mês", "Revisões ilimitadas", "Texto colado", "Modo quiz e Anki"],
  },
  basico: {
    id: "basico",
    name: "Básico",
    price: 17.9,
    generations: 20,
    files: false,
    reminders: true,
    highlights: ["20 gerações com IA por mês", "Revisões ilimitadas", "Texto colado", "Lembrete diário por e-mail"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 24.9,
    generations: 60,
    files: true,
    reminders: true,
    highlights: [
      "60 gerações com IA por mês",
      "Cartões a partir de PDF e foto",
      "Lembrete diário por e-mail",
      "Tudo do Básico",
    ],
  },
  max: {
    id: "max",
    name: "Max",
    price: 39.9,
    generations: 150,
    files: true,
    reminders: true,
    highlights: ["150 gerações com IA por mês", "Cartões a partir de PDF e foto", "Ideal para concursos", "Tudo do Pro"],
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Premissas de custo. Revise quando os preços dos fornecedores ou o câmbio mudarem;
 * o teste `tests/billing/plans.test.ts` falha se algum plano ficar abaixo da margem mínima.
 */
export const COSTS = {
  usdBrl: 5.5,
  /** Pior caso por geração com Haiku 5.5: ~60 mil tokens de entrada (PDF) + 12 mil de saída ≈ US$ 0,012. */
  perGeneration: 0.1,
  /** Stripe no Brasil (cartão nacional): 3,99% + R$ 0,39 por cobrança. */
  stripePercent: 0.0399,
  stripeFixed: 0.39,
  /** Custos fixos mensais em reais. */
  fixed: {
    vercelPro: 20 * 5.5,
    supabasePro: 25 * 5.5,
    domain: 40 / 12,
  },
  /** Assinantes pagantes sobre os quais o custo fixo é dividido. */
  subscribers: 40,
  /** Gerações gratuitas por assinante (usuários grátis), pagas pelos assinantes. */
  freeGenerationsPerSubscriber: 10,
} as const;

export const MIN_MARGIN = 0.3;

export function fixedCostsPerMonth(): number {
  return Object.values(COSTS.fixed).reduce((sum, value) => sum + value, 0);
}

/** Custo mensal de um assinante que usa todas as gerações do plano. */
export function worstCaseCost(plan: Plan): number {
  const ai = (plan.generations + COSTS.freeGenerationsPerSubscriber) * COSTS.perGeneration;
  const payment = plan.price * COSTS.stripePercent + COSTS.stripeFixed;
  const fixedShare = fixedCostsPerMonth() / COSTS.subscribers;
  return ai + payment + fixedShare;
}

/** Lucro sobre o preço, já descontados IA, Stripe e a parte dos custos fixos. */
export function margin(plan: Plan): number {
  return (plan.price - worstCaseCost(plan)) / plan.price;
}
