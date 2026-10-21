import { createServerSupabase } from "@/lib/supabase/server";

// Redirect relativo: o host visto pelo servidor pode diferir do usado no navegador
// (ex.: 127.0.0.1 x localhost), e os cookies de sessão precisam ficar no mesmo host.
function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

// Recebe o retorno do login (GitHub ou link mágico) e cria a sessão.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo("/");
    console.error("Falha ao concluir o login:", error.message);
  } else {
    console.error("Retorno de login sem código:", url.searchParams.get("error_description") ?? url.search);
  }
  return redirectTo("/login?erro=1");
}
