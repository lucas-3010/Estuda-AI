import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sobre",
  description: "O que é o Estuda-AI, por que ele existe e os compromissos que seguimos com quem estuda.",
};

const COMMITMENTS = [
  {
    title: "Método antes de modismo",
    text: "Cada recurso parte do que a pesquisa sobre aprendizagem mostra que funciona: recordação ativa e repetição espaçada. Se algo não ajuda a lembrar, não entra no produto.",
  },
  {
    title: "Transparência sobre a IA",
    text: "A inteligência artificial ajuda a montar o material, mas pode errar. Por isso você vê e edita cada cartão antes de salvar, e avisamos isso com clareza.",
  },
  {
    title: "Seus dados são seus",
    text: "Seus cartões podem ser exportados a qualquer momento, inclusive para o Anki. O material que você envia serve só para gerar os cartões e não fica guardado.",
  },
  {
    title: "Preço claro",
    text: "Revisar é ilimitado em todos os planos. Você paga só pelas gerações com IA, cancela em um clique e tem 7 dias para pedir o dinheiro de volta.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="text-sm font-medium tracking-wide text-gold-600 uppercase dark:text-gold-500">Sobre</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Estudar menos horas e lembrar por mais tempo.</h1>

        <div className="mt-8 flex flex-col gap-4 text-lg text-zinc-700 dark:text-zinc-300">
          <p>
            Quase todo mundo estuda relendo o resumo e grifando o livro. Parece produtivo, mas é dos métodos que menos
            fixam o conteúdo. O que funciona é tentar lembrar a resposta e revisar pouco antes de esquecer. O problema é
            que montar os flashcards e controlar quando revisar cada um dá muito trabalho.
          </p>
          <p>
            O {SITE.name} faz esse trabalho por você. A inteligência artificial transforma um tema, um texto ou um PDF em
            um plano de estudos com flashcards, e o algoritmo FSRS marca a revisão de cada cartão na hora certa. Sobra
            para você só a parte que importa: estudar.
          </p>
          <p>
            O {SITE.name} é um projeto independente, feito no Brasil
            {SITE.legalName ? <> por {SITE.legalName}</> : null}, para quem estuda para o ENEM, concursos, faculdade,
            idiomas ou certificações.
          </p>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Nossos compromissos</h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
                <dt className="font-semibold">{c.title}</dt>
                <dd className="mt-2 text-zinc-600 dark:text-zinc-400">{c.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-xl font-semibold">Quer conhecer o método?</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Veja <Link href="/#metodo" className="text-indigo-700 underline dark:text-indigo-400">como a repetição espaçada funciona</Link>{" "}
            ou fale com a gente pela página de <Link href="/contato" className="text-indigo-700 underline dark:text-indigo-400">contato</Link>.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-md bg-indigo-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Começar grátis
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
