import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE, providerLine } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200/80 bg-[var(--background)]/90 backdrop-blur dark:border-zinc-800">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-5 px-4 py-3.5">
        <Link href="/" aria-label="Estuda-AI">
          <Logo />
        </Link>
        <Link href="/#metodo" className="hidden text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-100">
          O método
        </Link>
        <Link href="/#como-funciona" className="hidden text-sm text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-100">
          Como funciona
        </Link>
        <Link href="/precos" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          Preços
        </Link>
        <Link href="/sobre" className="hidden text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-100">
          Sobre
        </Link>
        <Link
          href="/login"
          className="ml-auto rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
        >
          Entrar
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-10 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs">Flashcards com inteligência artificial e repetição espaçada, para qualquer matéria.</p>
        </div>
        <nav aria-label="Produto" className="flex flex-col gap-2">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Produto</span>
          <Link href="/#metodo">O método</Link>
          <Link href="/precos">Preços</Link>
          <Link href="/precos#perguntas">Perguntas frequentes</Link>
        </nav>
        <nav aria-label="Institucional" className="flex flex-col gap-2">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Institucional</span>
          <Link href="/sobre">Sobre</Link>
          <Link href="/contato">Contato</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Política de privacidade</Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 w-full max-w-5xl px-4 text-xs text-zinc-500">
        © 2026 {SITE.name}
        {providerLine() && <> · {providerLine()}</>}
        {SITE.supportEmail && <> · {SITE.supportEmail}</>}. Pagamentos processados pela Stripe.
      </p>
    </footer>
  );
}
