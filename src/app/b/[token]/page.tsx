import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HiddenAnswer } from "@/components/HiddenAnswer";
import { Markdown } from "@/components/Markdown";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";
import { CopySharedPlan } from "@/components/share/CopySharedPlan";
import { card, muted } from "@/components/ui/styles";
import { getSharedPlan } from "@/lib/data/sharedPlan";
import { LEVEL_LABELS } from "@/lib/validation/plan";

export const metadata: Metadata = {
  title: "Baralho compartilhado",
  description: "Um baralho de flashcards compartilhado no Estuda-AI. Copie para a sua conta e estude com repetição espaçada.",
  // O link é privado de quem recebeu: não aparece em buscadores.
  robots: { index: false, follow: false },
};

async function SharedPlanView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await getSharedPlan(token);
  if (!plan) notFound();
  const total = plan.steps.reduce((n, s) => n + s.cards.length, 0);

  return (
    <>
      <p className="text-sm font-medium tracking-wide text-indigo-700 uppercase dark:text-indigo-400">Baralho compartilhado</p>
      <h1 className="mt-2 text-3xl font-semibold">{plan.topic}</h1>
      <p className={`mt-1 ${muted}`}>
        {LEVEL_LABELS[plan.level]} · {plan.steps.length} etapas · {total} cartões
      </p>

      <div className={`${card} mt-6 flex flex-col gap-3`}>
        <p>
          Alguém compartilhou este baralho com você. Copie para a sua conta para estudar com repetição espaçada: o
          Estuda-AI mostra cada cartão na hora certa para você não esquecer.
        </p>
        <CopySharedPlan token={token} />
      </div>

      <ol className="mt-8 flex flex-col gap-6">
        {plan.steps.map((step, i) => (
          <li key={i}>
            <h2 className="text-lg font-semibold">
              {i + 1}. {step.title}
            </h2>
            <p className={muted}>{step.goal}</p>
            <ul className="mt-3 flex flex-col gap-3">
              {step.cards.map((c, j) => (
                <li key={j} className={`${card} flex flex-col gap-3`}>
                  <Markdown source={c.front} />
                  <HiddenAnswer>
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                      <Markdown source={c.back} />
                    </div>
                  </HiddenAnswer>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function SharedPlanPage({ params }: PageProps<"/b/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Suspense fallback={<p className={muted}>Carregando o baralho…</p>}>
          <SharedPlanView params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
