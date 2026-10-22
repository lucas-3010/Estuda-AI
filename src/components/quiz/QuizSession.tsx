"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccount } from "@/lib/data/account";
import { listCards } from "@/lib/data/cards";
import { listPlansWithProgress, type PlanWithProgress } from "@/lib/data/plans";
import { addMistake } from "@/lib/data/mistakes";
import { deletePracticeExam, listPracticeExams, type PracticeExam } from "@/lib/data/practiceExams";
import { AiError } from "@/lib/ai/errors";
import {
  ENEM_AREAS,
  ENEM_AREA_IDS,
  ENEM_LANGUAGES,
  ENEM_YEARS,
  enemToQuiz,
  loadEnem,
  pickEnem,
  type EnemArea,
  type EnemLanguage,
} from "@/lib/enem";
import { callGenerate } from "@/lib/generateClient";
import { mistakeCard } from "@/lib/mistakes";
import {
  MIN_QUIZ_CARDS,
  buildQuiz,
  importedToQuiz,
  pickFromExam,
  sampleCards,
  type QuizQuestion,
} from "@/lib/quiz";
import { BANCAS, BANCA_IDS, EXAM_SIZES, type Banca, type GeneratedExam } from "@/lib/validation/plan";
import { Markdown } from "@/components/Markdown";
import { btnPrimary, btnSecondary, card, input, label, muted } from "@/components/ui/styles";
import { ImportExam } from "./ImportExam";

const SIZES = [5, 10, 20];
const LETTERS = ["A", "B", "C", "D", "E"];
/** Cartões enviados à IA como base do simulado. */
const EXAM_BASE_CARDS = 40;

/** Número de questões; `null` é a prova inteira. */
type Size = number | null;

type Source = "enem" | "provas" | "cards" | "ai";

const SOURCES: Array<[Source, string]> = [
  ["enem", "Questões do ENEM"],
  ["provas", "Provas que importei"],
  ["cards", "Com meus cartões"],
  ["ai", "Simulado com IA"],
];

const SOURCE_HELP: Record<Source, string> = {
  enem: "Questões reais das provas do ENEM de 2009 a 2023, com o gabarito oficial do INEP (fonte: enem.dev). Escolha a área e o ano.",
  provas:
    "Treine com provas antigas de vestibular, concurso ou faculdade que você enviou. As questões são as da prova, sem mudanças.",
  cards: "Responda em múltipla escolha, como na prova. As alternativas vêm das respostas dos seus próprios cartões.",
  ai: "A IA escreve questões novas no estilo da banca, a partir dos cartões do plano, e explica cada alternativa. Conta como uma geração com IA.",
};

type Phase =
  | { kind: "setup" }
  | { kind: "loading" }
  | { kind: "playing"; questions: QuizQuestion[]; index: number; picked: number | null; correct: number }
  | { kind: "done"; total: number; correct: number };

/** Situação da questão errada no caderno de erros. */
type MistakeState = "saving" | "saved" | "failed";

/** Questões que não são cartões da pessoa vão para o caderno de erros quando ela erra. */
const MISTAKE_SOURCES: Source[] = ["enem", "provas", "ai"];

export function QuizSession() {
  const [plans, setPlans] = useState<PlanWithProgress[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [size, setSize] = useState<Size>(10);
  const [source, setSource] = useState<Source>("enem");
  const [banca, setBanca] = useState<Banca>("enem");
  const [area, setArea] = useState<EnemArea | "">("");
  const [year, setYear] = useState("");
  const [language, setLanguage] = useState<EnemLanguage>("ingles");
  const [exams, setExams] = useState<PracticeExam[] | null>(null);
  const [examId, setExamId] = useState("");
  const [importing, setImporting] = useState(false);
  const [filesAllowed, setFilesAllowed] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [mistake, setMistake] = useState<MistakeState | null>(null);
  const [savedMistakes, setSavedMistakes] = useState(0);
  // Plano do caderno: o do simulado; nas questões reais, o "Caderno de erros".
  const [mistakesPlan, setMistakesPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlansWithProgress()
      .then(setPlans)
      .catch(() => setError("Não foi possível carregar seus planos."));
    getAccount()
      .then((account) => setFilesAllowed(account.plan.files))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (source !== "provas" || exams !== null) return;
    listPracticeExams()
      .then((list) => {
        setExams(list);
        setExamId((current) => current || list[0]?.id || "");
      })
      .catch(() => setError("Não foi possível carregar suas provas."));
  }, [source, exams]);

  async function startEnem() {
    setError(null);
    setPhase({ kind: "loading" });
    try {
      const all = await loadEnem(area || null);
      const picked = pickEnem(all, { year: year ? Number(year) : null, language }, size ?? 10);
      if (picked.length === 0) {
        setError("Não há questões com esses filtros. Escolha outra área ou outro ano.");
        setPhase({ kind: "setup" });
        return;
      }
      setPhase({ kind: "playing", questions: picked.map(enemToQuiz), index: 0, picked: null, correct: 0 });
    } catch {
      setError("Não foi possível carregar as questões do ENEM. Tente de novo.");
      setPhase({ kind: "setup" });
    }
  }

  function startPractice() {
    const exam = exams?.find((e) => e.id === examId);
    if (!exam || exam.questions.length === 0) {
      setError("Escolha uma prova importada ou importe uma nova.");
      return;
    }
    setError(null);
    const questions = pickFromExam(
      exam.questions.map((q, i) => importedToQuiz(q, exam.title, i)),
      size,
    );
    setPhase({ kind: "playing", questions, index: 0, picked: null, correct: 0 });
  }

  async function removeExam(id: string) {
    try {
      await deletePracticeExam(id);
      const rest = (exams ?? []).filter((e) => e.id !== id);
      setExams(rest);
      setExamId(rest[0]?.id ?? "");
    } catch {
      setError("Não foi possível apagar a prova. Tente de novo.");
    }
  }

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
      const count = size !== null && (EXAM_SIZES as readonly number[]).includes(size) ? size : 10;
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
    setSavedMistakes(0);
    setMistake(null);
    if (source === "ai") return startExam();
    if (source === "enem") return startEnem();
    if (source === "provas") return startPractice();
    setError(null);
    setPhase({ kind: "loading" });
    try {
      const cards = await listCards(planId ? { planId } : {});
      const questions = buildQuiz(
        cards.map((c) => ({ id: c.id, front: c.front, back: c.back, stepId: c.step_id })),
        size ?? 10,
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
    const question = phase.questions[phase.index];
    const right = option === question.answer;
    setPhase({ ...phase, picked: option, correct: phase.correct + (right ? 1 : 0) });
    if (!right && MISTAKE_SOURCES.includes(source)) void saveMistake(question, option);
  }

  async function saveMistake(question: QuizQuestion, option: number) {
    setMistake("saving");
    try {
      await addMistake(source === "ai" ? planId || null : null, mistakeCard(question, option));
      setMistake("saved");
      setSavedMistakes((n) => n + 1);
      setMistakesPlan(source === "ai" ? planId || null : null);
    } catch {
      setMistake("failed");
    }
  }

  function next() {
    if (phase.kind !== "playing") return;
    if (phase.index + 1 >= phase.questions.length) {
      setPhase({ kind: "done", total: phase.questions.length, correct: phase.correct });
    } else {
      setPhase({ ...phase, index: phase.index + 1, picked: null });
    }
    setMistake(null);
  }

  if (phase.kind === "playing") {
    const q = phase.questions[phase.index];
    return (
      <div className="flex flex-col gap-4">
        <p className={muted} aria-live="polite">
          Pergunta {phase.index + 1} de {phase.questions.length} · {phase.correct} acertos
        </p>
        <div className={card}>
          {q.source && <p className={`mb-3 text-sm font-medium ${muted}`}>{q.source}</p>}
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
        {phase.picked !== null && mistake && (
          <p aria-live="polite" className={`text-sm ${mistake === "failed" ? "text-red-700 dark:text-red-400" : muted}`}>
            {mistake === "saving" && "Guardando no caderno de erros…"}
            {mistake === "saved" && "📒 Questão guardada no seu caderno de erros. Ela volta na revisão até você acertar."}
            {mistake === "failed" && "Não foi possível guardar no caderno de erros."}
          </p>
        )}
        {phase.picked !== null && q.note && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {q.note}
          </p>
        )}
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
        {savedMistakes > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            📒 {savedMistakes === 1 ? "1 questão errada foi" : `${savedMistakes} questões erradas foram`} para o seu caderno de
            erros e {savedMistakes === 1 ? "vai voltar" : "vão voltar"} na revisão.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className={btnPrimary} onClick={() => (source === "ai" ? setPhase({ kind: "setup" }) : start())}>
            {source === "ai" ? "Novo simulado" : source === "enem" ? "Outras questões" : "Jogar de novo"}
          </button>
          {source !== "ai" && (
            <button type="button" className={btnSecondary} onClick={() => setPhase({ kind: "setup" })}>
              Mudar opções
            </button>
          )}
          <Link href={savedMistakes > 0 && mistakesPlan ? `/revisar?plano=${mistakesPlan}` : "/revisar"} className={btnSecondary}>
            Ir para a revisão
          </Link>
        </div>
      </div>
    );
  }


  const sizes: Size[] = source === "ai" ? [...EXAM_SIZES] : source === "provas" ? [...SIZES, null] : SIZES;
  const toggle = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm ${
      active
        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
        : "border-zinc-300 dark:border-zinc-700"
    }`;

  if (source === "provas" && importing) {
    return (
      <div className={card}>
        <ImportExam
          filesAllowed={filesAllowed}
          onCancel={() => setImporting(false)}
          onImported={(exam) => {
            setExams((list) => [exam, ...(list ?? [])]);
            setExamId(exam.id);
            setImporting(false);
          }}
        />
      </div>
    );
  }

  const exam = exams?.find((e) => e.id === examId);

  return (
    <div className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de quiz">
        {SOURCES.map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            onClick={() => {
              setSource(value);
              setError(null);
              if (value === "ai" && (size === null || size > 10)) setSize(10);
              if (value !== "provas" && size === null) setSize(10);
            }}
            className={toggle(source === value)}
          >
            {text}
          </button>
        ))}
      </div>
      <p className={muted}>
        {SOURCE_HELP[source]}{" "}
        {MISTAKE_SOURCES.includes(source)
          ? "Cada questão que você errar vira um cartão no seu caderno de erros."
          : "O quiz não muda o agendamento das revisões."}
      </p>

      {source === "enem" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="enem-area" className={label}>
              Área
            </label>
            <select
              id="enem-area"
              value={area}
              onChange={(e) => setArea(e.target.value as EnemArea | "")}
              className={`mt-1 ${input}`}
            >
              <option value="">Todas as áreas</option>
              {ENEM_AREA_IDS.map((id) => (
                <option key={id} value={id}>
                  {ENEM_AREAS[id]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="enem-ano" className={label}>
              Ano da prova
            </label>
            <select id="enem-ano" value={year} onChange={(e) => setYear(e.target.value)} className={`mt-1 ${input}`}>
              <option value="">Todos os anos</option>
              {ENEM_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {(area === "" || area === "linguagens") && (
            <div>
              <label htmlFor="enem-lingua" className={label}>
                Língua estrangeira
              </label>
              <select
                id="enem-lingua"
                value={language}
                onChange={(e) => setLanguage(e.target.value as EnemLanguage)}
                className={`mt-1 ${input}`}
              >
                {(Object.keys(ENEM_LANGUAGES) as EnemLanguage[]).map((id) => (
                  <option key={id} value={id}>
                    {ENEM_LANGUAGES[id]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {source === "provas" && (
        <div className="flex flex-col gap-3">
          {exams === null ? (
            <p className={muted}>Carregando suas provas…</p>
          ) : exams.length === 0 ? (
            <p className={muted}>Você ainda não importou nenhuma prova.</p>
          ) : (
            <div>
              <label htmlFor="prova" className={label}>
                Prova
              </label>
              <select id="prova" value={examId} onChange={(e) => setExamId(e.target.value)} className={`mt-1 ${input}`}>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.questions.length} questões)
                  </option>
                ))}
              </select>
              {exam && exam.questions.some((q) => !q.fromKey) && (
                <p className={`mt-1 text-sm text-amber-800 dark:text-amber-300`}>
                  Algumas questões desta prova não tinham gabarito: a resposta delas foi sugerida pela IA.
                </p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => setImporting(true)}>
              Importar prova
            </button>
            {exam && (
              <button type="button" className={btnSecondary} onClick={() => removeExam(exam.id)}>
                Apagar esta prova
              </button>
            )}
          </div>
        </div>
      )}

      {(source === "cards" || source === "ai") && (
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
      )}
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
          {sizes.map((n) => (
            <button key={n ?? "todas"} type="button" aria-pressed={size === n} onClick={() => setSize(n)} className={toggle(size === n)}>
              {n ?? "Prova inteira"}
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
        <button
          type="button"
          className={btnPrimary}
          onClick={start}
          disabled={phase.kind === "loading" || (source === "provas" && !exam)}
        >
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
