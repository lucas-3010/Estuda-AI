import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const reviewStats = vi.fn();
const dueForecast = vi.fn();
vi.mock("@/lib/data/reviews", () => ({
  reviewStats: (...a: unknown[]) => reviewStats(...a),
  dueForecast: (...a: unknown[]) => dueForecast(...a),
}));
vi.mock("@/lib/data/settings", () => ({ userTimeZone: () => "UTC" }));

import { StatsDashboard } from "@/components/stats/StatsDashboard";

const days = (n: number, f: (i: number) => { reviews: number; correct: number }) =>
  Array.from({ length: n }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, "0")}`, ...f(i) }));

beforeEach(() => {
  dueForecast.mockReset().mockResolvedValue(
    Array.from({ length: 14 }, (_, i) => ({ day: `2026-10-${String(i + 21).padStart(2, "0")}`, dueCount: i })),
  );
});

describe("Estatísticas", () => {
  test("sem revisões a taxa de acerto mostra —", async () => {
    reviewStats.mockResolvedValue(days(30, () => ({ reviews: 0, correct: 0 })));
    render(<StatsDashboard />);
    expect(await screen.findByTestId("accuracy")).toHaveTextContent("—");
  });

  test("8 de 10 corretas mostram 80%", async () => {
    reviewStats.mockResolvedValue(days(30, (i) => (i === 29 ? { reviews: 10, correct: 8 } : { reviews: 0, correct: 0 })));
    render(<StatsDashboard />);
    expect(await screen.findByTestId("accuracy")).toHaveTextContent("80%");
    expect(screen.getByTestId("total-reviews")).toHaveTextContent("10");
  });

  test("pede 30 dias de histórico e 14 de previsão no fuso do usuário", async () => {
    reviewStats.mockResolvedValue(days(30, () => ({ reviews: 0, correct: 0 })));
    render(<StatsDashboard />);
    await screen.findByTestId("accuracy");
    expect(reviewStats).toHaveBeenCalledWith(30, "UTC");
    expect(dueForecast).toHaveBeenCalledWith(14, "UTC");
  });
});
