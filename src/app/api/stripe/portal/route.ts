import { getStripe, siteUrl } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

// Abre o portal do cliente do Stripe: trocar de plano, cartão ou cancelar.
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return Response.json({ code: "unauthenticated" }, { status: 401 });

  const { data: sub } = await createAdminSupabase()
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sub?.stripe_customer_id) return Response.json({ code: "no_subscription" }, { status: 404 });

  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl(request)}/configuracoes`,
  });
  return Response.json({ url: portal.url });
}
