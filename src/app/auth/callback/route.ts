import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Recebe o retorno do login (GitHub ou link mágico) e cria a sessão.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
    console.error("Falha ao concluir o login:", error.message);
  } else {
    console.error("Retorno de login sem código:", url.searchParams.get("error_description") ?? url.search);
  }
  return NextResponse.redirect(new URL("/login?erro=1", url.origin));
}
