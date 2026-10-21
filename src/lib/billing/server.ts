import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isPlanId, type PlanId } from "@/lib/billing/plans";

const ACTIVE = ["active", "trialing", "past_due"];

/** Plano em vigor do usuário. Sem assinatura ativa, é o grátis. */
export async function getUserPlan(userId: string): Promise<PlanId> {
  const { data, error } = await createAdminSupabase()
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !ACTIVE.includes(data.status) || !isPlanId(data.plan)) return "gratis";
  return data.plan;
}
