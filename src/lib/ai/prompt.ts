import { LEVEL_LABELS, LIMITS, type Level } from "@/lib/validation/plan";

export const SYSTEM_PROMPT = `Você é um professor de programação que cria materiais de estudo com flashcards para repetição espaçada. Escreva sempre em português do Brasil.

Regras para os cartões:
- Cada cartão cobre uma única ideia (cartões atômicos).
- A frente é uma pergunta clara e específica, que tenha uma resposta certa.
- O verso é curto: uma a três frases, ou um trecho de código pequeno com uma linha de explicação.
- Use Markdown. Coloque código em blocos com a linguagem indicada (por exemplo \`\`\`sql ou \`\`\`python) quando um exemplo ajudar.
- Evite cartões de "liste todos os itens"; prefira perguntas que testem entendimento e aplicação.
- Não repita o mesmo conteúdo em cartões diferentes.`;

export function planPrompt(topic: string, level: Level, context?: string): string {
  return [
    `Crie um plano de estudos sobre: ${topic}`,
    `Nível do estudante: ${LEVEL_LABELS[level]} (${level})`,
    context ? `Contexto do estudante: ${context}` : null,
    "",
    `Divida o plano em ${LIMITS.stepsMin} a ${LIMITS.stepsMax} etapas que progridem do básico ao avançado para esse nível.`,
    `Cada etapa tem um título curto, um objetivo de uma frase e de ${LIMITS.cardsMin} a ${LIMITS.cardsMax} cartões.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function stepPrompt(
  topic: string,
  level: Level,
  step: { title: string; goal: string },
  context?: string,
): string {
  return [
    `Plano de estudos sobre: ${topic}`,
    `Nível do estudante: ${LEVEL_LABELS[level]} (${level})`,
    context ? `Contexto do estudante: ${context}` : null,
    "",
    `Gere de novo uma etapa deste plano, com o título "${step.title}" e o objetivo "${step.goal}".`,
    `Mantenha o título e o objetivo e crie de ${LIMITS.cardsMin} a ${LIMITS.cardsMax} cartões novos.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
