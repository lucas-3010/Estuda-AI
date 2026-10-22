"use client";

import { useState } from "react";

/**
 * Esconde o verso de um cartão até a pessoa pedir para ver. Fora da revisão,
 * ver a resposta sem tentar lembrar atrapalha o estudo.
 */
export function HiddenAnswer({
  children,
  label = "Mostrar resposta",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [shown, setShown] = useState(false);
  if (shown) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
    >
      {label}
    </button>
  );
}
