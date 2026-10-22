"use client";

import { useState } from "react";
import { isLawUrl } from "@/lib/law";
import { BANCAS, BANCA_IDS, LAW_LIMITS, type Banca, type Level } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, input, label, muted } from "@/components/ui/styles";
import { LevelPicker } from "./TopicForm";

export type LawRequest = {
  lawName: string;
  level: Level;
  source: { kind: "link"; url: string } | { kind: "text"; text: string };
  articles?: string;
  banca?: Banca;
};

const SUGGESTIONS: Array<[string, string]> = [
  ["Constituição Federal", "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm"],
  ["Lei 8.112/1990", "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm"],
  ["Lei 14.133/2021 (Licitações)", "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"],
  ["Lei 9.784/1999 (Processo Administrativo)", "https://www.planalto.gov.br/ccivil_03/leis/l9784.htm"],
  ["Código Penal", "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm"],
];

/** Lei seca: link oficial ou texto colado, com o intervalo de artigos. */
export function LawForm({
  onSubmit,
  onCancel,
  busy,
}: {
  onSubmit: (request: LawRequest) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [lawName, setLawName] = useState("");
  const [kind, setKind] = useState<"link" | "text">("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [articles, setArticles] = useState("");
  const [banca, setBanca] = useState<Banca | "">("");
  const [level, setLevel] = useState<Level>("intermediario");

  const urlOk = isLawUrl(url.trim());
  const sourceOk = kind === "link" ? urlOk : text.trim().length >= 50;
  const ready = lawName.trim().length >= 2 && sourceOk && !busy;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onSubmit({
      lawName: lawName.trim(),
      level,
      source: kind === "link" ? { kind: "link", url: url.trim() } : { kind: "text", text: text.trim() },
      articles: articles.trim() || undefined,
      banca: banca || undefined,
    });
  }

  const kindClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm ${
      active
        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
        : "border-zinc-300 dark:border-zinc-700"
    }`;

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <p className={muted}>
        Cartões com a letra da lei, sempre com o artigo citado, e as pegadinhas que as bancas usam. Com o link oficial,
        avisamos quando um artigo dos seus cartões mudar.
      </p>

      <div>
        <label htmlFor="lei-nome" className={label}>
          Lei
        </label>
        <input
          id="lei-nome"
          value={lawName}
          maxLength={200}
          onChange={(e) => setLawName(e.target.value)}
          placeholder="Ex.: Lei 8.112/1990"
          className={`mt-1 ${input}`}
        />
        {!lawName && (
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Leis mais estudadas">
            {SUGGESTIONS.map(([name, link]) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setLawName(name);
                  setKind("link");
                  setUrl(link);
                }}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={kindClass(kind === "link")} aria-pressed={kind === "link"} onClick={() => setKind("link")}>
          Link oficial
        </button>
        <button type="button" className={kindClass(kind === "text")} aria-pressed={kind === "text"} onClick={() => setKind("text")}>
          Colar o texto
        </button>
      </div>

      {kind === "link" ? (
        <div>
          <label htmlFor="lei-link" className={label}>
            Link da lei no Planalto, Senado ou Câmara
          </label>
          <input
            id="lei-link"
            type="url"
            inputMode="url"
            value={url}
            maxLength={2000}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm"
            className={`mt-1 ${input}`}
          />
          {url.trim() && !urlOk && (
            <p role="alert" className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              Use um link de planalto.gov.br, senado.leg.br ou camara.leg.br. Para outras fontes, cole o texto.
            </p>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="lei-texto" className={label}>
            Texto dos artigos
          </label>
          <textarea
            id="lei-texto"
            rows={8}
            maxLength={LAW_LIMITS.textMax * 3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Art. 1º ..."
            className={`mt-1 ${input}`}
          />
          <p className={`mt-1 ${muted}`}>Texto colado não recebe aviso de mudança: para isso, use o link oficial.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lei-artigos" className={label}>
            Artigos <span className="font-normal text-zinc-500">(recomendado)</span>
          </label>
          <input
            id="lei-artigos"
            value={articles}
            maxLength={100}
            onChange={(e) => setArticles(e.target.value)}
            placeholder="Ex.: 1 a 30"
            className={`mt-1 ${input}`}
          />
          <p className={`mt-1 ${muted}`}>Leis grandes precisam de um intervalo, como &quot;5&quot; ou &quot;37 a 41&quot;.</p>
        </div>
        <div>
          <label htmlFor="lei-banca" className={label}>
            Banca <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <select id="lei-banca" value={banca} onChange={(e) => setBanca(e.target.value as Banca | "")} className={`mt-1 ${input}`}>
            <option value="">Qualquer banca</option>
            {BANCA_IDS.map((id) => (
              <option key={id} value={id}>
                {BANCAS[id]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LevelPicker value={level} onChange={setLevel} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={!ready}>
          {busy ? "Gerando…" : "Gerar cartões de lei seca"}
        </button>
        {busy && (
          <>
            <button type="button" className={btnSecondary} onClick={onCancel}>
              Cancelar
            </button>
            <span className={muted} role="status">
              A IA está lendo a lei. Isso pode levar até 2 minutos.
            </span>
          </>
        )}
      </div>
    </form>
  );
}
