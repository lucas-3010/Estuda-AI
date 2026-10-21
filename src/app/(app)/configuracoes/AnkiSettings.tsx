"use client";

import { useState } from "react";
import { parseAnkiText } from "@/lib/anki";
import { exportAllCards, importCards } from "@/lib/data/anki";
import { btnPrimary, btnSecondary, card, label, muted } from "@/components/ui/styles";

type Status = { kind: "idle" | "busy" | "ok" | "error"; text?: string };

export function AnkiSettings() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function doExport() {
    setStatus({ kind: "busy" });
    try {
      const { text, count } = await exportAllCards();
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "estuda-ai-anki.txt";
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", text: `${count} cartões exportados. No Anki, use Arquivo > Importar e escolha o arquivo.` });
    } catch {
      setStatus({ kind: "error", text: "Não foi possível exportar. Tente de novo." });
    }
  }

  async function doImport(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "busy" });
    try {
      const cards = parseAnkiText(await file.text());
      if (cards.length === 0) {
        setStatus({ kind: "error", text: "Nenhum cartão encontrado. Exporte do Anki como “Notas em texto simples”." });
        return;
      }
      await importCards(file.name.replace(/\.[^.]+$/, ""), cards);
      setStatus({ kind: "ok", text: `${cards.length} cartões importados. Eles aparecem no Início como um novo plano.` });
    } catch {
      setStatus({ kind: "error", text: "Não foi possível importar o arquivo. Tente de novo." });
    }
  }

  return (
    <section className={card} aria-labelledby="anki-titulo">
      <h2 id="anki-titulo" className="text-lg font-semibold">
        Anki
      </h2>
      <p className={`mt-1 ${muted}`}>
        Para trazer um baralho, no Anki abra Arquivo &gt; Exportar, escolha “Notas em texto simples (.txt)” e envie o
        arquivo aqui. Também aceitamos CSV com duas colunas (frente e verso).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className={`${btnPrimary} cursor-pointer`}>
          Importar do Anki
          <input
            type="file"
            accept=".txt,.csv,.tsv,text/plain,text/csv"
            className="sr-only"
            disabled={status.kind === "busy"}
            onChange={(e) => {
              void doImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" className={btnSecondary} onClick={doExport} disabled={status.kind === "busy"}>
          Exportar para o Anki
        </button>
      </div>
      <p role="status" className={`mt-3 ${status.kind === "error" ? "text-sm text-red-700 dark:text-red-400" : muted}`}>
        <span className={label}>{status.kind === "busy" ? "Processando…" : ""}</span>
        {status.text}
      </p>
    </section>
  );
}
