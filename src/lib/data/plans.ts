import { createEmptyCard } from "ts-fsrs";
import { toNextState } from "@/lib/srs/fsrs";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Level } from "@/lib/validation/plan";

/** Cartão para `save_plan`: origem e artigo são opcionais (lei seca). */
export type PlanCardInput = { front: string; back: string; origin?: "law"; law_ref?: string };
export type PlanInput = { steps: Array<{ title: string; goal: string; cards: PlanCardInput[] }> };

export type StepProgress = {
  id: string;
  title: string;
  goal: string;
  position: number;
  counts: { new: number; learning: number; review: number };
};

export type PlanKind = "topic" | "edital" | "law" | "mistakes";

export type PlanWithProgress = {
  id: string;
  topic: string;
  level: Level;
  kind: PlanKind;
  createdAt: string;
  shareToken: string | null;
  examDate: string | null;
  steps: StepProgress[];
};

/** Estado FSRS inicial de um cartão novo. */
export function newCardState(now = new Date()) {
  return toNextState(createEmptyCard(now));
}

/** Grava plano, etapas e cartões numa única transação (função `save_plan`). */
export async function savePlan(input: {
  topic: string;
  level: Level;
  context?: string;
  plan: PlanInput;
}): Promise<string> {
  const { data, error } = await createBrowserSupabase().rpc("save_plan", {
    p_topic: input.topic,
    p_level: input.level,
    p_context: input.context || null,
    p_steps: input.plan.steps,
  });
  if (error || !data) throw error ?? new Error("Plano não criado");
  return data;
}

export async function listPlansWithProgress(): Promise<PlanWithProgress[]> {
  const { data, error } = await createBrowserSupabase()
    .from("study_plans")
    .select("id, topic, level, kind, created_at, share_token, exam_date, plan_steps(id, title, goal, position, cards(state))")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((plan) => ({
    id: plan.id,
    topic: plan.topic,
    level: plan.level as Level,
    kind: plan.kind as PlanKind,
    createdAt: plan.created_at,
    shareToken: plan.share_token,
    examDate: plan.exam_date,
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

/** Grava ou apaga (null) a data da prova do plano. */
export async function setExamDate(id: string, examDate: string | null): Promise<void> {
  const { error } = await createBrowserSupabase().from("study_plans").update({ exam_date: examDate }).eq("id", id);
  if (error) throw error;
}

/** Marca o tipo do plano (por exemplo, lei seca) depois de salvo com `save_plan`. */
export async function setPlanKind(id: string, kind: PlanKind): Promise<void> {
  const { error } = await createBrowserSupabase().from("study_plans").update({ kind }).eq("id", id);
  if (error) throw error;
}
