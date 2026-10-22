// Agenda do dia: transforma a fila de hoje e o tempo disponível num roteiro em blocos.
// A ordem segue o que mais rende: revisões vencidas antes de cartões novos e, dentro de cada
// tipo, a disciplina com mais peso no edital, menos memória e prova mais perto.

import type { CardRow } from "@/lib/supabase/database.types";

/** Tempo médio por cartão revisado e por cartão novo (com resposta digitada), em segundos. */
export const REVIEW_SECONDS = 30;
export const NEW_SECONDS = 60;
/** Simulado no fim do dia, quando sobra tempo. */
export const QUIZ_MINUTES = 15;
/** Blocos menores que isto não valem a troca de assunto. */
const MIN_BLOCK = 3;

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type AgendaStep = {
  id: string;
  title: string;
  planId: string;
  planTopic: string;
  /** Peso no edital (1 a 5); 1 fora de edital. */
  weight: number;
  /** Chance média de lembrar hoje (0 a 1), ou null sem cartões estudados. */
  memory: number | null;
  /** Dias até a prova do plano, ou null sem data. */
  daysToExam: number | null;
};

export type AgendaBlock = {
  kind: "review" | "new" | "quiz";
  title: string;
  detail: string;
  minutes: number;
  cards: number;
  href: string;
};

export type Agenda = {
  blocks: AgendaBlock[];
  minutes: number;
  /** Cartões da fila de hoje que não couberam no tempo. */
  leftover: number;
};

/** Prioridade da etapa: peso × (1 − memória) × urgência da prova. */
export function stepPriority(step: AgendaStep): number {
  const urgency =
    step.daysToExam === null || step.daysToExam < 0 ? 1 : step.daysToExam <= 7 ? 3 : step.daysToExam <= 30 ? 2 : 1;
  const forgetting = step.memory === null ? 1 : 1 - step.memory;
  return step.weight * (0.25 + forgetting) * urgency;
}

function minutesFor(cards: number, seconds: number) {
  return Math.max(1, Math.ceil((cards * seconds) / 60));
}

export function buildAgenda(input: {
  minutes: number;
  queue: CardRow[];
  steps: AgendaStep[];
  /** Encerra o dia com um simulado quando sobra tempo. */
  quiz: boolean;
}): Agenda {
  const stepsById = new Map(input.steps.map((s) => [s.id, s]));
  const count = (kind: "review" | "new") => {
    const counts = new Map<string, number>();
    for (const card of input.queue) {
      if ((card.state === 0) !== (kind === "new")) continue;
      const key = card.step_id && stepsById.has(card.step_id) ? card.step_id : "";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts]
      .map(([stepId, cards]) => ({ step: stepsById.get(stepId) ?? null, cards }))
      .sort((a, b) => (b.step ? stepPriority(b.step) : 0) - (a.step ? stepPriority(a.step) : 0));
  };

  const blocks: AgendaBlock[] = [];
  let remaining = Math.max(0, Math.round(input.minutes));
  let leftover = 0;

  for (const kind of ["review", "new"] as const) {
    const seconds = kind === "review" ? REVIEW_SECONDS : NEW_SECONDS;
    for (const { step, cards } of count(kind)) {
      const fit = Math.min(cards, Math.floor((remaining * 60) / seconds));
      if (fit === 0 || minutesFor(fit, seconds) < Math.min(MIN_BLOCK, minutesFor(cards, seconds))) {
        leftover += cards;
        continue;
      }
      const minutes = minutesFor(fit, seconds);
      remaining -= minutes;
      leftover += cards - fit;
      const name = step ? step.title : "Outros cartões";
      const plural = fit === 1 ? "cartão" : "cartões";
      blocks.push({
        kind,
        title: kind === "review" ? `Revisar ${name}` : `Cartões novos de ${name}`,
        detail:
          kind === "review"
            ? `${fit} ${plural} ${fit === 1 ? "vencido" : "vencidos"}${step ? ` · ${step.planTopic}` : ""}`
            : `${fit} ${plural} ${fit === 1 ? "novo" : "novos"}${step ? ` · ${step.planTopic}` : ""}`,
        minutes,
        cards: fit,
        href: step
          ? `/revisar?plano=${step.planId}&etapa=${step.id}&limite=${fit}`
          : `/revisar?limite=${fit}`,
      });
    }
  }

  if (input.quiz && remaining >= 10) {
    const minutes = Math.min(QUIZ_MINUTES, remaining);
    remaining -= minutes;
    blocks.push({
      kind: "quiz",
      title: "Simulado",
      detail: "Questões no estilo da prova; o que errar vai para o caderno de erros",
      minutes,
      cards: 0,
      href: "/quiz",
    });
  }

  return { blocks, minutes: blocks.reduce((n, b) => n + b.minutes, 0), leftover };
}

/** "1h 25min", "40min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function calendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Link que abre o Google Agenda com o roteiro do dia como um evento. */
export function googleCalendarUrl(agenda: Agenda, start: Date, siteUrl: string): string {
  const end = new Date(start.getTime() + Math.max(agenda.minutes, 5) * 60_000);
  const details = [
    ...agenda.blocks.map((b) => `• ${b.minutes} min: ${b.title} (${b.detail})`),
    "",
    `Abrir a agenda: ${siteUrl}/agenda`,
  ].join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Estudo do dia (Estuda-AI)",
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
