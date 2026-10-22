import { newShareToken } from "@/lib/share";
import { createBrowserSupabase } from "@/lib/supabase/client";

/** Cria (ou mantém) o link público do plano e devolve o código. */
export async function enableSharing(planId: string): Promise<string> {
  const token = newShareToken();
  const { data, error } = await createBrowserSupabase()
    .from("study_plans")
    .update({ share_token: token })
    .eq("id", planId)
    .select("share_token")
    .single();
  if (error || !data?.share_token) throw error ?? new Error("Link não criado");
  return data.share_token;
}

/** Desativa o link: quem tinha o endereço não vê mais o baralho. */
export async function disableSharing(planId: string): Promise<void> {
  const { error } = await createBrowserSupabase().from("study_plans").update({ share_token: null }).eq("id", planId);
  if (error) throw error;
}

/** Copia o baralho compartilhado para a conta de quem está logado. */
export async function copySharedPlan(token: string): Promise<string> {
  const { data, error } = await createBrowserSupabase().rpc("copy_shared_plan", { p_token: token });
  if (error || !data) throw error ?? new Error("Baralho não copiado");
  return data;
}
