import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/Pricing";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: "Preços",
  description: "Planos do Estuda-AI: comece grátis e assine para gerar mais flashcards com IA.",
};

const FAQ = [
  {
    q: "O que é uma geração com IA?",
    a: "Cada plano de estudos criado, cada etapa refeita e cada material (texto, PDF ou foto) transformado em cartões conta uma geração. Revisar e criar cartões à mão é ilimitado em todos os planos.",
  },
  {
    q: "Quando a cota renova?",
    a: "No dia 1 de cada mês. Gerações não usadas não acumulam.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Em Configurações você abre o portal de pagamento e cancela em um clique. O plano continua até o fim do período pago.",
  },
  {
    q: "Quais formas de pagamento?",
    a: "Cartão de crédito, pela Stripe. Seus dados de cartão não passam pelo Estuda-AI.",
  },
  {
    q: "Os cartões gerados pela IA estão sempre certos?",
    a: "A IA acerta a grande maioria, mas pode errar. Por isso você revisa e edita cada cartão antes de salvar. Para leis e dados oficiais, confira na fonte.",
  },
  {
    q: "O que acontece com o meu material enviado?",
    a: "Textos, PDFs e fotos são usados só para gerar os cartões e não ficam guardados no Estuda-AI. Detalhes na política de privacidade.",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">Escolha seu plano</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Comece grátis. Assine quando precisar de mais gerações com IA. Revisões são sempre ilimitadas.
        </p>
        <div className="mt-8">
          <Pricing />
        </div>
        <section id="perguntas" className="mt-14 max-w-3xl scroll-mt-6">
          <h2 className="text-xl font-semibold">Perguntas frequentes</h2>
          <dl className="mt-4 flex flex-col gap-5">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1 text-zinc-600 dark:text-zinc-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
