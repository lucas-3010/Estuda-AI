"use client";

import { useState } from "react";
import { disableSharing, enableSharing } from "@/lib/data/share";
import { shareUrl } from "@/lib/share";
import { btnSecondary, input } from "@/components/ui/styles";

/** Cria, copia e desativa o link público de um plano. */
export function SharePlan({ planId, initialToken }: { planId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = token ? shareUrl(window.location.origin, token) : "";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("Não foi possível alterar o link. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão para a área de transferência: o campo continua selecionável.
    }
  }

  if (!open) {
    return (
      <button type="button" className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400" onClick={() => setOpen(true)}>
        Compartilhar
      </button>
    );
  }

  return (
    <div className="mt-3 flex w-full flex-col gap-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
      {token ? (
        <>
          <p>Quem abrir o link vê as perguntas e pode copiar o baralho para a própria conta. Seu progresso não aparece.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`link-${planId}`} className="sr-only">
              Link do baralho
            </label>
            <input id={`link-${planId}`} readOnly value={url} className={input} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className={btnSecondary} onClick={() => copy(url)}>
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Estuda comigo no Estuda-AI: ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Enviar pelo WhatsApp
            </a>
            <button
              type="button"
              disabled={busy}
              className="font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
              onClick={() =>
                run(async () => {
                  await disableSharing(planId);
                  setToken(null);
                })
              }
            >
              Desativar link
            </button>
            <button type="button" className="ml-auto text-zinc-500 hover:underline" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Crie um link para mandar este baralho a amigos ou ao seu grupo de estudo. Você pode desativar quando quiser.</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              className={btnSecondary}
              onClick={() =>
                run(async () => {
                  const created = await enableSharing(planId);
                  setToken(created);
                  await copy(shareUrl(window.location.origin, created));
                })
              }
            >
              {busy ? "Criando…" : "Criar link"}
            </button>
            <button type="button" className="text-zinc-500 hover:underline" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
