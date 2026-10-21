import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Estuda<span className="text-indigo-600 dark:text-indigo-400">-AI</span>
        </Link>
        <Link href="/#como-funciona" className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400">
          Como funciona
        </Link>
        <Link href="/precos" className="text-sm text-zinc-600 dark:text-zinc-400">
          Preços
        </Link>
        <Link
          href="/login"
          className="ml-auto rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Entrar
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-8 text-sm text-zinc-500 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4">
        <span>Estuda-AI</span>
        <Link href="/precos">Preços</Link>
        <a href="https://github.com/lucas-3010/Estuda-AI">Código aberto no GitHub</a>
      </div>
    </footer>
  );
}
