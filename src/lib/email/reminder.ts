import { PLANS, isPlanId } from "@/lib/billing/plans";

export type ReminderInput = {
  email: string;
  plan: string;
  due_today: number;
  generations_used: number;
};

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** E-mail do lembrete diário: cartões para hoje e gerações restantes no mês. */
export function reminderEmail(input: ReminderInput, siteUrl: string) {
  const plan = PLANS[isPlanId(input.plan) ? input.plan : "gratis"];
  const remaining = Math.max(0, plan.generations - input.generations_used);
  const cards = input.due_today === 1 ? "1 cartão" : `${input.due_today} cartões`;
  const subject = `Você tem ${cards} para revisar hoje`;
  const text = [
    `Bom dia! Você tem ${cards} para revisar hoje no Estuda-AI.`,
    `Ainda restam ${remaining} de ${plan.generations} gerações com IA no seu plano ${plan.name} este mês.`,
    `Revise agora: ${siteUrl}/revisar`,
    "",
    `Para não receber mais este lembrete, desligue em ${siteUrl}/configuracoes`,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#18181b;max-width:480px;margin:auto;padding:24px">
<p style="font-size:18px;font-weight:600">Bom dia! Você tem ${escapeHtml(cards)} para revisar hoje.</p>
<p>Uns minutos agora mantêm sua sequência de dias e fazem a matéria ficar na memória.</p>
<p><a href="${siteUrl}/revisar" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Revisar agora</a></p>
<p style="color:#52525b">Ainda restam <strong>${remaining} de ${plan.generations}</strong> gerações com IA no seu plano ${escapeHtml(plan.name)} este mês.</p>
<p style="color:#a1a1aa;font-size:12px">Não quer mais este e-mail? Desligue o lembrete em <a href="${siteUrl}/configuracoes" style="color:#a1a1aa">Configurações</a>.</p>
</body></html>`;
  return { subject, text, html };
}
