import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sharedPlanSchema, type SharedPlan } from "@/lib/share";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/** Lê um baralho compartilhado como visitante: não usa a sessão de ninguém. */
export async function getSharedPlan(token: string): Promise<SharedPlan | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const { url, key } = supabaseEnv();
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("shared_plan", { p_token: token });
  if (error) throw error;
  const parsed = sharedPlanSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
