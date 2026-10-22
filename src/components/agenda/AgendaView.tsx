"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildAgenda, formatMinutes, googleCalendarUrl, WEEKDAYS, type AgendaStep } from "@/lib/agenda";
import { listMemoryCards } from "@/lib/data/memory";
import { updateSettings, userTimeZone, type Settings } from "@/lib/data/settings";
import { loadToday, type Today } from "@/lib/data/today";
import { daysBetween, todayIn } from "@/lib/exam";
import { memoryBy } from "@/lib/srs/thermometer";
import { btnPrimary, btnSecondary, card, input, muted } from "@/components/ui/styles";

type Loaded = Today & { steps: AgendaStep[] };

const ICON = { review: "🔁", new: "✨", quiz: "📝" } as const;

async function loadAgenda(): Promise<Loaded> {
  const today = await loadToday();
  const cards = await listMemoryCards().catch(() => []);
  const day = todayIn(userTimeZone());
  const steps = today.plans.flatMap((plan) => {
    const memory = memoryBy(cards, plan.steps.map((s) => s.id), (c) => c.step_id ?? "", new Date());
    return plan.steps.map((s) => ({
      id: s.id,
      title: s.title,
      planId: plan.id,
      planTopic: plan.topic,
      weight: today.weights.get(s.id) ?? 1,
      memory: memory.get(s.id)?.memory ?? null,
      daysToExam: plan.examDate ? daysBetween(day, plan.examDate) : null,
    }));
  });
  return { ...today, steps };
}

/** Próxima hora cheia, para o evento no Google Agenda. */
function nextHour(now = new Date()): Date {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

export function AgendaView() {
  const [data, setData] = useState<Loaded | null | "error">(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadAgenda()
      .then(setData)
      .catch(() => setData("error"));
  }, []);

  if (data === null) return <p className={muted}>Montando sua agenda…</p>;
  if (data === "error") {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        Não foi possível montar a agenda. Recarregue a página para tentar de novo.
      </p>
    );
  }

  const settings = data.settings;
  if (!settings.studyMinutes || editing) {
    return (
      <ScheduleForm
        settings={settings}
        onSaved={(studyMinutes) => {
          setData({ ...data, settings: { ...settings, studyMinutes } });
          setEditing(false);
        }}
        onCancel={settings.studyMinutes ? () => setEditing(false) : undefined}
      />
    );
  }

  const weekday = new Date().getDay();
  const minutes = settings.studyMinutes[weekday] ?? 0;
  const agenda = buildAgenda({ minutes, queue: data.queue, steps: data.steps, quiz: data.plans.length > 0 });
  const siteUrl = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="flex flex-col gap-4">
      <section className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className={muted}>{WEEKDAYS[weekday]}</p>
          <p className="text-2xl font-semibold">
            {minutes === 0 ? "Dia de folga" : `${formatMinutes(agenda.minutes)} de estudo hoje`}
          </p>
          {minutes > 0 && <p className={muted}>Você reservou {formatMinutes(minutes)} para hoje.</p>}
        </div>
        <button type="button" className={btnSecondary} onClick={() => setEditing(true)}>
          Mudar meus horários
        </button>
      </section>

      {data.vespera.length > 0 && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-100">
          🔥 <strong>Modo véspera</strong> em {data.vespera.map((p) => p.topic).join(", ")}: a agenda não traz cartões
          novos desses planos, só os que você mais pode esquecer.
        </p>
      )}

      {minutes === 0 ? (
        <p className={card}>
          Hoje não está na sua agenda de estudo. Se quiser, dá para revisar mesmo assim:{" "}
          <Link href="/revisar" className="font-medium text-indigo-700 underline dark:text-indigo-400">
            abrir a revisão
          </Link>
          .
        </p>
      ) : agenda.blocks.length === 0 ? (
        <p className={card}>Nada pendente para hoje 🎉 Crie um plano novo ou faça um simulado para treinar.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {agenda.blocks.map((block, i) => (
            <li key={`${block.href}-${i}`} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  <span aria-hidden className="mr-2">
                    {ICON[block.kind]}
                  </span>
                  {block.minutes} min · {block.title}
                </p>
                <p className={muted}>{block.detail}</p>
              </div>
              <Link href={block.href} className={i === 0 ? btnPrimary : btnSecondary}>
                {i === 0 ? "Começar" : "Abrir"}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {agenda.leftover > 0 && minutes > 0 && (
        <p className={muted}>
          {agenda.leftover} {agenda.leftover === 1 ? "cartão ficou" : "cartões ficaram"} para amanhã: não couberam no tempo
          de hoje.
        </p>
      )}

      {agenda.blocks.length > 0 && (
        <a
          href={googleCalendarUrl(agenda, nextHour(), siteUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnSecondary} self-start`}
        >
          📅 Mandar para o Google Agenda
        </a>
      )}
    </div>
  );
}

/** Quanto tempo a pessoa tem em cada dia da semana. */
function ScheduleForm({
  settings,
  onSaved,
  onCancel,
}: {
  settings: Settings;
  onSaved: (studyMinutes: number[]) => void;
  onCancel?: () => void;
}) {
  const [hours, setHours] = useState<string[]>(
    (settings.studyMinutes ?? [0, 120, 120, 120, 120, 120, 0]).map((m) => String(Math.round((m / 60) * 10) / 10)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const studyMinutes = hours.map((h) => Math.min(600, Math.max(0, Math.round((Number(h.replace(",", ".")) || 0) * 60))));
    setSaving(true);
    setError(false);
    try {
      await updateSettings({ ...settings, studyMinutes });
      onSaved(studyMinutes);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className={`${card} flex flex-col gap-4`}>
      <div>
        <h2 className="font-semibold">Quanto tempo você tem para estudar?</h2>
        <p className={muted}>
          Diga as horas de cada dia (0 nos dias de folga). Todo dia o site monta o roteiro dentro desse tempo.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {WEEKDAYS.map((day, i) => (
          <label key={day} className="flex flex-col gap-1 text-sm font-medium">
            {day}
            <span className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={hours[i]}
                onChange={(e) => setHours(hours.map((h, j) => (j === i ? e.target.value : h)))}
                className={input}
                aria-label={`Horas de estudo na ${day.toLowerCase()}`}
              />
              <span className={muted}>h</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Salvando…" : "Montar minha agenda"}
        </button>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
