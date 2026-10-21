import { PLANS, isPlanId, type Plan } from "@/lib/billing/plans";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type Account = {
  plan: Plan;
  status: string;
  periodEnd: string | null;
  hasCustomer: boolean;
  used: number;
  remaining: number;
};

function monthStartUtc(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Plano atual e gerações de IA usadas no mês (a cota zera no dia 1, em UTC). */
export async function getAccount(): Promise<Account> {
  const supabase = createBrowserSupabase();
  const [sub, usage] = await Promise.all([
    supabase.from("subscriptions").select("plan, status, current_period_end, stripe_customer_id").maybeSingle(),
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", monthStartUtc()),
  ]);
  if (sub.error) throw sub.error;
  if (usage.error) throw usage.error;

  const active = sub.data && ["active", "trialing", "past_due"].includes(sub.data.status);
  const plan = PLANS[active && isPlanId(sub.data?.plan) ? sub.data.plan : "gratis"];
  const used = usage.count ?? 0;
  return {
    plan,
    status: sub.data?.status ?? "active",
    periodEnd: sub.data?.current_period_end ?? null,
    hasCustomer: Boolean(sub.data?.stripe_customer_id),
    used,
    remaining: Math.max(0, plan.generations - used),
  };
}

async function redirectFrom(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) throw new Error(data?.code ?? "checkout_failed");
  window.location.assign(data.url);
}

/** Leva ao pagamento do Stripe (ou ao portal, para quem já assina). */
export function startCheckout(plan: string): Promise<void> {
  return redirectFrom("/api/stripe/checkout", { plan });
}

export function openBillingPortal(): Promise<void> {
  return redirectFrom("/api/stripe/portal");
}
