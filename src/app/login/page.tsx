import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Link href="/" className="self-start" aria-label="Estuda-AI">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">Entrar</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Entre ou crie sua conta grátis. Qualquer matéria: ENEM, concursos, faculdade, idiomas e programação.
      </p>
      <LoginForm />
    </main>
  );
}
