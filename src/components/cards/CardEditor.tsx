"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { btnPrimary, btnSecondary, input } from "@/components/ui/styles";

export function CardEditor({
  initial,
  onSave,
  onCancel,
  ariaLabel,
}: {
  initial: { front: string; back: string };
  onSave: (value: { front: string; back: string }) => Promise<void>;
  onCancel: () => void;
  ariaLabel?: string;
}) {
  const [front, setFront] = useState(initial.front);
  const [back, setBack] = useState(initial.back);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const valid = front.trim() && back.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(false);
    try {
      await onSave({ front: front.trim(), back: back.trim() });
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label={ariaLabel} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Frente
          <textarea rows={4} value={front} onChange={(e) => setFront(e.target.value)} className={`mt-1 font-mono text-sm ${input}`} />
        </label>
        <label className="text-sm font-medium">
          Verso
          <textarea rows={4} value={back} onChange={(e) => setBack(e.target.value)} className={`mt-1 font-mono text-sm ${input}`} />
        </label>
      </div>
      {(front || back) && (
        <div className="grid gap-3 rounded-lg bg-zinc-50 p-3 text-sm sm:grid-cols-2 dark:bg-zinc-950">
          <Markdown source={front || "…"} />
          <Markdown source={back || "…"} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={!valid || saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
