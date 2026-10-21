import type { GeneratedStep } from "@/lib/validation/plan";

export type DraftCard = { key: string; front: string; back: string };
export type DraftStep = { key: string; title: string; goal: string; cards: DraftCard[]; regenerating?: boolean };

let counter = 0;
export const newKey = () => `k${++counter}`;

export function toDraftStep(step: GeneratedStep): DraftStep {
  return {
    key: newKey(),
    title: step.title,
    goal: step.goal,
    cards: step.cards.map((c) => ({ key: newKey(), front: c.front, back: c.back })),
  };
}
