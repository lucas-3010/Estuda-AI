import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Link href="/" className="text-3xl font-semibold">
        Estuda<span className="text-indigo-600 dark:text-indigo-400">-AI</span>
      </Link>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Entre ou crie sua conta grátis. Qualquer matéria: ENEM, concursos, faculdade, idiomas e programação.
      </p>
      <LoginForm />
    </main>
  );
}
