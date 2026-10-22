import { createBrowserSupabase } from "@/lib/supabase/client";
import { editalDisciplineSchema, type EditalDiscipline } from "@/lib/validation/plan";

export type Edital = {
  id: string;
  planId: string;
  title: string;
  banca: string | null;
  disciplines: EditalDiscipline[];
  /** Posições das disciplinas que já têm cartões. */
  generated: number[];
};

/** Cria o plano do edital (uma etapa por disciplina) com as edições da pessoa. */
export async function createEditalPlan(
  editalId: string,
  disciplines: EditalDiscipline[],
  examDate: string | null,
): Promise<string> {
  const { data, error } = await createBrowserSupabase().rpc("create_edital_plan", {
    p_edital_id: editalId,
    p_disciplines: disciplines,
    p_exam_date: examDate,
  });
  if (error || !data) throw error ?? new Error("Plano não criado");
  return data;
}

export async function getEditalByPlan(planId: string): Promise<Edital | null> {
  const { data, error } = await createBrowserSupabase()
    .from("editais")
    .select("id, plan_id, title, banca, disciplines, generated")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const disciplines = Array.isArray(data.disciplines)
    ? data.disciplines.flatMap((d) => {
        const parsed = editalDisciplineSchema.safeParse(d);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  return {
    id: data.id,
    planId,
    title: data.title,
    banca: data.banca,
    disciplines,
    generated: data.generated ?? [],
  };
}

/**
 * Peso de cada etapa no edital (a etapa N do plano é a disciplina N do edital).
 * Etapas fora de um edital não aparecem: quem usa trata como peso 1.
 */
export async function editalWeights(plans: Array<{ id: string; steps: Array<{ id: string; position: number }> }>): Promise<Map<string, number>> {
  const { data, error } = await createBrowserSupabase().from("editais").select("plan_id, disciplines").not("plan_id", "is", null);
  if (error) throw error;
  const weights = new Map<string, number>();
  for (const row of data ?? []) {
    const plan = plans.find((p) => p.id === row.plan_id);
    if (!plan || !Array.isArray(row.disciplines)) continue;
    row.disciplines.forEach((d, i) => {
      const parsed = editalDisciplineSchema.safeParse(d);
      const step = plan.steps.find((s) => s.position === i);
      if (parsed.success && step) weights.set(step.id, parsed.data.weight);
    });
  }
  return weights;
}
