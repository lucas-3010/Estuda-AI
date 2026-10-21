"use client";

import { useState } from "react";

export type Bar = { key: string; label: string; value: number; detail?: string };

const HEIGHT = 140;
const GAP = 2;

/** Gráfico de barras de uma série, com tooltip ao passar o mouse e tabela acessível. */
export function BarChart({ bars, title, unit }: { bars: Bar[]; title: string; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const width = 100 / bars.length;
  const hovered = active !== null ? bars[active] : null;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-zinc-500" aria-live="polite">
          {hovered ? `${hovered.label}: ${hovered.value} ${unit}${hovered.detail ? ` · ${hovered.detail}` : ""}` : `máx. ${max}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-36 w-full overflow-visible"
        role="img"
        aria-label={title}
        onMouseLeave={() => setActive(null)}
      >
        <line x1="0" x2="100" y1={HEIGHT} y2={HEIGHT} className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {bars.map((b, i) => {
          const h = (b.value / max) * (HEIGHT - 4);
          return (
            <g key={b.key} onMouseEnter={() => setActive(i)}>
              {/* área de toque maior que a barra */}
              <rect x={i * width} y={0} width={width} height={HEIGHT} fill="transparent" />
              {b.value > 0 && (
                <rect
                  x={i * width + GAP / 4}
                  y={HEIGHT - h}
                  width={Math.max(0.5, width - GAP / 2)}
                  height={h}
                  rx="0.6"
                  className={active === i ? "fill-indigo-700 dark:fill-indigo-300" : "fill-indigo-500 dark:fill-indigo-400"}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{bars[0]?.label}</span>
        <span>{bars[bars.length - 1]?.label}</span>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-500">Ver como tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-zinc-500">
              <th className="font-medium">Dia</th>
              <th className="font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={b.key}>
                <td>{b.label}</td>
                <td className="tabular-nums">
                  {b.value}
                  {b.detail ? ` (${b.detail})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
