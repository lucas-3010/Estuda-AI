import type { Metadata } from "next";
import Link from "next/link";
import { ExampleDeck } from "@/components/marketing/ExampleDeck";
import { Pricing } from "@/components/marketing/Pricing";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: { absolute: "Estuda-AI · Flashcards com IA para qualquer matéria" },
  description:
    "Digite o que você precisa estudar e a IA cria os flashcards. A repetição espaçada avisa a hora certa de revisar. ENEM, concursos, faculdade, idiomas e programação.",
};

const STEPS = [
  {
    title: "Diga o que quer estudar",
    text: "Digite um tema, cole um texto ou envie o PDF e a foto do caderno. Funciona para qualquer matéria.",
  },
  {
    title: "A IA monta o plano",
    text: "Em poucos minutos você recebe um plano em etapas, do básico ao avançado, com flashcards prontos. Dá para editar tudo.",
  },
  {
    title: "Revise na hora certa",
    text: "O algoritmo FSRS calcula quando cada cartão deve voltar. Você revisa menos e lembra mais.",
  },
];

const FEATURES = [
  { title: "Sequência e meta diária", text: "Acompanhe quantos dias seguidos você estudou e bata a meta do dia." },
  { title: "Modo quiz", text: "Treine com perguntas de múltipla escolha, como na prova." },
  { title: "Lembrete por e-mail", text: "Receba todo dia quantos cartões você tem para revisar." },
  { title: "Importa e exporta do Anki", text: "Traga seus baralhos ou leve seus cartões para o Anki." },
  { title: "Celular e computador", text: "Estude no ônibus pelo celular e continue no computador." },
  { title: "Estatísticas", text: "Veja sua taxa de acerto e quantas revisões vêm pela frente." },
];

const AUDIENCES = ["ENEM e vestibulares", "Concursos públicos", "Faculdade", "Idiomas", "Programação", "Certificações"];

const PRINCIPLES = [
  {
    title: "Recordação ativa",
    text: "Tentar lembrar a resposta antes de vê-la fixa mais do que reler o resumo. É o chamado efeito de testagem, estudado por Roediger e Karpicke (2006).",
  },
  {
    title: "Repetição espaçada",
    text: "Revisar pouco antes de esquecer, com intervalos que crescem, combate a curva do esquecimento descrita por Ebbinghaus em 1885.",
  },
  {
    title: "Agenda personalizada",
    text: "O FSRS, algoritmo de código aberto usado também no Anki, estima a chance de você lembrar cada cartão e marca a revisão na hora certa.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-5xl items-center gap-12 px-4 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-medium tracking-wide text-gold-600 uppercase dark:text-gold-500">
              Estudo baseado em evidências
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Estude qualquer matéria com o método que a ciência recomenda.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              Digite o tema ou envie seu material. A inteligência artificial cria o plano de estudos e os flashcards, e a
              repetição espaçada diz o momento certo de revisar cada um.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-md bg-indigo-700 px-5 py-3 font-medium text-white hover:bg-indigo-800">
                Começar grátis
              </Link>
              <Link
                href="#metodo"
                className="rounded-md border border-zinc-300 px-5 py-3 font-medium hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Conhecer o método
              </Link>
            </div>
            <p className="mt-3 text-sm text-zinc-500">Grátis para começar, sem cartão de crédito.</p>
          </div>
          <ReviewMock />
        </section>

        <section aria-label="Para quem é" className="border-y border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <ul className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-x-8 gap-y-2 px-4 text-sm text-zinc-600 dark:text-zinc-400">
            {AUDIENCES.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>

        <section id="metodo" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 py-16">
          <p className="text-sm font-medium tracking-wide text-gold-600 uppercase dark:text-gold-500">O método</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold">Menos horas relendo. Mais conteúdo na memória.</h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
            <ol className="flex flex-col gap-6">
              {PRINCIPLES.map((p, i) => (
                <li key={p.title} className="flex gap-4">
                  <span className="font-serif text-2xl font-semibold text-indigo-700 dark:text-indigo-400">{i + 1}.</span>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ForgettingCurve />
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-6 border-y border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto w-full max-w-5xl px-4">
            <h2 className="text-3xl font-semibold">Como funciona</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="border-t-2 border-indigo-700 pt-4 dark:border-indigo-400">
                  <span className="text-sm font-medium text-zinc-500">Passo {i + 1}</span>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="exemplos" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 py-16">
          <h2 className="text-3xl font-semibold">Exemplos de cartões gerados</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Veja o que a IA cria a partir de um tema.</p>
          <div className="mt-8">
            <ExampleDeck />
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto w-full max-w-5xl px-4">
            <h2 className="text-3xl font-semibold">Tudo o que você precisa para estudar</h2>
            <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="precos" className="mx-auto w-full max-w-5xl scroll-mt-6 px-4 py-16">
          <h2 className="text-3xl font-semibold">Planos</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Comece grátis e assine quando precisar de mais.</p>
          <div className="mt-8">
            <Pricing />
          </div>
        </section>

        <section className="bg-indigo-800 py-16 text-white dark:bg-indigo-950">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Seu próximo assunto começa em um minuto.</h2>
              <p className="mt-2 text-indigo-100">Crie a conta, digite o tema e faça a primeira revisão hoje.</p>
            </div>
            <Link href="/login" className="rounded-md bg-white px-5 py-3 font-medium text-indigo-900 hover:bg-indigo-50">
              Começar grátis
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** Ilustração de um cartão em revisão, montada em HTML (não é captura de tela). */
function ReviewMock() {
  const buttons = [
    { label: "Errei", when: "1 min" },
    { label: "Difícil", when: "6 min" },
    { label: "Bom", when: "1 dia" },
    { label: "Fácil", when: "4 dias" },
  ];
  return (
    <figure aria-label="Exemplo de revisão de um cartão" className="relative">
      <div className="absolute -inset-3 -z-10 rotate-2 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Direito Constitucional · Etapa 2</span>
          <span>12 de 20</span>
        </div>
        <p className="mt-6 font-serif text-xl font-semibold">Quais são os fundamentos da República Federativa do Brasil?</p>
        <hr className="my-5 border-zinc-200 dark:border-zinc-800" />
        <p className="text-zinc-700 dark:text-zinc-300">
          Soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa e
          pluralismo político (art. 1º da CF).
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {buttons.map((b) => (
            <div
              key={b.label}
              className={`rounded-md border px-2 py-2 text-center text-sm ${
                b.label === "Bom"
                  ? "border-indigo-700 bg-indigo-700 text-white"
                  : "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              <div className="font-medium">{b.label}</div>
              <div className={`text-xs ${b.label === "Bom" ? "text-indigo-100" : "text-zinc-500"}`}>{b.when}</div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">Cada resposta reagenda o cartão para o momento certo.</figcaption>
    </figure>
  );
}

/** Curva do esquecimento ilustrativa: sem revisão a memória cai; cada revisão a recupera e a queda fica mais lenta. */
function ForgettingCurve() {
  return (
    <figure className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <svg viewBox="0 0 320 180" role="img" aria-label="Gráfico ilustrativo da curva do esquecimento com e sem revisões" className="w-full">
        <line x1="30" y1="150" x2="310" y2="150" className="stroke-zinc-300 dark:stroke-zinc-700" />
        <line x1="30" y1="20" x2="30" y2="150" className="stroke-zinc-300 dark:stroke-zinc-700" />
        <path d="M30 25 C 60 90, 120 130, 310 140" fill="none" className="stroke-zinc-400" strokeWidth="2" strokeDasharray="5 4" />
        <path
          d="M30 25 C 45 55, 60 65, 75 70 L 75 25 C 100 50, 125 58, 145 60 L 145 25 C 185 42, 220 48, 245 50 L 245 25 C 270 33, 290 37, 310 39"
          fill="none"
          className="stroke-indigo-700 dark:stroke-indigo-400"
          strokeWidth="2.5"
        />
        {[75, 145, 245].map((x) => (
          <circle key={x} cx={x} cy="25" r="4" className="fill-gold-500" />
        ))}
        <text x="34" y="16" className="fill-zinc-500 text-[10px]">memória</text>
        <text x="270" y="166" className="fill-zinc-500 text-[10px]">tempo</text>
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-indigo-700 dark:bg-indigo-400" /> com revisões espaçadas
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-zinc-400" /> sem revisão
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gold-500" /> revisão
        </span>
      </figcaption>
    </figure>
  );
}
