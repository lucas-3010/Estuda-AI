"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, getSettings, updateSettings, type Settings } from "@/lib/data/settings";
import { btnPrimary, card, input, label, muted } from "@/components/ui/styles";

export function StudySettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      await updateSettings(settings);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className={card} aria-labelledby="estudo-titulo">
      <h2 id="estudo-titulo" className="text-lg font-semibold">
        Estudo
      </h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="novos" className={label}>
            Cartões novos por dia
          </label>
          <input
            id="novos"
            type="number"
            min={0}
            max={500}
            value={settings.newCardsPerDay}
            onChange={(e) => setSettings({ ...settings, newCardsPerDay: Number(e.target.value) })}
            className={`mt-1 ${input}`}
          />
        </div>
        <div>
          <label htmlFor="retencao" className={label}>
            Meta de retenção: {Math.round(settings.desiredRetention * 100)}%
          </label>
          <input
            id="retencao"
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={settings.desiredRetention}
            onChange={(e) => setSettings({ ...settings, desiredRetention: Number(e.target.value) })}
            className="mt-3 w-full accent-indigo-600"
          />
          <p className={`mt-1 ${muted}`}>
            Mais alta significa lembrar mais, com mais revisões por dia.
          </p>
        </div>
        <div>
          <label htmlFor="meta" className={label}>
            Meta diária de revisões
          </label>
          <input
            id="meta"
            type="number"
            min={1}
            max={1000}
            value={settings.dailyGoal}
            onChange={(e) => setSettings({ ...settings, dailyGoal: Number(e.target.value) })}
            className={`mt-1 ${input}`}
          />
          <p className={`mt-1 ${muted}`}>Aparece no Início junto com a sua sequência de dias.</p>
        </div>
        <div className="flex items-start gap-3">
          <input
            id="lembrete"
            type="checkbox"
            checked={settings.emailReminders}
            onChange={(e) => setSettings({ ...settings, emailReminders: e.target.checked })}
            className="mt-1 h-4 w-4 accent-indigo-600"
          />
          <label htmlFor="lembrete" className="text-sm">
            <span className="font-medium">Lembrete diário por e-mail</span>
            <span className={`block ${muted}`}>
              Todo dia de manhã, quantos cartões você tem para revisar. Disponível nos planos pagos.
            </span>
          </label>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className={btnPrimary} disabled={status === "saving" || status === "loading"}>
            {status === "saving" ? "Salvando…" : "Salvar"}
          </button>
          <span role="status" className={muted}>
            {status === "saved" && "Configurações salvas."}
            {status === "error" && "Não foi possível carregar ou salvar. Tente de novo."}
          </span>
        </div>
      </form>
    </section>
  );
}
