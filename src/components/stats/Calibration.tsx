"use client";

import { useEffect, useState } from "react";
import { confidenceStats, type Calibration as Data } from "@/lib/data/reviews";
import { card, muted } from "@/components/ui/styles";

/** Abaixo disto, a porcentagem ainda não diz muita coisa. */
const MIN_ANSWERS = 5;

function rate(correct: number, total: number) {
  return total === 0 ? null : Math.round((correct / total) * 100);
}

/** "Tenho certeza?": o quanto a confiança da pessoa bate com os acertos. */
export function Calibration() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    confidenceStats(90).then(setData).catch(() => undefined);
  }, []);

  if (!data) return null;
  const sure = rate(data.sureCorrect, data.sureTotal);
  const guess = rate(data.guessCorrect, data.guessTotal);
  const enough = data.sureTotal + data.guessTotal >= MIN_ANSWERS;

  return (
    <section className={card}>
      <h2 className="font-semibold">Sua confiança bate com os acertos?</h2>
      {!enough ? (
        <p className={`mt-1 ${muted}`}>
          Na revisão, marque &quot;Tenho certeza&quot; ou &quot;Estou chutando&quot; antes de responder. Depois de algumas
          respostas, aparece aqui o quanto você acerta em cada caso.
        </p>
      ) : (
        <>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className={muted}>✋ Quando diz que tem certeza</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {sure === null ? "—" : `acerta ${sure}%`}
                <span className={`ml-2 text-sm font-normal ${muted}`}>{data.sureTotal} respostas</span>
              </dd>
            </div>
            <div>
              <dt className={muted}>🎲 Quando chuta</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {guess === null ? "—" : `acerta ${guess}%`}
                <span className={`ml-2 text-sm font-normal ${muted}`}>{data.guessTotal} respostas</span>
              </dd>
            </div>
          </dl>
          <p className={`mt-3 text-sm ${muted}`}>{advice(sure, guess)}</p>
        </>
      )}
    </section>
  );
}

export function advice(sure: number | null, guess: number | null): string {
  if (sure !== null && sure < 80) {
    return "Você erra bastante quando tem certeza: são os erros que mais custam na prova. Releia a explicação desses cartões com calma.";
  }
  if (guess !== null && guess >= 60) {
    return "Seus chutes acertam muito: você sabe mais do que pensa. Confie mais na primeira resposta.";
  }
  return "Boa calibração: quando você diz que sabe, sabe. Os chutes certos voltam mais cedo até virarem certeza.";
}
