"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PENDING_PLAN_KEY } from "@/components/marketing/PlanButton";
import { startCheckout } from "@/lib/data/account";
import { markOnboarded, syncProfile } from "@/lib/data/settings";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";

const TIPS = [
  {
    title: "Bem-vindo ao Estuda-AI!",
    text: "Aqui a IA cria flashcards para qualquer matéria e a repetição espaçada diz a hora certa de revisar. Veja em 4 passos como tirar o máximo.",
  },
  {
    title: "1. Crie um tema",
    text: "Em “Novo tema”, digite o que você quer estudar (ex.: “Revolução Francesa para o ENEM”). Você também pode colar um texto ou, nos planos Pro e Max, enviar um PDF ou foto do caderno.",
  },
  {
    title: "2. Revise todo dia",
    text: "Em “Revisar”, tente lembrar a resposta antes de virar o cartão. Depois diga se errou, achou difícil, bom ou fácil: o algoritmo marca a próxima revisão sozinho.",
  },
  {
    title: "3. Mantenha a sequência",
    text: "Revise um pouco todo dia para manter a sequência 🔥 e bater a meta diária. Ajuste a meta e o lembrete por e-mail em Configurações.",
  },
  {
    title: "4. Treine para a prova",
    text: "Use o modo Quiz para responder em múltipla escolha. Já usa o Anki? Importe seus cartões em Configurações.",
  },
];

/** Boas-vindas na primeira visita, confirmação de assinatura e plano escolhido antes do login. */
export function Welcome() {
  const [step, setStep] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const justSubscribed = new URLSearchParams(window.location.search).get("assinatura") === "ok";
    if (justSubscribed) window.history.replaceState(null, "", "/");

    let pending: string | null = null;
    try {
      pending = window.sessionStorage.getItem(PENDING_PLAN_KEY);
      window.sessionStorage.removeItem(PENDING_PLAN_KEY);
    } catch {
      // sem armazenamento
    }
    if (pending) {
      void startCheckout(pending).catch(() => undefined);
      return;
    }

    syncProfile()
      .then(({ onboarded }) => {
        setSubscribed(justSubscribed);
        if (!onboarded || justSubscribed) setStep(0);
      })
      .catch(() => undefined);
  }, []);

  function close() {
    setStep(null);
    void markOnboarded().catch(() => undefined);
  }

  if (step === null) return null;
  const tip = subscribed && step === 0
    ? { title: "Assinatura confirmada! 🎉", text: "Obrigado por assinar. Suas novas gerações com IA já estão liberadas. Veja dicas rápidas para começar." }
    : TIPS[step];
  const last = step === TIPS.length - 1;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boas-vindas-titulo"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
      >
        <p className="text-xs text-zinc-500">
          {step + 1} de {TIPS.length}
        </p>
        <h2 id="boas-vindas-titulo" className="mt-1 text-xl font-semibold">
          {tip.title}
        </h2>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">{tip.text}</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-sm text-zinc-500 underline">
            Pular
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" className={btnSecondary} onClick={() => setStep(step - 1)}>
                Voltar
              </button>
            )}
            {last ? (
              <Link href="/novo" className={btnPrimary} onClick={close}>
                Criar meu primeiro tema
              </Link>
            ) : (
              <button type="button" className={btnPrimary} onClick={() => setStep(step + 1)}>
                Próximo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
