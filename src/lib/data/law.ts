import { createBrowserSupabase } from "@/lib/supabase/client";
import type { LawArticleSnapshot } from "@/lib/validation/plan";

export type LawArticleRow = {
  id: string;
  law_name: string;
  article: string;
  source_url: string | null;
  snapshot: string;
  current_snapshot: string | null;
  changed_at: string | null;
  checked_at: string | null;
};

/** Guarda o texto dos artigos citados nos cartões, para a verificação diária comparar. */
export async function saveLawArticles(
  planId: string,
  lawName: string,
  sourceUrl: string | null,
  articles: LawArticleSnapshot[],
): Promise<void> {
  if (articles.length === 0) return;
  const { error } = await createBrowserSupabase()
    .from("law_articles")
    .insert(
      articles.map((a) => ({ plan_id: planId, law_name: lawName, source_url: sourceUrl, article: a.article, snapshot: a.text })),
    );
  if (error) throw error;
}

export async function listLawArticles(planId: string): Promise<LawArticleRow[]> {
  const { data, error } = await createBrowserSupabase()
    .from("law_articles")
    .select("id, law_name, article, source_url, snapshot, current_snapshot, changed_at, checked_at")
    .eq("plan_id", planId)
    .order("article");
  if (error) throw error;
  return data ?? [];
}

/** "Já revisei os cartões": o texto novo vira a referência e o aviso some. */
export async function acknowledgeLawChange(id: string): Promise<void> {
  const { error } = await createBrowserSupabase().rpc("acknowledge_law_change", { p_id: id });
  if (error) throw error;
}
