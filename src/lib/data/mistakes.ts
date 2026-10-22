import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Guarda a questão errada no caderno de erros (função `add_mistake`). Com plano, entra na etapa
 * "Meus erros" dele; sem plano, no plano "Caderno de erros". A mesma questão não se repete.
 */
export async function addMistake(planId: string | null, card: { front: string; back: string }): Promise<string> {
  const { data, error } = await createBrowserSupabase().rpc("add_mistake", {
    p_plan_id: planId,
    p_front: card.front,
    p_back: card.back,
  });
  if (error || !data) throw error ?? new Error("Erro não guardado");
  return data;
}
