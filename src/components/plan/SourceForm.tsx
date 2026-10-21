"use client";

import Link from "next/link";
import { useState } from "react";
import { FileSourceError, fileToSource, topicFromFileName } from "@/lib/fileSource";
import { LIMITS, type Source } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, input, label, muted } from "@/components/ui/styles";
import { LevelPicker, type TopicValues } from "./TopicForm";

type Kind = "text" | "file";

/** Gera o plano a partir de texto colado, PDF ou foto. */
export function SourceForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  busy,
  filesAllowed,
}: {
  values: TopicValues;
  onChange: (values: TopicValues) => void;
  onSubmit: (source: Source) => void;
  onCancel: () => void;
  busy: boolean;
  filesAllowed: boolean;
}) {
  const [kind, setKind] = useState<Kind>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const topicOk = values.topic.trim().length >= LIMITS.topicMin;
  const materialOk = kind === "text" ? text.trim().length >= 50 : Boolean(file);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!topicOk || !materialOk || busy) return;
    setError(null);
    if (kind === "text") {
      onSubmit({ kind: "text", text: text.trim() });
      return;
    }
    setReading(true);
    try {
      onSubmit(await fileToSource(file!));
    } catch (e) {
      setError(e instanceof FileSourceError ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setReading(false);
    }
  }

  function pickFile(chosen: File | null) {
    setFile(chosen);
    setError(null);
    if (chosen && !values.topic.trim()) onChange({ ...values, topic: topicFromFileName(chosen.name) });
  }

  const kindClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm ${
      active
        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
        : "border-zinc-300 dark:border-zinc-700"
    }`;

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={kindClass(kind === "text")} aria-pressed={kind === "text"} onClick={() => setKind("text")}>
          Colar texto
        </button>
        <button type="button" className={kindClass(kind === "file")} aria-pressed={kind === "file"} onClick={() => setKind("file")}>
          PDF ou foto
        </button>
      </div>

      {kind === "text" ? (
        <div>
          <label htmlFor="material" className={label}>
            Texto para estudar
          </label>
          <textarea
            id="material"
            rows={10}
            maxLength={LIMITS.sourceTextMax}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui o resumo, a lei, o capítulo do livro ou suas anotações."
            className={`mt-1 ${input}`}
          />
          <p className={`mt-1 ${muted}`}>
            {text.length.toLocaleString("pt-BR")} de {LIMITS.sourceTextMax.toLocaleString("pt-BR")} caracteres
          </p>
        </div>
      ) : filesAllowed ? (
        <div>
          <label htmlFor="arquivo" className={label}>
            Arquivo
          </label>
          <input
            id="arquivo"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-medium file:text-white"
          />
          <p className={`mt-1 ${muted}`}>PDF de até 3 MB ou foto do caderno, do livro ou da lousa.</p>
        </div>
      ) : (
        <p className="rounded-lg bg-indigo-50 px-4 py-3 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
          Gerar cartões a partir de PDF e foto está nos planos Pro e Max.{" "}
          <Link href="/precos" className="font-medium underline">
            Ver planos
          </Link>
        </p>
      )}

      <div>
        <label htmlFor="tema-material" className={label}>
          Nome do tema
        </label>
        <input
          id="tema-material"
          value={values.topic}
          maxLength={LIMITS.topicMax}
          onChange={(e) => onChange({ ...values, topic: e.target.value })}
          placeholder="Ex.: Capítulo 3 de Biologia"
          className={`mt-1 ${input}`}
        />
      </div>

      <LevelPicker value={values.level} onChange={(level) => onChange({ ...values, level })} />

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={!topicOk || !materialOk || busy || reading}>
          {busy || reading ? "Gerando…" : "Gerar cartões"}
        </button>
        {busy && (
          <>
            <button type="button" className={btnSecondary} onClick={onCancel}>
              Cancelar
            </button>
            <span className={muted} role="status">
              A IA está lendo o material. Isso pode levar até 2 minutos.
            </span>
          </>
        )}
      </div>
    </form>
  );
}
