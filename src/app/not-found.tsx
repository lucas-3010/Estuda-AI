import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start px-4 py-20">
        <p className="font-serif text-6xl font-semibold text-indigo-700 dark:text-indigo-400">404</p>
        <h1 className="mt-4 text-3xl font-semibold">Esta página não existe.</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          O endereço pode ter sido digitado errado ou a página mudou de lugar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-md bg-indigo-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-800">
            Voltar ao início
          </Link>
          <Link
            href="/contato"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Falar com a gente
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
