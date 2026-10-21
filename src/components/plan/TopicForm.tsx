"use client";

import { LEVELS, LEVEL_LABELS, LIMITS, type Level } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, input, label, muted } from "@/components/ui/styles";

export type TopicValues = { topic: string; level: Level; context: string };

export function TopicForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  busy,
}: {
  values: TopicValues;
  onChange: (values: TopicValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const topicOk = values.topic.trim().length >= LIMITS.topicMin;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (topicOk && !busy) onSubmit();
      }}
    >
      <div>
        <label htmlFor="tema" className={label}>
          Tema
        </label>
        <input
          id="tema"
          value={values.topic}
          maxLength={LIMITS.topicMax}
          onChange={(e) => onChange({ ...values, topic: e.target.value })}
          placeholder="Ex.: índices no PostgreSQL, recursão, Big O"
          className={`mt-1 ${input}`}
        />
      </div>

      <fieldset>
        <legend className={label}>Nível</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEVELS.map((level) => (
            <label
              key={level}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                values.level === level
                  ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="nivel"
                value={level}
                checked={values.level === level}
                onChange={() => onChange({ ...values, level })}
                className="sr-only"
              />
              {LEVEL_LABELS[level]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="contexto" className={label}>
          Contexto <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="contexto"
          rows={2}
          maxLength={LIMITS.contextMax}
          value={values.context}
          onChange={(e) => onChange({ ...values, context: e.target.value })}
          placeholder="Ex.: já sei SELECT e WHERE; quero focar em performance"
          className={`mt-1 ${input}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={!topicOk || busy}>
          {busy ? "Gerando…" : "Gerar plano"}
        </button>
        {busy && (
          <>
            <button type="button" className={btnSecondary} onClick={onCancel}>
              Cancelar
            </button>
            <span className={muted} role="status">
              A IA está montando o plano. Isso pode levar até 2 minutos.
            </span>
          </>
        )}
      </div>
    </form>
  );
}
