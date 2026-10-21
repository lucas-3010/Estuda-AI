import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";
import { SITE, providerLine } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com o Estuda-AI: suporte, cobrança, reembolso, privacidade e parcerias.",
};

const TOPICS = [
  {
    title: "Suporte",
    text: "Dúvidas de uso, erros no site ou problemas para entrar na conta. Se puder, diga o e-mail da conta e o que aconteceu.",
    subject: "Suporte",
  },
  {
    title: "Cobrança e reembolso",
    text: "Assinatura, troca de plano ou cancelamento. Em até 7 dias da primeira cobrança, devolvemos o valor integral.",
    subject: "Cobrança",
  },
  {
    title: "Privacidade e dados",
    text: "Acesso, correção, exportação ou exclusão dos seus dados pessoais, conforme a LGPD.",
    subject: "Privacidade",
  },
  {
    title: "Escolas e parcerias",
    text: "Cursinhos, professores e instituições que querem usar o Estuda-AI com seus alunos.",
    subject: "Parceria",
  },
];

export default function ContactPage() {
  const email = SITE.supportEmail;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">Contato</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Antes de escrever, veja se a resposta está nas{" "}
          <Link href="/precos#perguntas" className="text-indigo-700 underline dark:text-indigo-400">perguntas frequentes</Link>.
          Se não estiver, escolha o assunto abaixo.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <li key={t.title} className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h2 className="font-semibold">{t.title}</h2>
              <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-400">{t.text}</p>
              {email && (
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(`[${SITE.name}] ${t.subject}`)}`}
                  className="mt-4 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
                >
                  Escrever sobre {t.title.toLowerCase()}
                </a>
              )}
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-base font-semibold">Dados de contato</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-6">
            {email && (
              <>
                <dt className="text-zinc-500">E-mail</dt>
                <dd>
                  <a href={`mailto:${email}`} className="text-indigo-700 underline dark:text-indigo-400">{email}</a>
                </dd>
              </>
            )}
            {providerLine() && (
              <>
                <dt className="text-zinc-500">Responsável</dt>
                <dd>{providerLine()}</dd>
              </>
            )}
            <dt className="text-zinc-500">Atendimento</dt>
            <dd>Somente por e-mail, em dias úteis, por ordem de chegada.</dd>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
