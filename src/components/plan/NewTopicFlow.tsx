"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AiError, aiErrorMessage, type AiErrorCode } from "@/lib/ai/errors";
import { getAccount, type Account } from "@/lib/data/account";
import { saveLawArticles } from "@/lib/data/law";
import { savePlan, setPlanKind } from "@/lib/data/plans";
import { callGenerate } from "@/lib/generateClient";
import type { GeneratedPlan, GeneratedStep, LawResult } from "@/lib/validation/plan";
import { EditalFlow } from "./EditalFlow";
import { LawForm, type LawRequest } from "./LawForm";
import { btnPrimary, btnSecondary, muted } from "@/components/ui/styles";
import { PlanPreview } from "./PlanPreview";
import { SourceForm, type Material } from "./SourceForm";
import { TopicForm, type TopicValues } from "./TopicForm";
import { toDraftStep, type DraftStep } from "./types";

const UPGRADE_CODES: AiErrorCode[] = ["quota_exceeded", "files_not_allowed"];

type Mode = "topic" | "source" | "edital" | "law";

const MODES: Array<[Mode, string]> = [
  ["topic", "A partir de um tema"],
  ["source", "Do meu material"],
  ["edital", "Edital do concurso"],
  ["law", "Lei seca"],
];

/** Dados da lei seca guardados até o plano ser salvo. */
type LawMeta = { lawName: string; sourceUrl: string | null; articles: LawResult["articles"] };

export function NewTopicFlow() {
  const router = useRouter();
  // O radar de editais abre esta página com ?edital=<link do edital>.
  const editalUrl = useSearchParams().get("edital");
  const [mode, setMode] = useState<Mode>(editalUrl === null ? "topic" : "edital");
  const [account, setAccount] = useState<Account | null>(null);
  const [values, setValues] = useState<TopicValues>({ topic: "", level: "iniciante", context: "" });
  const [steps, setSteps] = useState<DraftStep[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade: boolean } | null>(null);
  const [law, setLaw] = useState<LawMeta | null>(null);
  const abort = useRef<AbortController | null>(null);

  const refreshAccount = () => getAccount().then(setAccount).catch(() => undefined);
  useEffect(() => {
    void refreshAccount();
  }, []);

  function showError(e: unknown) {
    const code: AiErrorCode = e instanceof AiError ? e.code : "network";
    setError({ text: aiErrorMessage(code), upgrade: UPGRADE_CODES.includes(code) });
  }

  const request = () => ({
    topic: values.topic.trim(),
    level: values.level,
    context: values.context.trim() || undefined,
  });

  async function generatePlan(source?: Material) {
    setError(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const body = !source
        ? { mode: "plan" as const, ...request() }
        : source.kind === "link"
          ? { mode: "link" as const, ...request(), url: source.url }
          : { mode: "source" as const, ...request(), source };
      const plan = await callGenerate<GeneratedPlan>(body, abort.current.signal);
      setSteps(plan.steps.map(toDraftStep));
    } catch (e) {
      if (!abort.current.signal.aborted) showError(e);
    } finally {
      setBusy(false);
      void refreshAccount();
    }
  }

  async function generateLaw(input: LawRequest) {
    setError(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const result = await callGenerate<LawResult>({ mode: "law", ...input }, abort.current.signal);
      setValues({ topic: `Lei seca: ${input.lawName}`.slice(0, 200), level: input.level, context: "" });
      setLaw({ lawName: input.lawName, sourceUrl: result.sourceUrl, articles: result.articles });
      setSteps(result.steps.map(toDraftStep));
    } catch (e) {
      if (!abort.current.signal.aborted) showError(e);
    } finally {
      setBusy(false);
      void refreshAccount();
    }
  }

  async function regenerate(stepKey: string) {
    const step = steps?.find((s) => s.key === stepKey);
    if (!step) return;
    setError(null);
    setSteps((current) => current?.map((s) => (s.key === stepKey ? { ...s, regenerating: true } : s)) ?? null);
    try {
      const fresh = await callGenerate<GeneratedStep>(
        { mode: "step", ...request(), step: { title: step.title, goal: step.goal } },
        new AbortController().signal,
      );
      setSteps((current) => current?.map((s) => (s.key === stepKey ? toDraftStep(fresh) : s)) ?? null);
      void refreshAccount();
    } catch (e) {
      showError(e);
      setSteps((current) => current?.map((s) => (s.key === stepKey ? { ...s, regenerating: false } : s)) ?? null);
    }
  }

  async function save() {
    if (!steps) return;
    const cleaned = steps.map((s) => ({
      title: s.title,
      goal: s.goal,
      cards: s.cards
        .map((c) => ({
          front: c.front.trim(),
          back: c.back.trim(),
          ...(law ? { origin: "law" as const, law_ref: c.lawRef } : {}),
        }))
        .filter((c) => c.front && c.back),
    }));
    if (cleaned.length === 0) {
      setError({ text: "O plano precisa de pelo menos uma etapa.", upgrade: false });
      return;
    }
    if (cleaned.some((s) => s.cards.length === 0)) {
      setError({ text: "Há etapa sem cartões. Apague a etapa ou adicione cartões com frente e verso.", upgrade: false });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const planId = await savePlan({ ...request(), plan: { steps: cleaned } });
      if (law) {
        await setPlanKind(planId, "law");
        // Sem os artigos guardados, o plano funciona; só não recebe aviso de mudança.
        await saveLawArticles(planId, law.lawName, law.sourceUrl, law.articles).catch(() => undefined);
      }
      router.push("/");
    } catch {
      setError({ text: "Não foi possível salvar o plano. Tente de novo.", upgrade: false });
      setSaving(false);
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-600 dark:text-zinc-400"
    }`;

  return (
    <div className="flex flex-col gap-6">
      {!steps && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Como criar" className="inline-flex flex-wrap rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {MODES.map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  className={tabClass(mode === value)}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
            {account && (
              <p className={muted}>
                {account.remaining} de {account.plan.generations} gerações com IA restantes este mês
              </p>
            )}
          </div>
          {mode === "edital" ? (
            <EditalFlow
              filesAllowed={account?.plan.files ?? false}
              onGenerated={refreshAccount}
              initialUrl={editalUrl ?? ""}
            />
          ) : mode === "law" ? (
            <LawForm onSubmit={generateLaw} onCancel={() => abort.current?.abort()} busy={busy} />
          ) : mode === "topic" ? (
            <TopicForm
              values={values}
              onChange={setValues}
              onSubmit={() => generatePlan()}
              onCancel={() => abort.current?.abort()}
              busy={busy}
            />
          ) : (
            <SourceForm
              values={values}
              onChange={setValues}
              onSubmit={(source) => generatePlan(source)}
              onCancel={() => abort.current?.abort()}
              busy={busy}
              filesAllowed={account?.plan.files ?? false}
            />
          )}
        </>
      )}

      {error && (
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
      )}

      {steps && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-zinc-600 dark:text-zinc-400">
              Revise o plano para <strong>{values.topic.trim()}</strong>. Nada é salvo até você clicar em
              “Salvar plano”.
            </p>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setSteps(null);
                setLaw(null);
              }}
            >
              Voltar ao tema
            </button>
          </div>
          <PlanPreview steps={steps} onChange={setSteps} onRegenerate={law ? undefined : regenerate} />
          <div className="sticky bottom-4 flex justify-end">
            <button type="button" className={`${btnPrimary} shadow-lg`} onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar plano"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
