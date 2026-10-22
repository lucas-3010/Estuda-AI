"use client";

import Link from "next/link";
import { useState } from "react";
import { AiError } from "@/lib/ai/errors";
import { savePracticeExam, type PracticeExam } from "@/lib/data/practiceExams";
import { FileSourceError, fileToSource } from "@/lib/fileSource";
import { callGenerate } from "@/lib/generateClient";
import { LIMITS, type ImportedExam, type Source } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, input, label, muted } from "@/components/ui/styles";

type Kind = "file" | "text";

/** Lê uma prova antiga enviada pela pessoa e guarda as questões para treinar no quiz. */
export function ImportExam({
  filesAllowed,
  onImported,
  onCancel,
}: {
  filesAllowed: boolean;
  onImported: (exam: PracticeExam) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<Kind>(filesAllowed ? "file" : "text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = kind === "file" ? Boolean(file) : text.trim().length >= 50;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const source: Source = kind === "file" ? await fileToSource(file!) : { kind: "text", text: text.trim() };
      const exam = await callGenerate<ImportedExam>({
        mode: "import",
        source,
        answerKey: answerKey.trim() || undefined,
      });
      onImported(await savePracticeExam(exam));
    } catch (e) {
      setError(
        e instanceof AiError || e instanceof FileSourceError
          ? e.message
          : "Não foi possível importar a prova. Tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  const kindClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm ${
      active
        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
        : "border-zinc-300 dark:border-zinc-700"
    }`;

  return (
    <form className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800" onSubmit={submit}>
      <div>
        <h3 className="font-semibold">Importar prova antiga</h3>
        <p className={`mt-1 ${muted}`}>
          Envie uma prova de vestibular, concurso ou faculdade, de preferência com o gabarito. A IA separa as questões
          de múltipla escolha (até {LIMITS.importQuestionsMax} por vez) e elas ficam salvas só na sua conta. Conta como
          uma geração com IA.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={kindClass(kind === "file")} aria-pressed={kind === "file"} onClick={() => setKind("file")}>
          PDF ou foto
        </button>
        <button type="button" className={kindClass(kind === "text")} aria-pressed={kind === "text"} onClick={() => setKind("text")}>
          Colar texto
        </button>
      </div>

      {kind === "text" ? (
        <div>
          <label htmlFor="prova-texto" className={label}>
            Texto da prova
          </label>
          <textarea
            id="prova-texto"
            rows={8}
            maxLength={LIMITS.sourceTextMax}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui as questões com as alternativas."
            className={`mt-1 ${input}`}
          />
        </div>
      ) : filesAllowed ? (
        <div>
          <label htmlFor="prova-arquivo" className={label}>
            Arquivo da prova
          </label>
          <input
            id="prova-arquivo"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-medium file:text-white"
          />
          <p className={`mt-1 ${muted}`}>PDF de até 3 MB ou foto da prova. Se a prova for grande, envie só as páginas que quer treinar.</p>
        </div>
      ) : (
        <p className="rounded-lg bg-indigo-50 px-4 py-3 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
          Importar prova em PDF ou foto está nos planos Pro e Max. No seu plano, cole o texto da prova.{" "}
          <Link href="/precos" className="font-medium underline">
            Ver planos
          </Link>
        </p>
      )}

      <div>
        <label htmlFor="prova-gabarito" className={label}>
          Gabarito (opcional)
        </label>
        <textarea
          id="prova-gabarito"
          rows={2}
          maxLength={LIMITS.answerKeyMax}
          value={answerKey}
          onChange={(e) => setAnswerKey(e.target.value)}
          placeholder="Ex.: 1-A 2-C 3-E 4-B… Deixe em branco se o gabarito já estiver no arquivo."
          className={`mt-1 ${input}`}
        />
        <p className={`mt-1 ${muted}`}>Sem gabarito, a IA resolve as questões e o quiz avisa que a resposta pode estar errada.</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={!ready || busy}>
          {busy ? "Lendo a prova…" : "Importar prova"}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
          Voltar
        </button>
        {busy && (
          <span className={muted} role="status">
            Isso pode levar até 2 minutos.
          </span>
        )}
      </div>
    </form>
  );
}
