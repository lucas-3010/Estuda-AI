"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanId } from "@/lib/billing/plans";
import { startCheckout } from "@/lib/data/account";
import { createBrowserSupabase } from "@/lib/supabase/client";

export const PENDING_PLAN_KEY = "estuda-ai:plano-escolhido";

/** Assina o plano. Sem login, guarda a escolha e manda para o cadastro. */
export function PlanButton({ plan, label, className }: { plan: PlanId; label: string; className: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function choose() {
    setBusy(true);
    setError(false);
    const { data } = await createBrowserSupabase().auth.getClaims();
    if (!data?.claims?.sub) {
      if (plan !== "gratis") {
        try {
          window.sessionStorage.setItem(PENDING_PLAN_KEY, plan);
        } catch {
          // sem armazenamento: a pessoa escolhe o plano de novo depois do login
        }
      }
      router.push("/login");
      return;
    }
    if (plan === "gratis") {
      router.push("/");
      return;
    }
    try {
      await startCheckout(plan);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={choose} disabled={busy} className={className}>
        {busy ? "Abrindo…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          Não foi possível abrir o pagamento. Tente de novo.
        </p>
      )}
    </>
  );
}
