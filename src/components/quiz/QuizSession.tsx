"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listCards } from "@/lib/data/cards";
import { listPlansWithProgress, type PlanWithProgress } from "@/lib/data/plans";
import { AiError } from "@/lib/ai/errors";
import { callGenerate } from "@/lib/generateClient";
import { MIN_QUIZ_CARDS, buildQuiz, sampleCards, type QuizQuestion } from "@/lib/quiz";
import { BANCAS, BANCA_IDS, EXAM_SIZES, type Banca, type GeneratedExam } from "@/lib/validation/plan";
import { Markdown } from "@/components/Markdown";
import { btnPrimary, btnSecondary, card, input, label, muted } from "@/components/ui/styles";

const SIZES = [5, 10, 20];
const LETTERS = ["A", "B", "C", "D", "E"];
/** Cartões enviados à IA como base do simulado. */
const EXAM_BASE_CARDS = 40;

type Source = "cards" | "ai";

type Phase =
  | { kind: "setup" }
  | { kind: "loading" }
  | { kind: "playing"; questions: QuizQuestion[]; index: number; picked: number | null; correct: number }
  | { kind: "done"; total: number; correct: number };

export function QuizSession() {
  const [plans, setPlans] = useState<PlanWithProgress[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [size, setSize] = useState(10);
  const [source, setSource] = useState<Source>("cards");
  const [banca, setBanca] = useState<Banca>("enem");
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlansWithProgress()
      .then(setPlans)
      .catch(() => setError("Não foi possível carregar seus planos."));
  }, []);

  async function startExam() {
    const plan = plans?.find((p) => p.id === planId);
    if (!plan) {
      setError("Escolha um plano para o simulado.");
      return;
    }
    setError(null);
    setPhase({ kind: "loading" });
    try {
      const cards = await listCards({ planId });
      if (cards.length < MIN_QUIZ_CARDS) {
        setError(`O simulado precisa de pelo menos ${MIN_QUIZ_CARDS} cartões no plano.`);
        setPhase({ kind: "setup" });
        return;
      }
      const count = (EXAM_SIZES as readonly number[]).includes(size) ? size : 10;
      const exam = await callGenerate<GeneratedExam>({
        mode: "exam",
        topic: plan.topic,
        level: plan.level,
        banca,
        count: count as 5 | 10,
        cards: sampleCards(cards, EXAM_BASE_CARDS).map((c) => ({ front: c.front.slice(0, 1000), back: c.back.slice(0, 2000) })),
      });
      const questions: QuizQuestion[] = exam.questions.map((q, i) => ({
        cardId: `simulado-${i}`,
        prompt: q.statement,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      }));
      setPhase({ kind: "playing", questions, index: 0, picked: null, correct: 0 });
    } catch (e) {
      setError(e instanceof AiError ? e.message : "Não foi possível montar o simulado. Tente de novo.");
      setPhase({ kind: "setup" });
    }
  }

  async function start() {
    if (source === "ai") return startExam();
    setError(null);
    setPhase({ kind: "loading" });
    try {
      const cards = await listCards(planId ? { planId } : {});
      const questions = buildQuiz(
        cards.map((c) => ({ id: c.id, front: c.front, back: c.back, stepId: c.step_id })),
        size,
      );
      if (questions.length === 0) {
        setError(`O quiz precisa de pelo menos ${MIN_QUIZ_CARDS} cartões com respostas diferentes.`);
        setPhase({ kind: "setup" });
        return;
      }
      setPhase({ kind: "playing", questions, index: 0, picked: null, correct: 0 });
    } catch {
      setError("Não foi possível carregar os cartões. Tente de novo.");
      setPhase({ kind: "setup" });
    }
  }

  function pick(option: number) {
    if (phase.kind !== "playing" || phase.picked !== null) return;
    const right = option === phase.questions[phase.index].answer;
    setPhase({ ...phase, picked: option, correct: phase.correct + (right ? 1 : 0) });
  }

  function next() {
    if (phase.kind !== "playing") return;
    if (phase.index + 1 >= phase.questions.length) {
      setPhase({ kind: "done", total: phase.questions.length, correct: phase.correct });
    } else {
      setPhase({ ...phase, index: phase.index + 1, picked: null });
    }
  }

  if (phase.kind === "playing") {
    const q = phase.questions[phase.index];
    return (
      <div className="flex flex-col gap-4">
        <p className={muted} aria-live="polite">
          Pergunta {phase.index + 1} de {phase.questions.length} · {phase.correct} acertos
        </p>
        <div className={card}>
          <Markdown source={q.prompt} className="text-lg" />
        </div>
        <ul className="flex flex-col gap-2">
          {q.options.map((option, i) => {
            const state =
              phase.picked === null
                ? "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                : i === q.answer
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                  : i === phase.picked
                    ? "border-red-400 bg-red-50 dark:bg-red-950"
                    : "border-zinc-200 opacity-60 dark:border-zinc-800";
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  disabled={phase.picked !== null}
                  className={`flex w-full gap-3 rounded-xl border p-4 text-left ${state}`}
                >
                  <span className="font-semibold">{LETTERS[i]}</span>
                  <Markdown source={option} className="min-w-0 flex-1" />
                </button>
              </li>
            );
          })}
        </ul>
        {phase.picked !== null && q.explanation && (
          <div className={card}>
            <h3 className="text-sm font-semibold">Explicação</h3>
            <Markdown source={q.explanation} />
          </div>
        )}
        {phase.picked !== null && (
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="font-medium">
              {phase.picked === q.answer ? "Acertou! ✅" : `Errou. A certa é a ${LETTERS[q.answer]}.`}
            </p>
            <button type="button" className={btnPrimary} onClick={next} autoFocus>
              {phase.index + 1 >= phase.questions.length ? "Ver resultado" : "Próxima"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase.kind === "done") {
    const pct = Math.round((phase.correct / phase.total) * 100);
    return (
      <div className={`${card} text-center`}>
        <h2 className="text-xl font-semibold">Resultado</h2>
        <p className="mt-2 text-4xl font-semibold tabular-nums">{pct}%</p>
        <p className={`mt-1 ${muted}`}>
          {phase.correct} de {phase.total} acertos
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className={btnPrimary} onClick={() => (source === "ai" ? setPhase({ kind: "setup" }) : start())}>
            {source === "ai" ? "Novo simulado" : "Jogar de novo"}
          </button>
          <Link href="/revisar" className={btnSecondary}>
            Ir para a revisão
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de quiz">
        {(
          [
            ["cards", "Com meus cartões"],
            ["ai", "Simulado com IA"],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            onClick={() => {
              setSource(value);
              setError(null);
              if (value === "ai" && size > 10) setSize(10);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              source === value
                ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
      <p className={muted}>
        {source === "cards"
          ? "Responda em múltipla escolha, como na prova. As alternativas vêm das respostas dos seus próprios cartões."
          : "A IA escreve questões novas no estilo da banca, a partir dos cartões do plano, e explica cada alternativa. Conta como uma geração com IA."}{" "}
        O quiz não muda o agendamento das revisões.
      </p>
      <div>
        <label htmlFor="quiz-plano" className={label}>
          Plano
        </label>
        <select id="quiz-plano" value={planId} onChange={(e) => setPlanId(e.target.value)} className={`mt-1 ${input}`}>
          {source === "cards" ? <option value="">Todos os planos</option> : <option value="">Escolha um plano</option>}
          {plans?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.topic}
            </option>
          ))}
        </select>
      </div>
      {source === "ai" && (
        <div>
          <label htmlFor="quiz-banca" className={label}>
            Banca ou tipo de prova
          </label>
          <select
            id="quiz-banca"
            value={banca}
            onChange={(e) => setBanca(e.target.value as Banca)}
            className={`mt-1 ${input}`}
          >
            {BANCA_IDS.map((id) => (
              <option key={id} value={id}>
                {BANCAS[id]}
              </option>
            ))}
          </select>
        </div>
      )}
      <fieldset>
        <legend className={label}>Perguntas</legend>
        <div className="mt-2 flex gap-2">
          {(source === "ai" ? EXAM_SIZES : SIZES).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={size === n}
              onClick={() => setSize(n)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                size === n
                  ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div>
        <button type="button" className={btnPrimary} onClick={start} disabled={phase.kind === "loading"}>
          {phase.kind === "loading"
            ? source === "ai"
              ? "A IA está escrevendo o simulado…"
              : "Preparando…"
            : source === "ai"
              ? "Gerar simulado"
              : "Começar quiz"}
        </button>
      </div>
    </div>
  );
}
