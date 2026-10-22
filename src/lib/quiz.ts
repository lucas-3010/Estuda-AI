import type { ImportedQuestion } from "@/lib/validation/plan";

export type QuizCard = { id: string; front: string; back: string; stepId: string | null };

export type QuizQuestion = {
  cardId: string;
  prompt: string;
  options: string[];
  answer: number;
  /** Só no simulado com IA: por que a certa está certa e as outras erradas. */
  explanation?: string;
  /** De onde veio a questão, como "ENEM 2023 · Questão 100". */
  source?: string;
  /** Aviso mostrado depois da resposta, como um gabarito que não veio da prova. */
  note?: string;
};

export const MIN_QUIZ_CARDS = 4;

export function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Monta um quiz de múltipla escolha com as respostas dos próprios cartões. As
 * alternativas erradas vêm de preferência da mesma etapa, para ficarem parecidas.
 */
export function buildQuiz(cards: QuizCard[], count: number, random: () => number = Math.random): QuizQuestion[] {
  const usable = cards.filter((c) => c.back.trim());
  if (usable.length < MIN_QUIZ_CARDS) return [];

  return shuffle(usable, random)
    .slice(0, count)
    .map((card) => {
      const others = usable.filter((c) => c.id !== card.id && c.back.trim() !== card.back.trim());
      const sameStep = shuffle(others.filter((c) => c.stepId && c.stepId === card.stepId), random);
      const rest = shuffle(others.filter((c) => !sameStep.includes(c)), random);
      const wrong: string[] = [];
      for (const c of [...sameStep, ...rest]) {
        if (wrong.length === 3) break;
        if (!wrong.includes(c.back)) wrong.push(c.back);
      }
      const options = shuffle([card.back, ...wrong], random);
      return { cardId: card.id, prompt: card.front, options, answer: options.indexOf(card.back) };
    })
    .filter((q) => q.options.length === MIN_QUIZ_CARDS);
}

/** Escolhe até `max` cartões ao acaso para servir de base ao simulado com IA. */
export function sampleCards<T>(cards: T[], max: number, random: () => number = Math.random): T[] {
  return shuffle(cards, random).slice(0, max);
}

export const NO_KEY_NOTE =
  "Esta prova veio sem gabarito para esta questão: a resposta foi sugerida pela IA e pode estar errada.";

/** Questão de uma prova importada pela pessoa, pronta para o quiz. */
export function importedToQuiz(q: ImportedQuestion, title: string, position: number): QuizQuestion {
  return {
    cardId: `prova-${position}`,
    prompt: q.statement,
    options: q.options,
    answer: q.answer,
    source: `${title} · Questão ${q.number}`,
    note: q.fromKey ? undefined : NO_KEY_NOTE,
  };
}

/** A prova inteira na ordem original, ou uma amostra sorteada quando há limite. */
export function pickFromExam<T>(questions: T[], count: number | null, random: () => number = Math.random): T[] {
  return count === null ? questions : shuffle(questions, random).slice(0, count);
}
