import { listDueCandidates } from "@/lib/data/cards";
import { editalWeights } from "@/lib/data/edital";
import { listPlansWithProgress, type PlanWithProgress } from "@/lib/data/plans";
import { newCardsStudiedToday } from "@/lib/data/reviews";
import { getSettings, userTimeZone, type Settings } from "@/lib/data/settings";
import { todayIn } from "@/lib/exam";
import { buildQueue, vesperaPlans, type Vespera } from "@/lib/srs/queue";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { CardRow } from "@/lib/supabase/database.types";

export type Today = {
  queue: CardRow[];
  settings: Settings;
  plans: PlanWithProgress[];
  /** Peso de cada etapa no edital (etapas sem edital ficam de fora). */
  weights: Map<string, number>;
  /** Planos com a prova nos próximos dias (modo véspera ligado). */
  vespera: PlanWithProgress[];
};

/** Cartões já estudados dos planos dados, para o modo véspera adiantar os mais fracos. */
async function studiedCardsOf(plans: PlanWithProgress[]): Promise<CardRow[]> {
  const stepIds = plans.flatMap((p) => p.steps.map((s) => s.id));
  if (stepIds.length === 0) return [];
  const { data, error } = await createBrowserSupabase()
    .from("cards")
    .select("*")
    .in("step_id", stepIds)
    .neq("state", 0)
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}

/** A fila de hoje (com o modo véspera, quando há prova chegando), as configurações e os planos. */
export async function loadToday(planId?: string, now = new Date()): Promise<Today> {
  const timeZone = userTimeZone();
  const [candidates, settings, studied, plans] = await Promise.all([
    listDueCandidates(planId, now),
    getSettings(),
    newCardsStudiedToday(timeZone),
    listPlansWithProgress(),
  ]);
  // Pesos e véspera são extras: se falharem, a fila normal continua funcionando.
  const weights = await editalWeights(plans).catch(() => new Map<string, number>());
  const vespera = vesperaPlans(plans, todayIn(timeZone, now)).filter((p) => !planId || p.id === planId);
  let config: Vespera | null = null;
  if (vespera.length > 0) {
    const extra = await studiedCardsOf(vespera).catch(() => []);
    config = {
      steps: new Map(
        vespera.flatMap((p) =>
          p.steps.map((s) => [s.id, { weight: weights.get(s.id) ?? 1, exam: new Date(`${p.examDate}T12:00:00`) }] as const),
        ),
      ),
      extra,
      retention: settings.desiredRetention,
      limit: settings.newCardsPerDay,
    };
  }
  const queue = buildQueue(candidates, {
    now,
    timeZone,
    newPerDay: settings.newCardsPerDay,
    newStudiedToday: studied,
    vespera: config,
  });
  return { queue, settings, plans, weights, vespera };
}
