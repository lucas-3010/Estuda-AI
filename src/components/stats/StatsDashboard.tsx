"use client";

import { useEffect, useState } from "react";
import { dueForecast, reviewStats, type DayStat, type ForecastDay } from "@/lib/data/reviews";
import { userTimeZone } from "@/lib/data/settings";
import { card, muted } from "@/components/ui/styles";
import { BarChart } from "./BarChart";
import { WeakSpots } from "./WeakSpots";

function shortDate(day: string) {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

export function accuracy(stats: DayStat[]): string {
  const reviews = stats.reduce((n, d) => n + d.reviews, 0);
  const correct = stats.reduce((n, d) => n + d.correct, 0);
  return reviews === 0 ? "—" : `${Math.round((correct / reviews) * 100)}%`;
}

export function StatsDashboard() {
  const [data, setData] = useState<{ stats: DayStat[]; forecast: ForecastDay[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const tz = userTimeZone();
    Promise.all([reviewStats(30, tz), dueForecast(14, tz)])
      .then(([stats, forecast]) => setData({ stats, forecast }))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
        Não foi possível carregar as estatísticas. Recarregue a página para tentar de novo.
      </p>
    );
  }
  if (!data) return <p className={muted}>Carregando…</p>;

  const total = data.stats.reduce((n, d) => n + d.reviews, 0);
  const activeDays = data.stats.filter((d) => d.reviews > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className={muted}>Revisões (30 dias)</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid="total-reviews">
            {total}
          </p>
        </div>
        <div className={card}>
          <p className={muted}>Taxa de acerto</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid="accuracy">
            {accuracy(data.stats)}
          </p>
        </div>
        <div className={card}>
          <p className={muted}>Dias estudados</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{activeDays}/30</p>
        </div>
      </div>

      <section className={card}>
        <BarChart
          title="Revisões por dia, últimos 30 dias"
          unit="revisões"
          bars={data.stats.map((d) => ({
            key: d.day,
            label: shortDate(d.day),
            value: d.reviews,
            detail: d.reviews ? `${d.correct} certas` : undefined,
          }))}
        />
      </section>

      <WeakSpots />

      <section className={card}>
        <BarChart
          title="Cartões que vencem nos próximos 14 dias"
          unit="cartões"
          bars={data.forecast.map((d) => ({ key: d.day, label: shortDate(d.day), value: d.dueCount }))}
        />
      </section>
    </div>
  );
}
