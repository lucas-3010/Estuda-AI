import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

let admin: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Cliente com a chave secreta do Supabase: ignora o RLS. Use só no servidor, para
 * cota de IA, webhook do Stripe e lembretes. Nunca importe em componentes cliente.
 */
export function createAdminSupabase() {
  if (!admin) {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error("Defina SUPABASE_SECRET_KEY nas variáveis de ambiente do servidor");
    admin = createClient<Database>(supabaseEnv().url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
