import { createEmptyCard } from "ts-fsrs";
import { toNextState } from "@/lib/srs/fsrs";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { GeneratedPlan, Level } from "@/lib/validation/plan";

export type StepProgress = {
  id: string;
  title: string;
  goal: string;
  position: number;
  counts: { new: number; learning: number; review: number };
};

export type PlanWithProgress = {
  id: string;
  topic: string;
  level: Level;
  createdAt: string;
  steps: StepProgress[];
};

/** Estado FSRS inicial de um cartão novo. */
export function newCardState(now = new Date()) {
  return toNextState(createEmptyCard(now));
}

export async function savePlan(input: {
  topic: string;
  level: Level;
  context?: string;
  plan: GeneratedPlan;
}): Promise<string> {
  const supabase = createBrowserSupabase();

  const { data: planRow, error: planError } = await supabase
    .from("study_plans")
    .insert({ topic: input.topic, level: input.level, context: input.context || null })
    .select("id")
    .single();
  if (planError || !planRow) throw planError ?? new Error("Plano não criado");

  try {
    const { data: steps, error: stepsError } = await supabase
      .from("plan_steps")
      .insert(
        input.plan.steps.map((step, position) => ({
          plan_id: planRow.id,
          position,
          title: step.title,
          goal: step.goal,
        })),
      )
      .select("id, position");
    if (stepsError || !steps) throw stepsError ?? new Error("Etapas não criadas");

    const stepIdByPosition = new Map(steps.map((s) => [s.position, s.id]));
    const initial = newCardState();
    const { error: cardsError } = await supabase.from("cards").insert(
      input.plan.steps.flatMap((step, position) =>
        step.cards.map((card) => ({
          ...initial,
          step_id: stepIdByPosition.get(position) ?? null,
          front: card.front,
          back: card.back,
        })),
      ),
    );
    if (cardsError) throw cardsError;
  } catch (error) {
    // Sem transação no cliente: desfaz o plano (cascade apaga etapas e cartões).
    await supabase.from("study_plans").delete().eq("id", planRow.id);
    throw error;
  }

  return planRow.id;
}

export async function listPlansWithProgress(): Promise<PlanWithProgress[]> {
  const { data, error } = await createBrowserSupabase()
    .from("study_plans")
    .select("id, topic, level, created_at, plan_steps(id, title, goal, position, cards(state))")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((plan) => ({
    id: plan.id,
    topic: plan.topic,
    level: plan.level as Level,
    createdAt: plan.created_at,
    steps: [...(plan.plan_steps ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((step) => {
        const states = (step.cards ?? []).map((c) => c.state);
        return {
          id: step.id,
          title: step.title,
          goal: step.goal,
          position: step.position,
          counts: {
            new: states.filter((s) => s === 0).length,
            learning: states.filter((s) => s === 1 || s === 3).length,
            review: states.filter((s) => s === 2).length,
          },
        };
      }),
  }));
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await createBrowserSupabase().from("study_plans").delete().eq("id", id);
  if (error) throw error;
}
