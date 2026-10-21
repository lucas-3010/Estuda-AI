import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold">Estuda-AI</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Digite um tema, a IA monta o plano de estudos e os flashcards, e a repetição espaçada
        decide quando revisar.
      </p>
      <LoginForm />
    </main>
  );
}
