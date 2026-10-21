"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/novo", label: "Novo tema" },
  { href: "/revisar", label: "Revisar" },
  { href: "/cartoes", label: "Cartões" },
  { href: "/estatisticas", label: "Estatísticas" },
  { href: "/configuracoes", label: "Configurações" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <nav className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
          <Link href="/" className="mr-3 font-semibold tracking-tight">
            Estuda<span className="text-indigo-600 dark:text-indigo-400">-AI</span>
          </Link>
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-sm ${
                  active
                    ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={signOut}
            className="ml-auto rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sair
          </button>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
