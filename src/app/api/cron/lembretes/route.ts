import { reminderEmail } from "@/lib/email/reminder";
import { createAdminSupabase } from "@/lib/supabase/admin";

const BATCH = 100;

// Chamado uma vez por dia pelo Cron da Vercel (vercel.json). A Vercel envia
// "Authorization: Bearer <CRON_SECRET>" automaticamente.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !from || !siteUrl) {
    return Response.json({ error: "Defina RESEND_API_KEY, REMINDER_FROM e NEXT_PUBLIC_SITE_URL" }, { status: 500 });
  }

  const { data, error } = await createAdminSupabase().rpc("reminder_candidates");
  if (error) {
    console.error("Falha ao listar lembretes:", error.message);
    return Response.json({ error: "db" }, { status: 500 });
  }

  const emails = (data ?? [])
    .filter((row) => row.due_today > 0)
    .map((row) => {
      const { subject, text, html } = reminderEmail(row, siteUrl);
      return { from, to: [row.email], subject, text, html };
    });

  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(emails.slice(i, i + BATCH)),
    });
    if (res.ok) sent += Math.min(BATCH, emails.length - i);
    else console.error("Resend recusou o lote:", res.status, await res.text());
  }
  return Response.json({ candidates: data?.length ?? 0, sent });
}
