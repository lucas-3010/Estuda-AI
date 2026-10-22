import { shuffle, type QuizQuestion } from "@/lib/quiz";

/** Questão de uma prova do ENEM, como gravada em public/enem/ por scripts/enem-build.mjs. */
export type EnemQuestion = {
  id: string;
  year: number;
  number: number;
  /** Só nas questões de língua estrangeira. */
  language: "ingles" | "espanhol" | null;
  context: string;
  question: string;
  options: string[];
  answer: number;
};

export const ENEM_AREAS = {
  linguagens: "Linguagens",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
  matematica: "Matemática",
} as const;
export type EnemArea = keyof typeof ENEM_AREAS;
export const ENEM_AREA_IDS = Object.keys(ENEM_AREAS) as EnemArea[];

export const ENEM_FIRST_YEAR = 2009;
export const ENEM_LAST_YEAR = 2023;
export const ENEM_YEARS = Array.from(
  { length: ENEM_LAST_YEAR - ENEM_FIRST_YEAR + 1 },
  (_, i) => ENEM_LAST_YEAR - i,
);

export type EnemLanguage = "ingles" | "espanhol";
export const ENEM_LANGUAGES: Record<EnemLanguage, string> = { ingles: "Inglês", espanhol: "Espanhol" };

export type EnemFilter = {
  /** Sem área: todas as quatro. */
  area: EnemArea | null;
  /** Sem ano: todos os anos. */
  year: number | null;
  language: EnemLanguage;
};

export async function loadEnemArea(area: EnemArea): Promise<EnemQuestion[]> {
  const res = await fetch(`/enem/${area}.json`);
  if (!res.ok) throw new Error(`Falha ao carregar ${area}`);
  return res.json();
}

export async function loadEnem(area: EnemArea | null): Promise<EnemQuestion[]> {
  const lists = await Promise.all((area ? [area] : ENEM_AREA_IDS).map(loadEnemArea));
  return lists.flat();
}

/** Sorteia questões do ENEM, deixando de fora a língua estrangeira que a pessoa não escolheu. */
export function pickEnem(
  questions: EnemQuestion[],
  filter: Pick<EnemFilter, "year" | "language">,
  count: number,
  random: () => number = Math.random,
): EnemQuestion[] {
  const pool = questions.filter(
    (q) => (filter.year === null || q.year === filter.year) && (q.language === null || q.language === filter.language),
  );
  return shuffle(pool, random).slice(0, count);
}

export function enemToQuiz(q: EnemQuestion): QuizQuestion {
  return {
    cardId: q.id,
    prompt: [q.context, q.question].filter(Boolean).join("\n\n"),
    options: q.options,
    answer: q.answer,
    source: `ENEM ${q.year} · Questão ${q.number}`,
  };
}
