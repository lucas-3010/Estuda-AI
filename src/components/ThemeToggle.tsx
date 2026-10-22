"use client";

import { useSyncExternalStore } from "react";
import { readTheme, saveTheme, subscribeTheme, type Theme } from "@/lib/theme";

// Do automático, o primeiro clique sempre muda o visual: vai para o oposto do sistema.
function nextTheme(theme: Theme): Theme {
  if (theme === "claro") return "escuro";
  if (theme === "escuro") return "sistema";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "claro" : "escuro";
}
const LABEL: Record<Theme, string> = { claro: "Claro", escuro: "Escuro", sistema: "Automático" };

function Icon({ theme }: { theme: Theme }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (theme === "claro") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (theme === "escuro") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

/** Alterna entre tema claro, escuro e automático (segue o sistema). */
export function ThemeToggle({ withLabel = false, className = "" }: { withLabel?: boolean; className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "sistema" as Theme);
  return (
    <button
      type="button"
      onClick={() => saveTheme(nextTheme(theme))}
      aria-label={`Tema: ${LABEL[theme]}. Clique para trocar`}
      title={`Tema: ${LABEL[theme]}`}
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
    >
      <Icon theme={theme} />
      {withLabel && <span>Tema: {LABEL[theme]}</span>}
    </button>
  );
}
