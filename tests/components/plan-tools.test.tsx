import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const setExamDate = vi.fn();
vi.mock("@/lib/data/plans", () => ({ setExamDate: (...args: unknown[]) => setExamDate(...args) }));
vi.mock("@/lib/data/settings", () => ({ userTimeZone: () => "UTC" }));

import { ExamCountdown } from "@/components/home/ExamCountdown";
import { SourceForm } from "@/components/plan/SourceForm";

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

beforeEach(() => {
  setExamDate.mockReset().mockResolvedValue(undefined);
});

describe("ExamCountdown", () => {
  test("mostra os dias que faltam e oferece aumentar a meta", async () => {
    const raise = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ExamCountdown planId="p1" initialDate={inDays(10)} newCards={40} newCardsPerDay={2} onRaiseNewPerDay={raise} />,
    );
    expect(screen.getByText(/Faltam 10 dias para a prova/)).toBeInTheDocument();
    expect(screen.getByText(/estude 4 novos por dia/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aumentar minha meta para 4 por dia" }));
    expect(raise).toHaveBeenCalledWith(4);
  });

  test("meta atual suficiente não pede ajuste", () => {
    render(<ExamCountdown planId="p1" initialDate={inDays(10)} newCards={40} newCardsPerDay={20} onRaiseNewPerDay={vi.fn()} />);
    expect(screen.getByText(/já dá conta/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aumentar/ })).toBeNull();
  });

  test("sem data, grava a data escolhida", async () => {
    const user = userEvent.setup();
    render(<ExamCountdown planId="p1" initialDate={null} newCards={10} newCardsPerDay={20} onRaiseNewPerDay={vi.fn()} />);
    const date = inDays(5);
    await user.type(screen.getByLabelText("Data da prova"), date);
    expect(setExamDate).toHaveBeenCalledWith("p1", date);
    expect(await screen.findByText(/Faltam 5 dias/)).toBeInTheDocument();
  });
});

describe("SourceForm com link", () => {
  const props = {
    values: { topic: "", level: "iniciante" as const, context: "" },
    onChange: vi.fn(),
    onCancel: vi.fn(),
    busy: false,
    filesAllowed: true,
  };

  test("envia o link digitado", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SourceForm {...props} values={{ ...props.values, topic: "Fotossíntese" }} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Link da página"), "https://pt.wikipedia.org/wiki/Fotossintese");
    await user.click(screen.getByRole("button", { name: "Gerar cartões" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "link", url: "https://pt.wikipedia.org/wiki/Fotossintese" });
  });

  test("vídeo do YouTube explica como usar a transcrição e não envia", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SourceForm {...props} values={{ ...props.values, topic: "Aula" }} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Link da página"), "https://www.youtube.com/watch?v=abc");
    expect(screen.getByRole("alert")).toHaveTextContent("Mostrar transcrição");
    expect(screen.getByRole("button", { name: "Gerar cartões" })).toBeDisabled();
  });
});
