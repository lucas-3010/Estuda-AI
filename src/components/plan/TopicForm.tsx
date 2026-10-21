"use client";

import { LEVELS, LEVEL_LABELS, LIMITS, type Level } from "@/lib/validation/plan";
import { btnPrimary, btnSecondary, input, label, muted } from "@/components/ui/styles";

const SUGGESTIONS = [
  "Citologia para o ENEM",
  "Direito Constitucional: direitos fundamentais",
  "Phrasal verbs do dia a dia",
  "Funções do 2º grau",
  "SQL: joins e índices",
];

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
          placeholder="Ex.: Revolução Francesa, Direito Administrativo, phrasal verbs, funções do 2º grau"
          className={`mt-1 ${input}`}
        />
        {!values.topic && (
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Sugestões rápidas">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...values, topic: s })}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <LevelPicker value={values.level} onChange={(level) => onChange({ ...values, level })} />

      <div>
        <label htmlFor="contexto" className={label}>
          Objetivo e contexto <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="contexto"
          rows={2}
          maxLength={LIMITS.contextMax}
          value={values.context}
          onChange={(e) => onChange({ ...values, context: e.target.value })}
          placeholder="Ex.: prova do ENEM em novembro; concurso do INSS; já sei o básico"
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

export function LevelPicker({ value, onChange }: { value: Level; onChange: (level: Level) => void }) {
  return (
    <fieldset>
      <legend className={label}>Nível</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {LEVELS.map((level) => (
          <label
            key={level}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
              value === level
                ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="nivel"
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              className="sr-only"
            />
            {LEVEL_LABELS[level]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
