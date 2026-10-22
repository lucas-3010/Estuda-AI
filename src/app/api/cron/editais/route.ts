import Anthropic from "@anthropic-ai/sdk";
import { searchEdital } from "@/lib/ai/generate";
import { radarEmail } from "@/lib/email/radar";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const maxDuration = 300;

/** Buscas por execução: cada uma é uma pesquisa com IA de alguns segundos. */
const MAX_WATCHES = 40;
const PARALLEL = 4;
/** Cada busca roda no máximo uma vez a cada 20 horas. */
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;
/** Na primeira busca, editais publicados até 60 dias antes também contam. */
const LOOKBACK_DAYS = 60;

// Chamado uma vez por dia pelo Cron da Vercel (vercel.json). Procura na web o edital de cada
// cargo ou órgão acompanhado no radar e avisa a pessoa (na página inicial e por e-mail).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Defina ANTHROPIC_API_KEY" }, { status: 500 });

  const admin = createAdminSupabase();
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const before = new Date(Date.now() - MIN_INTERVAL_MS).toISOString();
  const { data, error } = await admin
    .from("edital_watches")
    .select("id, user_id, query, created_at, checked_at")
    .is("found_at", null)
    .or(`checked_at.is.null,checked_at.lt.${before}`)
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_WATCHES);
  if (error) {
    console.error("Falha ao listar o radar:", error.message);
    return Response.json({ error: "db" }, { status: 500 });
  }

  const watches = data ?? [];
  const found: Array<{ userId: string; query: string; title: string; url: string | null }> = [];
  let checked = 0;

  async function worker() {
    for (let watch = watches.shift(); watch; watch = watches.shift()) {
      const since = new Date(Date.parse(watch.created_at) - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
      const now = new Date().toISOString();
      try {
        const result = await searchEdital(client, watch.query, since);
        const url = /^https?:\/\//i.test(result.url) ? result.url : null;
        const hit = result.found && result.title.length > 0;
        await admin
          .from("edital_watches")
          .update(hit ? { checked_at: now, found_at: now, found_title: result.title, found_url: url } : { checked_at: now })
          .eq("id", watch.id);
        checked += 1;
        if (hit) found.push({ userId: watch.user_id, query: watch.query, title: result.title, url });
      } catch (e) {
        // Falha na pesquisa: marca como verificada para não travar a fila; tenta de novo amanhã.
        console.error("Falha ao pesquisar edital", watch.id, e);
        await admin.from("edital_watches").update({ checked_at: now }).eq("id", watch.id);
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  const sent = await notify(admin, found);
  return Response.json({ checked, found: found.length, sent });
}

type Admin = ReturnType<typeof createAdminSupabase>;

/** E-mail para cada edital encontrado (só se o envio estiver configurado). */
async function notify(admin: Admin, found: Array<{ userId: string; query: string; title: string; url: string | null }>) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !from || !siteUrl || found.length === 0) return 0;

  let sent = 0;
  for (const item of found) {
    const { data } = await admin.auth.admin.getUserById(item.userId);
    const email = data?.user?.email;
    if (!email) continue;
    const { subject, text, html } = radarEmail(item, siteUrl);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject, text, html }),
    });
    if (res.ok) sent += 1;
    else console.error("Resend recusou o aviso do radar:", res.status, await res.text());
  }
  return sent;
}
