// Modo áudio: o site lê o cartão em voz alta e ouve a resposta (Web Speech API do navegador).

export type VoiceCommand = "giveup" | "repeat" | "next" | { rating: 1 | 2 | 3 | 4 } | null;

/** Texto do cartão sem Markdown, para a voz não ler asteriscos e crases. */
export function speakableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " (trecho de código na tela) ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " (imagem na tela) ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2")
    .replace(/\|/g, ", ")
    .replace(/^[\s,:-]+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Comandos de voz: "não sei", "repetir", "próximo" e as notas "errei", "difícil", "bom", "fácil". */
export function parseVoiceCommand(transcript: string): VoiceCommand {
  const t = plain(transcript);
  if (/^(nao sei|sei nao|pular|passo)$/.test(t)) return "giveup";
  if (/^(repetir|repete|de novo|outra vez|repita)$/.test(t)) return "repeat";
  if (/^(proximo|proxima|continuar|continua|seguir|ok)$/.test(t)) return "next";
  if (/^(errei|errado|um)$/.test(t)) return { rating: 1 };
  if (/^(dificil|dois)$/.test(t)) return { rating: 2 };
  if (/^(bom|boa|tres)$/.test(t)) return { rating: 3 };
  if (/^(facil|quatro)$/.test(t)) return { rating: 4 };
  return null;
}

type RecognitionResult = { 0: { transcript: string } };
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** O que este navegador permite: ler em voz alta e ouvir a resposta. */
export function speechSupport(): { speak: boolean; listen: boolean } {
  return {
    speak: typeof window !== "undefined" && "speechSynthesis" in window,
    listen: recognitionClass() !== null,
  };
}

function portugueseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "pt-BR") ?? voices.find((v) => v.lang.startsWith("pt"));
}

/** Lê o texto em voz alta. Resolve quando termina (ou quando é cancelado). */
export function speak(text: string): Promise<void> {
  if (!speechSupport().speak || !text.trim()) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    const voice = portugueseVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (speechSupport().speak) window.speechSynthesis.cancel();
}

/** Ouve uma frase. Resolve com o texto falado, ou "" se a pessoa não falou nada. */
export function listen(): { result: Promise<string>; stop: () => void } {
  const Klass = recognitionClass();
  if (!Klass) return { result: Promise.resolve(""), stop: () => {} };
  const recognition = new Klass();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  const result = new Promise<string>((resolve) => {
    let heard = "";
    recognition.onresult = (event) => {
      heard = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
    };
    recognition.onerror = () => resolve(heard);
    recognition.onend = () => resolve(heard);
  });
  try {
    recognition.start();
  } catch {
    return { result: Promise.resolve(""), stop: () => {} };
  }
  return { result, stop: () => recognition.abort() };
}
