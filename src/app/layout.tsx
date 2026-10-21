import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estuda-AI",
  description:
    "Flashcards gerados por IA para qualquer matéria, com repetição espaçada (FSRS). ENEM, concursos, faculdade, idiomas e programação.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
