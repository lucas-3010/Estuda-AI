"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AiError, aiErrorMessage, type AiErrorCode } from "@/lib/ai/errors";
import { createEditalPlan } from "@/lib/data/edital";
import { userTimeZone } from "@/lib/data/settings";
import { todayIn } from "@/lib/exam";
import { FileSourceError, fileToSource } from "@/lib/fileSource";
import { callGenerate } from "@/lib/generateClient";
import { EDITAL_LIMITS, LIMITS, type EditalDiscipline, type EditalResult } from "@/lib/validation/plan";
import { btnDanger, btnPrimary, btnSecondary, card, input, label, muted } from "@/components/ui/styles";

type Kind = "file" | "link" | "text";

const UPGRADE_CODES: AiErrorCode[] = ["quota_exceeded", "files_not_allowed"];

/**
 * Edital vira plano: a IA lê o edital, a pessoa confere o edital verticalizado
 * (disciplinas, pesos e tópicos) e o plano é criado com uma etapa por disciplina.
 */
export function EditalFlow({ filesAllowed, onGenerated }: { filesAllowed: boolean; onGenerated: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [banca, setBanca] = useState("");
  const [examDate, setExamDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade: boolean } | null>(null);
  const [edital, setEdital] = useState<EditalResult | null>(null);
  const [disciplines, setDisciplines] = useState<EditalDiscipline[]>([]);
  const [creating, setCreating] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const today = todayIn(userTimeZone());
  const sourceOk =
    kind === "link" ? /^https?:\/\/\S+$/i.test(url.trim()) : kind === "text" ? text.trim().length >= 50 : Boolean(file);

  function showError(e: unknown) {
    if (e instanceof FileSourceError) {
      setError({ text: e.message, upgrade: false });
      return;
    }
    const code: AiErrorCode = e instanceof AiError ? e.code : "network";
    setError({ text: aiErrorMessage(code), upgrade: UPGRADE_CODES.includes(code) });
  }

  async function read(event: React.FormEvent) {
    event.preventDefault();
    if (!sourceOk || busy) return;
    setError(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const source =
        kind === "link"
          ? { kind: "link" as const, url: url.trim() }
          : kind === "text"
            ? { kind: "text" as const, text: text.trim() }
            : await fileToSource(file!);
      const result = await callGenerate<EditalResult>(
        { mode: "edital", source, banca: banca.trim() || undefined },
        abort.current.signal,
      );
      setEdital(result);
      setDisciplines(result.disciplines);
    } catch (e) {
      if (!abort.current.signal.aborted) showError(e);
    } finally {
      setBusy(false);
      onGenerated();
    }
  }

  function update(index: number, patch: Partial<EditalDiscipline>) {
    setDisciplines((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function create() {
    if (!edital) return;
    const cleaned = disciplines
      .map((d) => ({ ...d, name: d.name.trim(), topics: d.topics.map((t) => t.trim()).filter(Boolean) }))
      .filter((d) => d.name && d.topics.length > 0);
    if (cleaned.length === 0) {
      setError({ text: "Deixe pelo menos uma disciplina com tópicos.", upgrade: false });
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const planId = await createEditalPlan(edital.editalId, cleaned, examDate || null);
      router.push(`/edital?plano=${planId}&gerar=1`);
    } catch {
      setError({ text: "Não foi possível criar o plano. Tente de novo.", upgrade: false });
      setCreating(false);
    }
  }

  const errorBox = error && (
    <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
      {error.text}
      {error.upgrade && (
        <>
          {" "}
          <Link href="/precos" className="font-medium underline">
            Ver planos
          </Link>
        </>
      )}
    </div>
  );

  if (edital) {
    const totalTopics = disciplines.reduce((n, d) => n + d.topics.length, 0);
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-indigo-700 uppercase dark:text-indigo-400">
            Edital verticalizado
          </p>
          <h2 className="mt-1 text-xl font-semibold">{edital.title}</h2>
          <p className={muted}>
            {edital.banca ? `Banca ${edital.banca} · ` : ""}
            {disciplines.length} disciplinas · {totalTopics} tópicos. Confira, ajuste os pesos e tire o que não cai no seu
            cargo. Os cartões de cada disciplina são gerados em seguida.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {disciplines.map((d, i) => (
            <li key={i} className={card}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <label htmlFor={`disc-${i}`} className={label}>
                    Disciplina {i + 1}
                  </label>
                  <input
                    id={`disc-${i}`}
                    value={d.name}
                    maxLength={200}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className={`mt-1 ${input}`}
                  />
                </div>
                <div>
                  <label htmlFor={`peso-${i}`} className={label}>
                    Peso na prova
                  </label>
                  <select
                    id={`peso-${i}`}
                    value={d.weight}
                    onChange={(e) => update(i, { weight: Number(e.target.value) })}
                    className={`mt-1 ${input} w-auto`}
                  >
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        {w} {w === 5 ? "(cai muito)" : w === 1 ? "(cai pouco)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className={btnDanger}
                  onClick={() => setDisciplines((list) => list.filter((_, j) => j !== i))}
                >
                  Tirar
                </button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">{d.topics.length} tópicos do edital</summary>
                <label htmlFor={`topicos-${i}`} className="sr-only">
                  Tópicos de {d.name}, um por linha
                </label>
                <textarea
                  id={`topicos-${i}`}
                  rows={Math.min(12, d.topics.length + 1)}
                  value={d.topics.join("\n")}
                  onChange={(e) =>
                    update(i, {
                      topics: e.target.value
                        .split("\n")
                        .slice(0, EDITAL_LIMITS.topicsMax)
                        .map((t) => t.slice(0, EDITAL_LIMITS.topicMax)),
                    })
                  }
                  className={`mt-2 text-sm ${input}`}
                />
                <p className={`mt-1 ${muted}`}>Um tópico por linha.</p>
              </details>
            </li>
          ))}
        </ol>

        <div>
          <label htmlFor="edital-prova-2" className={label}>
            Data da prova <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input
            id="edital-prova-2"
            type="date"
            min={today}
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className={`mt-1 ${input} w-auto`}
          />
        </div>

        {errorBox}

        <div className="sticky bottom-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              setEdital(null);
              setDisciplines([]);
            }}
          >
            Ler outro edital
          </button>
          <button type="button" className={`${btnPrimary} shadow-lg`} onClick={create} disabled={creating}>
            {creating ? "Criando…" : "Criar plano e gerar os cartões"}
          </button>
        </div>
      </div>
    );
  }

  const kindClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm ${
      active
        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
        : "border-zinc-300 dark:border-zinc-700"
    }`;

  return (
    <form className="flex flex-col gap-4" onSubmit={read}>
      <p className={muted}>
        Envie o edital e a IA monta o plano inteiro: separa as disciplinas, dá peso a cada uma e cria os cartões de cada
        tópico, distribuídos até a data da prova. O edital inteiro conta como uma geração com IA.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={kindClass(kind === "link")} aria-pressed={kind === "link"} onClick={() => setKind("link")}>
          Link do edital
        </button>
        <button type="button" className={kindClass(kind === "file")} aria-pressed={kind === "file"} onClick={() => setKind("file")}>
          PDF
        </button>
        <button type="button" className={kindClass(kind === "text")} aria-pressed={kind === "text"} onClick={() => setKind("text")}>
          Colar o conteúdo programático
        </button>
      </div>

      {kind === "link" && (
        <div>
          <label htmlFor="edital-link" className={label}>
            Link do PDF ou da página do edital
          </label>
          <input
            id="edital-link"
            type="url"
            inputMode="url"
            value={url}
            maxLength={2000}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.banca.org.br/concurso/edital.pdf"
            className={`mt-1 ${input}`}
          />
          <p className={`mt-1 ${muted}`}>O link precisa ser público. Funciona com o PDF do edital no site da banca.</p>
        </div>
      )}
      {kind === "text" && (
        <div>
          <label htmlFor="edital-texto" className={label}>
            Conteúdo programático
          </label>
          <textarea
            id="edital-texto"
            rows={10}
            maxLength={LIMITS.sourceTextMax}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Copie do edital a parte &quot;Conteúdo programático&quot; (ou &quot;Anexo II&quot;) e cole aqui."
            className={`mt-1 ${input}`}
          />
        </div>
      )}
      {kind === "file" &&
        (filesAllowed ? (
          <div>
            <label htmlFor="edital-arquivo" className={label}>
              PDF do edital
            </label>
            <input
              id="edital-arquivo"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-medium file:text-white"
            />
            <p className={`mt-1 ${muted}`}>
              Até 3 MB. Edital grande? Use o link do PDF ou cole só o conteúdo programático.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-indigo-50 px-4 py-3 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
            Enviar o PDF está nos planos Pro e Max. No seu plano, use o link do edital ou cole o conteúdo programático.{" "}
            <Link href="/precos" className="font-medium underline">
              Ver planos
            </Link>
          </p>
        ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edital-banca" className={label}>
            Banca <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input
            id="edital-banca"
            value={banca}
            maxLength={100}
            onChange={(e) => setBanca(e.target.value)}
            placeholder="Ex.: Cebraspe, FGV, FCC"
            className={`mt-1 ${input}`}
          />
        </div>
        <div>
          <label htmlFor="edital-prova" className={label}>
            Data da prova <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input
            id="edital-prova"
            type="date"
            min={today}
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className={`mt-1 ${input}`}
          />
        </div>
      </div>

      {errorBox}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={!sourceOk || busy}>
          {busy ? "Lendo o edital…" : "Ler o edital"}
        </button>
        {busy && (
          <>
            <button type="button" className={btnSecondary} onClick={() => abort.current?.abort()}>
              Cancelar
            </button>
            <span className={muted} role="status">
              A IA está lendo o edital. Isso pode levar até 2 minutos.
            </span>
          </>
        )}
      </div>
    </form>
  );
}
