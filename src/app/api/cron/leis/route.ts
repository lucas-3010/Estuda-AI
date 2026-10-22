import { fetchLawText, splitArticles } from "@/lib/law";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const maxDuration = 300;

/** Leis baixadas por execução: cada uma pode levar alguns segundos no site do Planalto. */
const MAX_SOURCES = 40;

const MISSING = "(Este artigo não aparece mais no texto atual da lei. Ele pode ter sido revogado ou renumerado.)";

// Chamado uma vez por dia pelo Cron da Vercel (vercel.json). Compara o texto de cada artigo
// usado nos cartões de lei seca com o texto atual no site oficial e marca os que mudaram.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("law_articles")
    .select("id, source_url, article, snapshot, current_snapshot, checked_at")
    .not("source_url", "is", null)
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(5000);
  if (error) {
    console.error("Falha ao listar artigos:", error.message);
    return Response.json({ error: "db" }, { status: 500 });
  }

  const bySource = new Map<string, typeof data>();
  for (const row of data ?? []) {
    const list = bySource.get(row.source_url!) ?? [];
    list.push(row);
    bySource.set(row.source_url!, list);
  }

  let checked = 0;
  let changed = 0;
  for (const [url, rows] of [...bySource].slice(0, MAX_SOURCES)) {
    let articles: Map<string, string>;
    try {
      articles = new Map(splitArticles(await fetchLawText(url)).map((a) => [a.key, a.text]));
    } catch (e) {
      console.error("Falha ao baixar a lei", url, e);
      continue;
    }
    // Página sem nenhum artigo: provavelmente fora do ar ou mudou de formato. Não gera aviso falso.
    if (articles.size === 0) continue;

    const now = new Date().toISOString();
    for (const row of rows) {
      const text = articles.get(row.article) ?? MISSING;
      const isNew = text !== row.snapshot && text !== row.current_snapshot;
      const { error: updateError } = await admin
        .from("law_articles")
        .update(isNew ? { current_snapshot: text, changed_at: now, checked_at: now } : { checked_at: now })
        .eq("id", row.id);
      if (updateError) console.error("Falha ao atualizar artigo", row.id, updateError.message);
      checked += 1;
      if (isNew) changed += 1;
    }
  }

  return Response.json({ sources: Math.min(bySource.size, MAX_SOURCES), checked, changed });
}
