import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const listPracticeExams = vi.fn();
const savePracticeExam = vi.fn();
const callGenerate = vi.fn();
vi.mock("@/lib/data/plans", () => ({ listPlansWithProgress: async () => [] }));
vi.mock("@/lib/data/cards", () => ({ listCards: async () => [] }));
vi.mock("@/lib/data/account", () => ({ getAccount: async () => ({ plan: { files: false } }) }));
vi.mock("@/lib/data/practiceExams", () => ({
  listPracticeExams: () => listPracticeExams(),
  savePracticeExam: (...args: unknown[]) => savePracticeExam(...args),
  deletePracticeExam: async () => {},
}));
vi.mock("@/lib/generateClient", () => ({ callGenerate: (...args: unknown[]) => callGenerate(...args) }));

import { QuizSession } from "@/components/quiz/QuizSession";

const enemQuestion = {
  id: "2023-137",
  year: 2023,
  number: 137,
  language: null,
  context: "Os 100 funcionários de uma empresa…",
  question: "A média dos salários é",
  options: ["2.000,00.", "2.500,00.", "3.250,00.", "4.500,00.", "9.000,00."],
  answer: 2,
};

beforeEach(() => {
  listPracticeExams.mockReset().mockResolvedValue([]);
  savePracticeExam.mockReset();
  callGenerate.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url === "/enem/matematica.json" ? [enemQuestion] : []),
    })),
  );
});

describe("quiz com questões reais", () => {
  test("começa no ENEM e mostra a questão com origem e gabarito oficial", async () => {
    const user = userEvent.setup();
    render(<QuizSession />);
    expect(screen.getByRole("button", { name: "Questões do ENEM" })).toHaveAttribute("aria-pressed", "true");
    await user.selectOptions(screen.getByLabelText("Área"), "matematica");
    expect(screen.queryByLabelText("Língua estrangeira")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Começar quiz" }));

    expect(await screen.findByText("ENEM 2023 · Questão 137")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/enem/matematica.json");
    await user.click(screen.getByRole("button", { name: /2\.500,00/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Errou. A certa é a C.");
  });

  test("ano sem questões avisa em vez de começar", async () => {
    const user = userEvent.setup();
    render(<QuizSession />);
    await user.selectOptions(screen.getByLabelText("Área"), "matematica");
    await user.selectOptions(screen.getByLabelText("Ano da prova"), "2010");
    await user.click(screen.getByRole("button", { name: "Começar quiz" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não há questões com esses filtros");
  });

  test("importa uma prova colada e treina com ela, avisando quando o gabarito veio da IA", async () => {
    const exam = {
      title: "Vunesp 2022",
      questions: [{ number: 3, statement: "Qual é a capital do Brasil?", options: ["Rio", "Brasília"], answer: 1, fromKey: false }],
    };
    callGenerate.mockResolvedValue(exam);
    savePracticeExam.mockImplementation(async (e) => ({ id: "p1", createdAt: "", ...e }));
    const user = userEvent.setup();
    render(<QuizSession />);

    await user.click(screen.getByRole("button", { name: "Provas que importei" }));
    expect(await screen.findByText("Você ainda não importou nenhuma prova.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Importar prova" }));
    await user.click(screen.getByRole("button", { name: "PDF ou foto" }));
    expect(screen.getByText(/está nos planos Pro e Max/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Colar texto" }));
    await user.type(screen.getByLabelText("Texto da prova"), "3. Qual é a capital do Brasil? (A) Rio (B) Brasília. ".repeat(2));
    await user.type(screen.getByLabelText("Gabarito (opcional)"), "3-B");
    await user.click(screen.getByRole("button", { name: "Importar prova" }));

    expect(callGenerate).toHaveBeenCalledWith(expect.objectContaining({ mode: "import", answerKey: "3-B" }));
    expect(await screen.findByRole("option", { name: "Vunesp 2022 (1 questões)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Prova inteira" }));
    await user.click(screen.getByRole("button", { name: "Começar quiz" }));
    expect(screen.getByText("Vunesp 2022 · Questão 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Brasília/ }));
    expect(screen.getByText(/sugerida pela IA/)).toBeInTheDocument();
  });
});
