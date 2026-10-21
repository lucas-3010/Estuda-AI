"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Provider = "google" | "apple" | "github";

const PROVIDERS: { provider: Provider; label: string; className: string }[] = [
  {
    provider: "google",
    label: "Entrar com Google",
    className:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  },
  {
    provider: "apple",
    label: "Entrar com Apple",
    className: "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
  },
  {
    provider: "github",
    label: "Entrar com GitHub",
    className:
      "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
  },
];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function signInWith(provider: Provider) {
    await createBrowserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {PROVIDERS.map(({ provider, label, className }) => (
          <button
            key={provider}
            type="button"
            onClick={() => signInWith(provider)}
            className={`rounded-lg px-4 py-2.5 font-medium ${className}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
        ou
        <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {status === "sending" ? "Enviando…" : "Receber link de acesso"}
        </button>
        <p role="status" className="text-sm">
          {status === "sent" && "Pronto! Confira seu e-mail e clique no link para entrar."}
          {status === "error" && "Não foi possível enviar o link. Tente de novo."}
        </p>
      </form>
    </div>
  );
}
