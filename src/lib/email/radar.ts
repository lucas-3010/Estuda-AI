export type RadarEmailInput = { query: string; title: string; url: string | null };

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Aviso do radar de editais: saiu o edital que a pessoa acompanha. */
export function radarEmail(input: RadarEmailInput, siteUrl: string) {
  const planUrl = `${siteUrl}/novo?edital=${encodeURIComponent(input.url ?? "")}`;
  const subject = `Saiu o edital: ${input.title}`;
  const text = [
    `O radar de editais do Estuda-AI encontrou o edital que você acompanha (${input.query}):`,
    input.title,
    input.url ? `Edital: ${input.url}` : null,
    "",
    `Monte o plano até a prova: ${planUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#18181b;max-width:480px;margin:auto;padding:24px">
<p style="color:#52525b">📡 Radar de editais · ${escapeHtml(input.query)}</p>
<p style="font-size:18px;font-weight:600">Saiu o edital: ${escapeHtml(input.title)}</p>
${input.url ? `<p><a href="${escapeHtml(input.url)}" style="color:#4f46e5">Abrir o edital</a></p>` : ""}
<p>A IA lê o edital, separa as disciplinas por peso e monta os cartões até a data da prova.</p>
<p><a href="${escapeHtml(planUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Montar o plano</a></p>
</body></html>`;
  return { subject, text, html };
}
