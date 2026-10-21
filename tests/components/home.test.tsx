import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeCardRow } from "../srs/helpers";

const listPlansWithProgress = vi.fn();
vi.mock("@/lib/data/plans", () => ({ listPlansWithProgress: () => listPlansWithProgress() }));
const listDueCandidates = vi.fn();
vi.mock("@/lib/data/cards", () => ({ listDueCandidates: () => listDueCandidates() }));
const newCardsStudiedToday = vi.fn();
vi.mock("@/lib/data/reviews", () => ({ newCardsStudiedToday: () => newCardsStudiedToday() }));
vi.mock("@/lib/data/settings", () => ({
  getSettings: async () => ({ newCardsPerDay: 20, desiredRetention: 0.9, dailyGoal: 20, emailReminders: true }),
  userTimeZone: () => "UTC",
}));

import { HomeDashboard } from "@/components/home/HomeDashboard";

beforeEach(() => {
  listPlansWithProgress.mockReset().mockResolvedValue([]);
  listDueCandidates.mockReset().mockResolvedValue([]);
  newCardsStudiedToday.mockReset().mockResolvedValue(0);
});

describe("Início", () => {
  test("sem planos mostra o convite para criar o primeiro", async () => {
    render(<HomeDashboard />);
    const link = await screen.findByRole("link", { name: /criar meu primeiro plano/i });
    expect(link).toHaveAttribute("href", "/novo");
  });

  test("mostra quantos cartões vencem hoje e o progresso das etapas", async () => {
    listDueCandidates.mockResolvedValue([
      makeCardRow({ id: "r1", state: 2, due: "2000-01-01T00:00:00.000Z" }),
      ...Array.from({ length: 25 }, (_, i) => makeCardRow({ id: `n${i}` })),
    ]);
    newCardsStudiedToday.mockResolvedValue(5);
    listPlansWithProgress.mockResolvedValue([
      {
        id: "p1",
        topic: "SQL",
        level: "iniciante",
        createdAt: "2026-10-21T00:00:00Z",
        steps: [
          { id: "s1", title: "Joins", goal: "x", position: 0, counts: { new: 3, learning: 1, review: 2 } },
        ],
      },
    ]);
    render(<HomeDashboard />);
    // 1 vencido + (20 - 5) novos
    expect(await screen.findByText("16")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /revisar agora/i })).toHaveAttribute("href", "/revisar");
    expect(screen.getByText("SQL")).toBeInTheDocument();
    expect(screen.getByText("Joins")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /revisar este plano/i })).toHaveAttribute("href", "/revisar?plano=p1");
  });

  test("com zero cartões o botão de revisar fica indisponível", async () => {
    listPlansWithProgress.mockResolvedValue([
      { id: "p1", topic: "SQL", level: "iniciante", createdAt: "", steps: [] },
    ]);
    render(<HomeDashboard />);
    expect(await screen.findByText(/nada para revisar hoje/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /revisar agora/i })).toBeNull();
  });

  test("erro ao carregar mostra aviso", async () => {
    listPlansWithProgress.mockRejectedValue(new Error("x"));
    render(<HomeDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
  });
});
