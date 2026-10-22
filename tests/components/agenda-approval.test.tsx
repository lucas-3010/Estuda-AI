import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeCardRow } from "../srs/helpers";

const loadToday = vi.fn();
vi.mock("@/lib/data/today", () => ({ loadToday: () => loadToday() }));
vi.mock("@/lib/data/memory", () => ({ listMemoryCards: async () => [] }));
const updateSettings = vi.fn();
vi.mock("@/lib/data/settings", () => ({
  updateSettings: (...a: unknown[]) => updateSettings(...a),
  userTimeZone: () => "UTC",
}));
const setCutoff = vi.fn();
vi.mock("@/lib/data/plans", () => ({ setCutoff: (...a: unknown[]) => setCutoff(...a) }));
const callGenerate = vi.fn();
vi.mock("@/lib/generateClient", () => ({ callGenerate: (...a: unknown[]) => callGenerate(...a) }));

import { AgendaView } from "@/components/agenda/AgendaView";
import { ApprovalChance } from "@/components/memory/ApprovalChance";
import type { PlanWithProgress } from "@/lib/data/plans";

const plan: PlanWithProgress = {
  id: "p1",
  topic: "TJ-RJ Analista",
  level: "intermediario",
  kind: "edital",
  createdAt: "2026-10-01T00:00:00Z",
  shareToken: null,
  examDate: "2026-12-10",
  cutoff: null,
  cutoffNote: null,
  steps: [
    { id: "s1", title: "Português", goal: "", position: 0, kind: "normal", counts: { new: 0, learning: 0, review: 1 } },
    { id: "s2", title: "Raciocínio Lógico", goal: "", position: 1, kind: "normal", counts: { new: 1, learning: 0, review: 0 } },
  ],
};
const settings = { newCardsPerDay: 20, desiredRetention: 0.9, dailyGoal: 20, emailReminders: true, studyMinutes: null as number[] | null };

beforeEach(() => {
  loadToday.mockReset();
  updateSettings.mockReset().mockResolvedValue(undefined);
  setCutoff.mockReset().mockResolvedValue(undefined);
  callGenerate.mockReset();
});

describe("Agenda do dia", () => {
  test("sem horários pede o tempo de cada dia e depois mostra o roteiro", async () => {
    loadToday.mockResolvedValue({
      queue: [makeCardRow({ id: "r", step_id: "s1", state: 2, due: "2000-01-01T00:00:00Z" })],
      settings,
      plans: [plan],
      weights: new Map([["s1", 4]]),
      vespera: [],
    });
    render(<AgendaView />);
    fireEvent.click(await screen.findByRole("button", { name: /montar minha agenda/i }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
    expect(updateSettings.mock.calls[0][0].studyMinutes).toEqual([0, 120, 120, 120, 120, 120, 0]);
    expect(await screen.findByRole("button", { name: /mudar meus horários/i })).toBeInTheDocument();
  });

  test("com horários, mostra os blocos e o link do Google Agenda", async () => {
    loadToday.mockResolvedValue({
      queue: [makeCardRow({ id: "r", step_id: "s1", state: 2, due: "2000-01-01T00:00:00Z" })],
      settings: { ...settings, studyMinutes: [60, 60, 60, 60, 60, 60, 60] },
      plans: [plan],
      weights: new Map(),
      vespera: [plan],
    });
    render(<AgendaView />);
    expect(await screen.findByText(/Revisar Português/)).toBeInTheDocument();
    expect(screen.getByText(/Modo véspera/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /começar/i })).toHaveAttribute("href", "/revisar?plano=p1&etapa=s1&limite=1");
    expect(screen.getByRole("link", { name: /google agenda/i }).getAttribute("href")).toContain("calendar.google.com");
  });
});

describe("Chance de aprovação", () => {
  const cards = [
    makeCardRow({ id: "a", step_id: "s1", state: 2, stability: 50, reps: 3, last_review: new Date().toISOString() }),
    makeCardRow({ id: "b", step_id: "s2", state: 0 }),
  ];

  test("mostra a nota de hoje e salva a nota de corte digitada", async () => {
    render(<ApprovalChance plan={plan} cards={cards} weights={new Map([["s1", 3], ["s2", 1]])} />);
    expect(screen.getByText(/Se a prova fosse hoje/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/nota de corte do último concurso/i), { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(setCutoff).toHaveBeenCalledWith("p1", 70, "Informada por você"));
    expect(await screen.findByText(/A nota de corte foi 70/)).toBeInTheDocument();
    expect(screen.getByText(/Raciocínio Lógico/)).toBeInTheDocument();
  });

  test("estimar com IA grava a nota e a fonte", async () => {
    callGenerate.mockResolvedValue({ cutoff: 68, note: "TJ-RJ 2021 (FGV)." });
    render(<ApprovalChance plan={plan} cards={cards} weights={new Map()} banca="FGV" />);
    fireEvent.click(screen.getByRole("button", { name: /estimar com ia/i }));
    await waitFor(() => expect(setCutoff).toHaveBeenCalledWith("p1", 68, "Estimada pela IA: TJ-RJ 2021 (FGV)."));
    expect(callGenerate).toHaveBeenCalledWith({ mode: "cutoff", exam: "TJ-RJ Analista", banca: "FGV" });
  });
});
