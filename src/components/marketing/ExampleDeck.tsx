"use client";

import { useState } from "react";

const EXAMPLES = [
  {
    id: "enem",
    label: "ENEM · Biologia",
    topic: "Citologia: organelas celulares",
    cards: [
      { front: "Qual organela produz a maior parte do ATP da célula?", back: "A mitocôndria, por meio da respiração celular." },
      { front: "Qual a função do complexo de Golgi?", back: "Modificar, empacotar e enviar proteínas e lipídios produzidos no retículo." },
      { front: "Que organela existe em células vegetais e faz fotossíntese?", back: "O cloroplasto, que contém clorofila." },
    ],
  },
  {
    id: "concurso",
    label: "Concurso · Direito Constitucional",
    topic: "Direitos e garantias fundamentais",
    cards: [
      { front: "Qual remédio constitucional protege a liberdade de locomoção?", back: "O habeas corpus (art. 5º, LXVIII, da CF)." },
      { front: "Os direitos fundamentais podem ser abolidos por emenda constitucional?", back: "Não. Os direitos e garantias individuais são cláusula pétrea (art. 60, § 4º, IV)." },
      { front: "Qual remédio garante acesso a informações pessoais em bancos de dados públicos?", back: "O habeas data (art. 5º, LXXII)." },
    ],
  },
  {
    id: "ingles",
    label: "Inglês · Phrasal verbs",
    topic: "Phrasal verbs do dia a dia",
    cards: [
      { front: "O que significa *give up*?", back: "Desistir. Ex.: *Don't give up on your goals.*" },
      { front: "Como dizer “procurar algo” com phrasal verb?", back: "*Look for*. Ex.: *I'm looking for my keys.*" },
      { front: "O que significa *find out*?", back: "Descobrir uma informação. Ex.: *I found out the truth.*" },
    ],
  },
];

function plain(text: string) {
  return text.replace(/\*/g, "");
}

export function ExampleDeck() {
  const [active, setActive] = useState(EXAMPLES[0].id);
  const [flipped, setFlipped] = useState<number | null>(null);
  const example = EXAMPLES.find((e) => e.id === active) ?? EXAMPLES[0];

  return (
    <div>
      <div role="tablist" aria-label="Exemplos de matérias" className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e.id}
            role="tab"
            type="button"
            aria-selected={e.id === active}
            onClick={() => {
              setActive(e.id);
              setFlipped(null);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              e.id === active
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Tema digitado: <strong className="text-zinc-900 dark:text-zinc-100">“{example.topic}”</strong>. Toque num cartão
        para ver a resposta.
      </p>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {example.cards.map((c, i) => (
          <li key={c.front}>
            <button
              type="button"
              onClick={() => setFlipped(flipped === i ? null : i)}
              aria-pressed={flipped === i}
              className="flex min-h-36 w-full flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {flipped === i ? "Resposta" : "Pergunta"}
              </span>
              <span className="mt-2">{plain(flipped === i ? c.back : c.front)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
