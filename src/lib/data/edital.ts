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
