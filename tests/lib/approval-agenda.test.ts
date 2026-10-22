import { describe, expect, test, vi } from "vitest";
import { buildAgenda, formatMinutes, googleCalendarUrl, stepPriority, type AgendaStep } from "@/lib/agenda";
import { approvalChance, approvalSentence } from "@/lib/approval";
import { searchEdital, generate, type AiClient } from "@/lib/ai/generate";
import { mistakeCard } from "@/lib/mistakes";
import { radarEmail } from "@/lib/email/radar";
import { addDays, buildQueue, vesperaPlans } from "@/lib/srs/queue";
import { recallChance } from "@/lib/srs/thermometer";
import { advice } from "@/components/stats/Calibration";
import { makeCardRow } from "../srs/helpers";

const now = new Date("2026-10-22T12:00:00Z");
const known = (id: string, step: string, stability = 30) =>
  makeCardRow({ id, step_id: step, state: 2, stability, reps: 3, last_review: "2026-10-21T12:00:00Z", due: "2026-12-01T12:00:00Z" });
const fresh = (id: string, step: string) => makeCardRow({ id, step_id: step, state: 0, due: "2026-10-22T00:00:00Z" });

describe("chance de aprovação", () => {
  const strong = [known("a", "s1"), known("b", "s1")];
  const weak = [fresh("c", "s2"), fresh("d", "s2")];

  test("nota pondera a memória de cada disciplina pelo peso do edital", () => {
    const a = approvalChance(
      [
        { name: "Português", weight: 3, cards: strong },
        { name: "Raciocínio Lógico", weight: 1, cards: weak },
      ],
      70,
      now,
    );
    const r = recallChance(strong[0], now);
    expect(a.score).toBeCloseTo(75 * r);
    expect(a.best?.name).toBe("Raciocínio Lógico");
    expect(a.best?.room).toBeCloseTo(25);
    expect(a.verdict).toBe(a.score >= 70 ? "above" : 70 - a.score <= 5 ? "close" : "below");
  });

  test("frase fala da nota, da nota de corte e do que mais rende", () => {
    const a = approvalChance([{ name: "Raciocínio Lógico", weight: 1, cards: weak }], 70, now);
    expect(a.score).toBe(0);
    expect(a.gap).toBe(70);
    expect(approvalSentence(a)).toBe(
      "Se a prova fosse hoje, você faria cerca de 0 de 100 pontos. A nota de corte foi 70. Faltam 70 pontos. O que mais rende agora é Raciocínio Lógico.",
    );
    const none = approvalChance([{ name: "X", weight: 1, cards: strong }], null, now);
    expect(none.verdict).toBe("unknown");
    expect(approvalSentence(none)).not.toContain("corte");
    const above = approvalChance([{ name: "X", weight: 1, cards: strong }], 10, now);
    expect(above.verdict).toBe("above");
    expect(approvalSentence(above)).toContain("hoje você passaria");
  });
});

describe("agenda do dia", () => {
  const steps: AgendaStep[] = [
    { id: "s1", title: "Português", planId: "p", planTopic: "TJ", weight: 1, memory: 0.9, daysToExam: 60 },
    { id: "s2", title: "Constitucional", planId: "p", planTopic: "TJ", weight: 5, memory: 0.5, daysToExam: 60 },
  ];
  const due = (id: string, step: string) => makeCardRow({ id, step_id: step, state: 2, due: "2026-10-22T00:00:00Z" });

  test("revisões antes de novos, disciplina mais importante primeiro, dentro do tempo", () => {
    const queue = [
      ...Array.from({ length: 10 }, (_, i) => due(`r1-${i}`, "s1")),
      ...Array.from({ length: 40 }, (_, i) => due(`r2-${i}`, "s2")),
      ...Array.from({ length: 30 }, (_, i) => fresh(`n2-${i}`, "s2")),
    ];
    const agenda = buildAgenda({ minutes: 60, queue, steps, quiz: true });
    expect(agenda.blocks.map((b) => b.title)).toEqual([
      "Revisar Constitucional",
      "Revisar Português",
      "Cartões novos de Constitucional",
    ]);
    expect(agenda.blocks[0]).toMatchObject({ minutes: 20, cards: 40, href: "/revisar?plano=p&etapa=s2&limite=40" });
    expect(agenda.blocks[2]).toMatchObject({ cards: 30, minutes: 30 });
    expect(agenda.minutes).toBe(55);
    expect(agenda.leftover).toBe(0);
    // Com menos tempo, os novos que não cabem ficam para amanhã.
    const short = buildAgenda({ minutes: 40, queue, steps, quiz: true });
    expect(short.blocks[2]).toMatchObject({ cards: 15, minutes: 15 });
    expect(short.leftover).toBe(15);
  });

  test("com tempo sobrando, termina com um simulado", () => {
    const agenda = buildAgenda({ minutes: 60, queue: [due("x", "s1")], steps, quiz: true });
    expect(agenda.blocks.at(-1)).toMatchObject({ kind: "quiz", minutes: 15, href: "/quiz" });
    expect(buildAgenda({ minutes: 0, queue: [due("x", "s1")], steps, quiz: true }).blocks).toEqual([]);
  });

  test("prova perto e memória baixa sobem a prioridade", () => {
    expect(stepPriority({ ...steps[0], daysToExam: 5 })).toBeGreaterThan(stepPriority(steps[0]));
    expect(stepPriority(steps[1])).toBeGreaterThan(stepPriority(steps[0]));
  });

  test("formata minutos e monta o link do Google Agenda", () => {
    expect(formatMinutes(85)).toBe("1h 25min");
    expect(formatMinutes(40)).toBe("40min");
    const agenda = buildAgenda({ minutes: 30, queue: [due("x", "s1")], steps, quiz: false });
    const url = new URL(googleCalendarUrl(agenda, new Date("2026-10-22T19:00:00Z"), "https://site"));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20261022T190000Z/20261022T190500Z");
    expect(url.searchParams.get("details")).toContain("Revisar Português");
  });
});

describe("modo véspera", () => {
  const exam = new Date("2026-10-25T12:00:00Z");
  const opts = { now, timeZone: "UTC", newPerDay: 10, newStudiedToday: 0 };

  test("planos com prova nos próximos 7 dias", () => {
    const plans = [
      { id: "a", examDate: "2026-10-25" },
      { id: "b", examDate: "2026-11-30" },
      { id: "c", examDate: "2026-10-01" },
      { id: "d", examDate: null },
    ];
    expect(vesperaPlans(plans, "2026-10-22").map((p) => p.id)).toEqual(["a"]);
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });

  test("sem cartões novos da prova, fracos antes e revisão antecipada", () => {
    const weakSoon = makeCardRow({ id: "w", step_id: "v", state: 2, stability: 2, reps: 2, last_review: "2026-10-21T12:00:00Z", due: "2026-10-28T12:00:00Z" });
    const strong = known("s", "v", 300);
    const other = makeCardRow({ id: "o", step_id: "x", state: 2, due: "2026-10-22T00:00:00Z" });
    const newV = fresh("nv", "v");
    const newX = fresh("nx", "x");
    const queue = buildQueue([other, newV, newX], {
      ...opts,
      vespera: { steps: new Map([["v", { weight: 3, exam }]]), extra: [weakSoon, strong], retention: 0.9, limit: 5 },
    });
    expect(queue.map((c) => c.id)).toEqual(["w", "o", "nx"]);
    // Sem véspera, a fila é a de sempre.
    expect(buildQueue([other, newV, newX], opts).map((c) => c.id)).toEqual(["o", "nv", "nx"]);
  });
});

describe("tenho certeza?", () => {
  test("acerto no chute entra no caderno de erros com o aviso", () => {
    const card = mistakeCard({ cardId: "q", prompt: "2+2?", options: ["3", "4"], answer: 1 }, 1, true);
    expect(card.back).toContain("Você acertou no chute.");
    expect(mistakeCard({ cardId: "q", prompt: "2+2?", options: ["3", "4"], answer: 1 }, 0).back).toContain("Você tinha marcado A) 3.");
  });

  test("conselho da calibração", () => {
    expect(advice(70, 30)).toContain("erra bastante quando tem certeza");
    expect(advice(95, 70)).toContain("sabe mais do que pensa");
    expect(advice(95, 30)).toContain("Boa calibração");
  });
});

function fakeClient(json: unknown) {
  const stream = vi.fn().mockReturnValue({
    finalMessage: async () => ({
      stop_reason: "end_turn",
      content: [
        { type: "server_tool_use", id: "t", name: "web_search", input: {} },
        { type: "web_search_tool_result", tool_use_id: "t", content: [] },
        { type: "text", text: JSON.stringify(json) },
      ],
    }),
  });
  return { client: { messages: { stream } } as unknown as AiClient, stream };
}

describe("pesquisa com IA", () => {
  test("nota de corte usa a pesquisa na web", async () => {
    const { client, stream } = fakeClient({ cutoff: 72.5, note: "TJ-RJ 2022, site da FGV." });
    const result = await generate(client, { mode: "cutoff", exam: "TJ-RJ Analista" });
    expect(result).toEqual({ cutoff: 72.5, note: "TJ-RJ 2022, site da FGV." });
    const params = stream.mock.calls[0][0];
    expect(params.tools[0]).toMatchObject({ type: "web_search_20260318", name: "web_search" });
    expect(params.system).toContain("concursos públicos");
  });

  test("radar devolve o edital encontrado", async () => {
    const found = { found: true, title: "PF 2026 - Agente", url: "https://cebraspe.org.br/pf", published: "2026-10-20" };
    const { client, stream } = fakeClient(found);
    expect(await searchEdital(client, "Polícia Federal", "2026-08-01")).toEqual(found);
    expect(stream.mock.calls[0][0].messages[0].content).toContain("a partir de 2026-08-01");
  });

  test("e-mail do radar leva ao plano com o link do edital", () => {
    const mail = radarEmail({ query: "PF", title: "PF <2026>", url: "https://x.org/e" }, "https://site");
    expect(mail.subject).toBe("Saiu o edital: PF <2026>");
    expect(mail.text).toContain("https://site/novo?edital=https%3A%2F%2Fx.org%2Fe");
    expect(mail.html).toContain("PF &lt;2026&gt;");
  });
});
