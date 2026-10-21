import type { Metadata } from "next";
import Link from "next/link";
import { ExampleDeck } from "@/components/marketing/ExampleDeck";
import { Pricing } from "@/components/marketing/Pricing";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: "Estuda-AI · Flashcards com IA para qualquer matéria",
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

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-14 pb-12 sm:pt-20">
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Flashcards com inteligência artificial</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Digite o que você precisa estudar. A IA cria os flashcards.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Pare de passar horas fazendo resumo. O Estuda-AI monta o plano de estudos, cria os cartões e avisa a hora
            certa de revisar cada um.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-500">
              Começar grátis
            </Link>
            <Link
              href="#exemplos"
              className="rounded-lg border border-zinc-300 px-5 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Ver exemplos
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Grátis para começar, sem cartão de crédito.</p>
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Para quem é">
            {AUDIENCES.map((a) => (
              <li key={a} className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="border-y border-zinc-200 bg-zinc-50 py-14 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto w-full max-w-5xl px-4">
            <h2 className="text-2xl font-semibold">Como funciona</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="exemplos" className="mx-auto w-full max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-semibold">Exemplos de cartões gerados</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">Veja o que a IA cria a partir de um tema.</p>
          <div className="mt-6">
            <ExampleDeck />
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-zinc-50 py-14 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto w-full max-w-5xl px-4">
            <h2 className="text-2xl font-semibold">Tudo o que você precisa para estudar</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="precos" className="mx-auto w-full max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-semibold">Planos</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">Comece grátis e assine quando precisar de mais.</p>
          <div className="mt-6">
            <Pricing />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
