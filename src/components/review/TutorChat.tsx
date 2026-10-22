"use client";

import { useState } from "react";
import { TUTOR_MAX_TURNS, TUTOR_MESSAGE_MAX, type TutorTurn } from "@/lib/ai/tutor";
import { TutorError, requestTutor } from "@/lib/tutorClient";
import { Markdown } from "@/components/Markdown";
import { btnPrimary, btnSecondary, input } from "@/components/ui/styles";

const FIRST_QUESTION = "Me explica melhor essa resposta.";

/** Conversa curta com a IA sobre o cartão que acabou de ser revisado. */
export function TutorChat({ cardId }: { cardId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asked = messages.filter((m) => m.role === "user").length;
  const canAsk = asked < TUTOR_MAX_TURNS && !busy;

  async function ask(question: string) {
    const text = question.trim();
    if (!text || !canAsk) return;
    const next: TutorTurn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const reply = await requestTutor(cardId, next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      // Tira a pergunta sem resposta para a pessoa poder tentar de novo.
      setMessages(messages);
      setDraft(text === FIRST_QUESTION ? "" : text);
      setError(e instanceof TutorError ? e.message : "O tutor está indisponível agora.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={`${btnSecondary} self-start`}
        onClick={() => {
          setOpen(true);
          void ask(FIRST_QUESTION);
        }}
      >
        💬 Me explica melhor
      </button>
    );
  }

  return (
    <section aria-label="Tutor" className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
      <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Tutor</h3>
      <ul className="flex flex-col gap-3" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={m.role === "user" ? "self-end rounded-lg bg-white px-3 py-2 text-sm dark:bg-zinc-800" : ""}>
            {m.role === "user" ? m.content : <Markdown source={m.content} />}
          </li>
        ))}
        {busy && (
          <li role="status" className="text-sm text-zinc-500">
            Pensando…
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {asked < TUTOR_MAX_TURNS ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
        >
          <label htmlFor={`tutor-${cardId}`} className="sr-only">
            Pergunta para o tutor
          </label>
          <input
            id={`tutor-${cardId}`}
            value={draft}
            maxLength={TUTOR_MESSAGE_MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={asked === 0 ? FIRST_QUESTION : "Ficou alguma dúvida? Pergunte aqui"}
            className={input}
            disabled={busy}
          />
          <button type="submit" className={btnPrimary} disabled={!canAsk || !draft.trim()}>
            Perguntar
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fim da conversa sobre este cartão. Siga para o próximo e volte nele depois.
        </p>
      )}
    </section>
  );
}
