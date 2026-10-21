import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://estuda-ai-s5we.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Estuda-AI", template: "%s · Estuda-AI" },
  description:
    "Flashcards gerados por IA para qualquer matéria, com repetição espaçada (FSRS). ENEM, concursos, faculdade, idiomas e programação.",
  applicationName: "Estuda-AI",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Estuda-AI" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${inter.variable} ${serif.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
