"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { copySharedPlan } from "@/lib/data/share";
import { AFTER_LOGIN_COOKIE } from "@/lib/share";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { btnPrimary } from "@/components/ui/styles";

/** Copia o baralho para a conta. Sem login, guarda o link e manda para o login. */
export function CopySharedPlan({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await createBrowserSupabase().auth.getClaims();
      if (!data?.claims?.sub) {
        document.cookie = `${AFTER_LOGIN_COOKIE}=${encodeURIComponent(`/b/${token}`)}; path=/; max-age=3600; samesite=lax`;
        router.push("/login");
        return;
      }
      await copySharedPlan(token);
      router.push("/");
    } catch {
      setError("Não foi possível copiar o baralho. Tente de novo.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={`${btnPrimary} self-start`} onClick={copy} disabled={busy}>
        {busy ? "Copiando…" : "Estudar este baralho"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
