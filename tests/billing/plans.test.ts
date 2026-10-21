import { describe, expect, test } from "vitest";
import { MIN_MARGIN, PAID_PLAN_IDS, PLANS, margin, worstCaseCost } from "@/lib/billing/plans";

describe("preços dos planos", () => {
  test.each(PAID_PLAN_IDS)("plano %s tem lucro mínimo de 30% mesmo usando todas as gerações", (id) => {
    expect(margin(PLANS[id])).toBeGreaterThanOrEqual(MIN_MARGIN);
  });

  test("planos maiores dão mais gerações por real", () => {
    const perReal = PAID_PLAN_IDS.map((id) => PLANS[id].generations / PLANS[id].price);
    expect(perReal).toEqual([...perReal].sort((a, b) => a - b));
  });

  test("custo no pior caso é positivo", () => {
    expect(worstCaseCost(PLANS.basico)).toBeGreaterThan(0);
  });
});
