"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/novo", label: "Novo tema", icon: "✨" },
  { href: "/revisar", label: "Revisar", icon: "🔁" },
  { href: "/quiz", label: "Quiz", icon: "❓" },
  { href: "/cartoes", label: "Cartões", icon: "🗂️" },
  { href: "/estatisticas", label: "Estatísticas", icon: "📈" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

// No celular, a barra inferior mostra os atalhos do dia a dia; o resto fica no menu.
const BOTTOM = ["/", "/revisar", "/novo", "/quiz"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const linkClass = (active: boolean) =>
    `rounded-md px-2.5 py-1.5 text-sm ${
      active
        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    }`;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4 py-3">
          <Link href="/" className="mr-3 font-semibold tracking-tight">
            Estuda<span className="text-indigo-600 dark:text-indigo-400">-AI</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={linkClass(isActive(pathname, link.href))}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="/precos" className="ml-auto hidden rounded-md px-2.5 py-1.5 text-sm font-medium text-indigo-700 md:inline dark:text-indigo-400">
            Planos
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="hidden rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sair
          </button>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-celular"
            onClick={() => setMenuOpen((open) => !open)}
            className="ml-auto rounded-md px-3 py-2 text-sm font-medium md:hidden"
          >
            {menuOpen ? "Fechar" : "Menu"}
          </button>
        </nav>
        {menuOpen && (
          <div id="menu-celular" className="border-t border-zinc-200 px-4 py-2 md:hidden dark:border-zinc-800">
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className={`block py-3 ${linkClass(isActive(pathname, link.href))}`}
                  >
                    <span aria-hidden className="mr-2">
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/precos" onClick={() => setMenuOpen(false)} className={`block py-3 ${linkClass(false)}`}>
                  <span aria-hidden className="mr-2">
                    💎
                  </span>
                  Planos
                </Link>
              </li>
              <li>
                <button type="button" onClick={signOut} className={`w-full py-3 text-left ${linkClass(false)}`}>
                  Sair
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:py-8">{children}</main>
      <nav
        aria-label="Atalhos"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        <ul className="grid grid-cols-4">
          {LINKS.filter((link) => BOTTOM.includes(link.href)).map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs ${
                  isActive(pathname, link.href)
                    ? "font-semibold text-indigo-700 dark:text-indigo-400"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
