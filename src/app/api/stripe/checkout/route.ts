import { z } from "zod";
import { PAID_PLAN_IDS } from "@/lib/billing/plans";
import { getStripe, priceIds, siteUrl } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const bodySchema = z.object({ plan: z.enum(PAID_PLAN_IDS) });

// Cria a página de pagamento do Stripe para o plano escolhido.
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : undefined;
  if (!userId) return Response.json({ code: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "invalid_input" }, { status: 400 });

  const price = priceIds()[parsed.data.plan];
  if (!price) {
    console.error(`Preço do plano ${parsed.data.plan} não configurado`);
    return Response.json({ code: "unavailable" }, { status: 503 });
  }

  const stripe = getStripe();
  const admin = createAdminSupabase();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id, plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  const base = siteUrl(request);
  // Quem já assina troca de plano ou cancela pelo portal do cliente, sem cobrança dupla.
  if (sub?.stripe_customer_id && sub.plan !== "gratis" && sub.status !== "canceled") {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${base}/configuracoes`,
    });
    return Response.json({ url: portal.url });
  }

  let customerId = sub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: userId } },
    allow_promotion_codes: true,
    locale: "pt-BR",
    success_url: `${base}/?assinatura=ok`,
    cancel_url: `${base}/precos`,
  });
  return Response.json({ url: session.url });
}
