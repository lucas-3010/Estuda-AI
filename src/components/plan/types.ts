import type { GeneratedStep } from "@/lib/validation/plan";

/** `lawRef` só nos cartões de lei seca: o artigo citado. */
export type DraftCard = { key: string; front: string; back: string; lawRef?: string };
export type DraftStep = { key: string; title: string; goal: string; cards: DraftCard[]; regenerating?: boolean };

let counter = 0;
export const newKey = () => `k${++counter}`;

type StepLike = { title: string; goal: string; cards: Array<{ front: string; back: string; law_ref?: string }> };

export function toDraftStep(step: GeneratedStep | StepLike): DraftStep {
  return {
    key: newKey(),
    title: step.title,
    goal: step.goal,
    cards: step.cards.map((c) => ({
      key: newKey(),
      front: c.front,
      back: c.back,
      ...("law_ref" in c && c.law_ref ? { lawRef: c.law_ref } : {}),
    })),
  };
}
