import { exportToAnki, type PlainCard } from "@/lib/anki";
import { savePlan } from "@/lib/data/plans";
import { createBrowserSupabase } from "@/lib/supabase/client";

const CARDS_PER_STEP = 50;
const PAGE = 1000;

/** Cria um plano com os cartões importados, em etapas de até 50 cartões. */
export async function importCards(name: string, cards: PlainCard[]): Promise<string> {
  const steps = [];
  for (let i = 0; i < cards.length; i += CARDS_PER_STEP) {
    steps.push({
      title: `Parte ${i / CARDS_PER_STEP + 1}`,
      goal: `Cartões ${i + 1} a ${Math.min(i + CARDS_PER_STEP, cards.length)} importados do Anki`,
      cards: cards.slice(i, i + CARDS_PER_STEP),
    });
  }
  const topic = `Anki: ${name}`.slice(0, 200).padEnd(3, ".");
  return savePlan({ topic, level: "intermediario", plan: { steps } });
}

/** Todos os cartões do usuário no formato de texto do Anki, um baralho por plano. */
export async function exportAllCards(): Promise<{ text: string; count: number }> {
  const supabase = createBrowserSupabase();
  const rows: { front: string; back: string; deck: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("front, back, plan_steps(study_plans(topic))")
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const step = row.plan_steps as { study_plans: { topic: string } | null } | null;
      rows.push({ front: row.front, back: row.back, deck: step?.study_plans?.topic ?? "Avulsos" });
    }
    if (!data || data.length < PAGE) break;
  }
  return { text: exportToAnki(rows), count: rows.length };
}
