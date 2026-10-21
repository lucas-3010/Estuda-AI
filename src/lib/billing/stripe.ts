import "server-only";
import Stripe from "stripe";
import type { PaidPlanId } from "@/lib/billing/plans";
import { createAdminSupabase } from "@/lib/supabase/admin";

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Defina STRIPE_SECRET_KEY nas variáveis de ambiente do servidor");
    stripe = new Stripe(key);
  }
  return stripe;
}

/** IDs dos preços criados no painel do Stripe (um preço mensal por plano). */
export function priceIds(): Record<PaidPlanId, string | undefined> {
  return {
    basico: process.env.STRIPE_PRICE_BASICO,
    pro: process.env.STRIPE_PRICE_PRO,
    max: process.env.STRIPE_PRICE_MAX,
  };
}

export function planFromPrice(priceId: string | undefined): PaidPlanId | null {
  if (!priceId) return null;
  const entry = Object.entries(priceIds()).find(([, id]) => id === priceId);
  return (entry?.[0] as PaidPlanId | undefined) ?? null;
}

/** Endereço público do site, para os links de volta do Stripe. */
export function siteUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
}

/** Grava no banco o estado atual de uma assinatura do Stripe. */
export async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  if (!userId) throw new Error(`Assinatura ${subscription.id} sem metadata.user_id`);

  const item = subscription.items.data[0];
  const plan = planFromPrice(item?.price.id);
  const ended = subscription.status === "canceled" || subscription.status === "incomplete_expired";
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const { error } = await createAdminSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: ended || !plan ? "gratis" : plan,
        status: subscription.status,
        stripe_customer_id: customer,
        stripe_subscription_id: subscription.id,
        current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
