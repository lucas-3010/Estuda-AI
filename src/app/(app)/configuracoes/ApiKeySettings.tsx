"use client";

import { useState, useSyncExternalStore } from "react";
import { aiErrorMessage, AiError } from "@/lib/ai/errors";
import { callGenerate, clearApiKey, getApiKey, maskKey, setApiKey } from "@/lib/apiKey";
import { btnDanger, btnPrimary, btnSecondary, card, input, label, muted } from "@/components/ui/styles";

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const notify = () => listeners.forEach((fn) => fn());

export function ApiKeySettings() {
  const savedKey = useSyncExternalStore(subscribe, getApiKey, () => null);
  const [draft, setDraft] = useState("");
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "error"; message?: string }>({
    state: "idle",
  });

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setApiKey(draft);
    setDraft("");
    setTest({ state: "idle" });
    notify();
  }

  function remove() {
    clearApiKey();
    setTest({ state: "idle" });
    notify();
  }

  async function testKey() {
    setTest({ state: "testing" });
    try {
      await callGenerate({ mode: "ping" });
      setTest({ state: "ok", message: "Chave funcionando." });
    } catch (e) {
      const code = e instanceof AiError ? e.code : "network";
      setTest({ state: "error", message: aiErrorMessage(code) });
    }
  }

  return (
    <section className={card} aria-labelledby="chave-titulo">
      <h2 id="chave-titulo" className="text-lg font-semibold">
        Chave da Anthropic
      </h2>
      <p className={`mt-1 ${muted}`}>
        A geração de planos usa a sua própria chave da API do Claude. Ela fica salva apenas neste
        navegador e só é enviada ao servidor no momento de gerar, sem ser gravada. Crie uma em{" "}
        <a
          className="underline"
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
        >
          console.anthropic.com
        </a>
        .
      </p>

      {savedKey ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="rounded bg-zinc-100 px-2 py-1 text-sm dark:bg-zinc-800">{maskKey(savedKey)}</code>
          <button type="button" className={btnSecondary} onClick={testKey} disabled={test.state === "testing"}>
            {test.state === "testing" ? "Testando…" : "Testar chave"}
          </button>
          <button type="button" className={btnDanger} onClick={remove}>
            Remover
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="api-key" className={label}>
              Cole sua chave
            </label>
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={`mt-1 ${input}`}
            />
          </div>
          <button type="submit" className={btnPrimary} disabled={!draft.trim()}>
            Salvar
          </button>
        </form>
      )}

      <p role="status" className={`mt-3 text-sm ${test.state === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
        {test.message}
      </p>
    </section>
  );
}
