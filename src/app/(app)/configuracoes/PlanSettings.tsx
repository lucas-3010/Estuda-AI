"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/billing/plans";
import { getAccount, openBillingPortal, type Account } from "@/lib/data/account";
import { btnPrimary, btnSecondary, card, muted } from "@/components/ui/styles";

export function PlanSettings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "opening" | "error">("loading");

  useEffect(() => {
    getAccount()
      .then((a) => {
        setAccount(a);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function manage() {
    setStatus("opening");
    try {
      await openBillingPortal();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className={card} aria-labelledby="plano-titulo">
      <h2 id="plano-titulo" className="text-lg font-semibold">
        Seu plano
      </h2>
      {account && (
        <>
          <p className="mt-2">
            <strong>{account.plan.name}</strong>
            {account.plan.price > 0 && <span className={muted}> · {formatPrice(account.plan.price)}/mês</span>}
          </p>
          <p className={`mt-1 ${muted}`}>
            {account.used} de {account.plan.generations} gerações com IA usadas este mês. A cota renova no dia 1.
            {account.periodEnd && account.plan.price > 0 && (
              <> Próxima cobrança em {new Date(account.periodEnd).toLocaleDateString("pt-BR")}.</>
            )}
          </p>
          {account.status === "past_due" && (
            <p role="alert" className="mt-2 text-sm text-amber-800 dark:text-amber-300">
              O último pagamento falhou. Atualize o cartão para não perder o plano.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {account.plan.id !== "max" && (
              <Link href="/precos" className={btnPrimary}>
                {account.plan.price > 0 ? "Mudar de plano" : "Ver planos"}
              </Link>
            )}
            {account.hasCustomer && account.plan.price > 0 && (
              <button type="button" className={btnSecondary} onClick={manage} disabled={status === "opening"}>
                {status === "opening" ? "Abrindo…" : "Gerenciar assinatura"}
              </button>
            )}
          </div>
        </>
      )}
      {status === "loading" && <p className={`mt-2 ${muted}`}>Carregando…</p>}
      {status === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          Não foi possível carregar ou abrir sua assinatura. Tente de novo.
        </p>
      )}
    </section>
  );
}
