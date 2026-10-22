"use client";

import Link from "next/link";
import { useState } from "react";
import { FileSourceError, fileToSource, topicFromFileName } from "@/lib/fileSource";
import { LIMITS, type Source } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, input, label, muted } from "@/components/ui/styles";
import { LevelPicker, type TopicValues } from "./TopicForm";

type Kind = "text" | "file" | "link";

/** Material para a IA: texto, arquivo ou um link que a IA lê. */
export type Material = Source | { kind: "link"; url: string };

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Vídeos não têm texto que a IA consiga ler pelo link. */
export function isVideoUrl(value: string): boolean {
  try {
    return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)$/i.test(new URL(value.trim()).hostname);
  } catch {
    return false;
  }
}

/** Nome sugerido a partir do link: o título do caminho ou o domínio. */
function topicFromUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
    const name = last.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
    return (name.length >= LIMITS.topicMin ? name : url.hostname.replace(/^www\./, "")).slice(0, LIMITS.topicMax);
  } catch {
    return "";
  }
}

/** Gera o plano a partir de texto colado, PDF, foto ou link. */
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
  onSubmit: (source: Material) => void;
  onCancel: () => void;
  busy: boolean;
  filesAllowed: boolean;
}) {
  const [kind, setKind] = useState<Kind>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const topicOk = values.topic.trim().length >= LIMITS.topicMin;
  const materialOk = kind === "text" ? text.trim().length >= 50 : kind === "link" ? isHttpUrl(url) && !isVideoUrl(url) : Boolean(file);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!topicOk || !materialOk || busy) return;
    setError(null);
    if (kind === "text") {
      onSubmit({ kind: "text", text: text.trim() });
      return;
    }
    if (kind === "link") {
      onSubmit({ kind: "link", url: url.trim() });
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
        <button type="button" className={kindClass(kind === "link")} aria-pressed={kind === "link"} onClick={() => setKind("link")}>
          Link
        </button>
      </div>

      {kind === "link" ? (
        <div>
          <label htmlFor="link" className={label}>
            Link da página
          </label>
          <input
            id="link"
            type="url"
            inputMode="url"
            value={url}
            maxLength={2000}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => {
              if (isHttpUrl(url) && !values.topic.trim()) onChange({ ...values, topic: topicFromUrl(url) });
            }}
            placeholder="https://pt.wikipedia.org/wiki/Fotossíntese"
            className={`mt-1 ${input}`}
          />
          <p className={`mt-1 ${muted}`}>
            Artigo, apostila on-line, lei no Planalto ou página da Wikipédia. A página precisa ser pública.
          </p>
          {isVideoUrl(url) && (
            <p role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              A IA não assiste vídeos pelo link. No YouTube, abra a descrição do vídeo, clique em &quot;Mostrar
              transcrição&quot;, copie o texto e use &quot;Colar texto&quot;.
            </p>
          )}
        </div>
      ) : kind === "text" ? (
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
              {kind === "link" ? "A IA está lendo a página." : "A IA está lendo o material."} Isso pode levar até 2 minutos.
            </span>
          </>
        )}
      </div>
    </form>
  );
}
