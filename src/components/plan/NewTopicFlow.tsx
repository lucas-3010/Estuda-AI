"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { AiError, aiErrorMessage } from "@/lib/ai/errors";
import { callGenerate, getApiKey } from "@/lib/apiKey";
import { savePlan } from "@/lib/data/plans";
import type { GeneratedPlan, GeneratedStep } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, card } from "@/components/ui/styles";
import { PlanPreview } from "./PlanPreview";
import { TopicForm, type TopicValues } from "./TopicForm";
import { toDraftStep, type DraftStep } from "./types";

const noop = () => () => {};

function errorText(e: unknown) {
  return aiErrorMessage(e instanceof AiError ? e.code : "network");
}

export function NewTopicFlow() {
  const router = useRouter();
  // undefined no servidor; no navegador, a chave ou null
  const apiKey = useSyncExternalStore(noop, getApiKey, () => undefined);
  const [values, setValues] = useState<TopicValues>({ topic: "", level: "iniciante", context: "" });
  const [steps, setSteps] = useState<DraftStep[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const request = () => ({
    topic: values.topic.trim(),
    level: values.level,
    context: values.context.trim() || undefined,
  });

  async function generatePlan() {
    setError(null);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const plan = await callGenerate<GeneratedPlan>({ mode: "plan", ...request() }, abort.current.signal);
      setSteps(plan.steps.map(toDraftStep));
    } catch (e) {
      if (!abort.current.signal.aborted) setError(errorText(e));
    } finally {
      setBusy(false);
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
    } catch (e) {
      setError(errorText(e));
      setSteps((current) => current?.map((s) => (s.key === stepKey ? { ...s, regenerating: false } : s)) ?? null);
    }
  }

  async function save() {
    if (!steps) return;
    const cleaned = steps.map((s) => ({
      title: s.title,
      goal: s.goal,
      cards: s.cards
        .map((c) => ({ front: c.front.trim(), back: c.back.trim() }))
        .filter((c) => c.front && c.back),
    }));
    if (cleaned.length === 0) {
      setError("O plano precisa de pelo menos uma etapa.");
      return;
    }
    if (cleaned.some((s) => s.cards.length === 0)) {
      setError("Há etapa sem cartões. Apague a etapa ou adicione cartões com frente e verso.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await savePlan({ ...request(), plan: { steps: cleaned } });
      router.push("/");
    } catch {
      setError("Não foi possível salvar o plano. Tente de novo.");
      setSaving(false);
    }
  }

  if (apiKey === null) {
    return (
      <div className={card}>
        <p>
          Para gerar planos com IA, cole sua chave da Anthropic em{" "}
          <Link href="/configuracoes" className="font-medium text-indigo-700 underline dark:text-indigo-400">
            Configurações
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!steps && (
        <TopicForm
          values={values}
          onChange={setValues}
          onSubmit={generatePlan}
          onCancel={() => abort.current?.abort()}
          busy={busy}
        />
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {steps && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-zinc-600 dark:text-zinc-400">
              Revise o plano para <strong>{values.topic.trim()}</strong>. Nada é salvo até você clicar em
              “Salvar plano”.
            </p>
            <button type="button" className={btnSecondary} onClick={() => setSteps(null)}>
              Voltar ao tema
            </button>
          </div>
          <PlanPreview steps={steps} onChange={setSteps} onRegenerate={regenerate} />
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
