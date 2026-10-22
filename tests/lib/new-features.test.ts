import { describe, expect, test } from "vitest";
import { articleKey, htmlToText, isLawUrl, parseRange, selectArticles, splitArticles } from "@/lib/law";
import { mistakeCard } from "@/lib/mistakes";
import { parseVoiceCommand, speakableText } from "@/lib/speech";
import { memoryOf, percent, projectExam, recallChance } from "@/lib/srs/thermometer";
import { editalCardCount } from "@/lib/ai/prompt";
import { makeCardRow } from "../srs/helpers";

const now = new Date("2026-10-22T12:00:00Z");

describe("termômetro", () => {
  const studied = makeCardRow({ id: "a", state: 2, stability: 10, last_review: "2026-10-20T12:00:00Z", reps: 3 });
  const fresh = makeCardRow({ id: "b", state: 0 });

  test("cartão novo vale 0 e estudado fica entre 0 e 1", () => {
    expect(recallChance(fresh, now)).toBe(0);
    const r = recallChance(studied, now);
    expect(r).toBeGreaterThan(0.8);
    expect(r).toBeLessThanOrEqual(1);
  });

  test("memória considera só os estudados e cobertura conta o plano todo", () => {
    const m = memoryOf([studied, fresh], now);
    expect(m.studied).toBe(1);
    expect(m.coverage).toBe(0.5);
    expect(m.memory).toBeCloseTo(recallChance(studied, now));
    expect(memoryOf([fresh], now).memory).toBeNull();
  });

  test("projeção: mantendo o ritmo supera parar hoje", () => {
    const p = projectExam({ cards: [studied, fresh], now, examDate: "2026-12-01", newPerDay: 1, retention: 0.9 })!;
    expect(p.days).toBeGreaterThan(30);
    expect(p.keepPace).toBeCloseTo(0.9);
    expect(p.ifStop).toBeLessThan(p.keepPace);
    expect(projectExam({ cards: [studied], now, examDate: "2026-01-01", newPerDay: 1, retention: 0.9 })).toBeNull();
    expect(percent(0.723)).toBe("72%");
  });
});

describe("lei seca", () => {
  const html = `<p>Art. 1º A República <strike>antiga redação</strike> é formada.</p>
<p>Parágrafo único. Todo o poder emana do povo.</p><p>Art. 5º Todos são iguais&nbsp;perante a lei.</p>
<p>Art. 121-A. Texto novo.</p><p>Art. 10. Dez.</p>`;
  const articles = splitArticles(htmlToText(html));

  test("divide artigos, junta parágrafos e tira texto riscado", () => {
    expect(articles.map((a) => a.key)).toEqual(["1", "5", "121-A", "10"]);
    expect(articles[0].text).toContain("Parágrafo único");
    expect(articles[0].text).not.toContain("antiga");
    expect(articles[1].text).toBe("Art. 5º Todos são iguais perante a lei.");
  });

  test("referências e intervalos", () => {
    expect(articleKey("Art. 5º, LXIII")).toBe("5");
    expect(articleKey("art. 121-A, § 2º")).toBe("121-A");
    expect(parseRange("arts. 5º ao 10")).toEqual({ from: 5, to: 10 });
    expect(selectArticles(articles, { from: 5, to: 10 }).map((a) => a.key)).toEqual(["5", "10"]);
  });

  test("só baixa leis de sites oficiais", () => {
    expect(isLawUrl("https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm")).toBe(true);
    expect(isLawUrl("https://planalto.gov.br.evil.com/x")).toBe(false);
    expect(isLawUrl("http://169.254.169.254/")).toBe(false);
  });
});

describe("caderno de erros", () => {
  test("frente com enunciado e alternativas; verso com a certa, a marcada e a explicação", () => {
    const card = mistakeCard(
      { cardId: "x", prompt: "Quanto é 2+2?", options: ["3", "4"], answer: 1, explanation: "Soma.", source: "ENEM 2020" },
      0,
    );
    expect(card.front).toContain("Quanto é 2+2?");
    expect(card.front).toContain("**B)** 4");
    expect(card.back).toContain("Resposta certa: B) 4");
    expect(card.back).toContain("Você tinha marcado A) 3");
    expect(card.back).toContain("Soma.");
  });
});

describe("modo áudio", () => {
  test("tira Markdown e código do que é lido", () => {
    expect(speakableText("**Negrito** e `código`\n```js\nx()\n```")).toBe("Negrito e código (trecho de código na tela)");
  });
  test("entende comandos de voz", () => {
    expect(parseVoiceCommand("Não sei.")).toBe("giveup");
    expect(parseVoiceCommand("Fácil")).toEqual({ rating: 4 });
    expect(parseVoiceCommand("difícil")).toEqual({ rating: 2 });
    expect(parseVoiceCommand("próximo")).toBe("next");
    expect(parseVoiceCommand("a mitocôndria")).toBeNull();
  });
});

test("edital: mais cartões para disciplinas de peso maior, dentro dos limites", () => {
  expect(editalCardCount(5, 30)).toBe(15);
  expect(editalCardCount(1, 1)).toBeGreaterThanOrEqual(6);
  expect(editalCardCount(5, 3)).toBeGreaterThan(editalCardCount(1, 3));
});
