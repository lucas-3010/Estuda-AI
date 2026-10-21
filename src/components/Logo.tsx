/** Marca do Estuda-AI: um livro aberto com um cartão marcando a página. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="7" className="fill-indigo-700 dark:fill-indigo-500" />
      <path d="M6 10.5c3.3-1.4 6.6-1.4 10 .6v13c-3.4-2-6.7-2-10-.6z" fill="#fff" />
      <path d="M26 10.5c-3.3-1.4-6.6-1.4-10 .6v13c3.4-2 6.7-2 10-.6z" fill="#fff" opacity=".82" />
      <path d="M19.5 6.5h4v9l-2-1.5-2 1.5z" className="fill-gold-500" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-serif text-lg font-semibold tracking-tight">
        Estuda<span className="text-indigo-700 dark:text-indigo-400">-AI</span>
      </span>
    </span>
  );
}
