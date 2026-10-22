import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AiError } from "@/lib/ai/errors";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push, refresh: vi.fn() }) }));

const callGenerate = vi.fn();
vi.mock("@/lib/generateClient", () => ({ callGenerate: (...args: unknown[]) => callGenerate(...args) }));
vi.mock("@/lib/data/account", () => ({
  getAccount: async () => ({
    plan: { id: "gratis", name: "Grátis", generations: 3, files: false },
    used: 1,
    remaining: 2,
  }),
}));

const savePlan = vi.fn();
vi.mock("@/lib/data/plans", () => ({ savePlan: (...args: unknown[]) => savePlan(...args) }));

import { NewTopicFlow } from "@/components/plan/NewTopicFlow";

const cards = (prefix: string) =>
  Array.from({ length: 5 }, (_, i) => ({ front: `${prefix} pergunta ${i + 1}`, back: `${prefix} resposta ${i + 1}` }));
const plan = {
  steps: ["Fundamentos", "Joins", "Índices", "Transações"].map((title) => ({
    title,
    goal: `Objetivo de ${title}`,
    cards: cards(title),
  })),
};

async function generatePlan() {
  const user = userEvent.setup();
  const view = render(<NewTopicFlow />);
  await user.type(screen.getByLabelText(/tema/i), "Banco de dados relacional");
  await user.click(screen.getByRole("button", { name: /gerar plano/i }));
  await screen.findByRole("heading", { name: /Fundamentos/ });
  return Object.assign(user, { unmount: view.unmount });
}

beforeEach(() => {
  push.mockReset();
  callGenerate.mockReset().mockResolvedValue(plan);
  savePlan.mockReset().mockResolvedValue("plan-1");
});

describe("Novo tema", () => {
  test("mostra quantas gerações restam no mês", async () => {
    render(<NewTopicFlow />);
    expect(await screen.findByText("2 de 3 gerações com IA restantes este mês")).toBeInTheDocument();
  });

  test("no plano grátis, PDF e foto mostram o convite para assinar", async () => {
    const user = userEvent.setup();
    render(<NewTopicFlow />);
    await screen.findByText(/gerações com IA restantes/);
    await user.click(screen.getByRole("tab", { name: "Do meu material" }));
    await user.click(screen.getByRole("button", { name: "PDF ou foto" }));
    expect(screen.getByText(/está nos planos Pro e Max/)).toBeInTheDocument();
  });

  test("gera a partir de texto colado", async () => {
    const user = userEvent.setup();
    render(<NewTopicFlow />);
    await user.click(screen.getByRole("tab", { name: "Do meu material" }));
    await user.type(screen.getByLabelText("Texto para estudar"), "A mitocôndria é a organela que produz energia na forma de ATP.");
    await user.type(screen.getByLabelText("Nome do tema"), "Organelas");
    await user.click(screen.getByRole("button", { name: "Gerar cartões" }));
    await screen.findByRole("heading", { name: /Fundamentos/ });
    expect(callGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "source",
        topic: "Organelas",
        source: { kind: "text", text: "A mitocôndria é a organela que produz energia na forma de ATP." },
      }),
      expect.anything(),
    );
  });

  test("gera o plano e mostra a prévia de todas as etapas", async () => {
    await generatePlan();
    expect(callGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "plan", topic: "Banco de dados relacional", level: "iniciante" }),
      expect.anything(),
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(savePlan).not.toHaveBeenCalled();
  });

  test("editar o verso de um cartão e salvar envia o texto editado", async () => {
    const user = await generatePlan();
    expect(screen.queryByDisplayValue("Fundamentos resposta 1")).toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Mostrar verso" })[0]);
    const back = screen.getByDisplayValue("Fundamentos resposta 1");
    await user.clear(back);
    await user.type(back, "Resposta corrigida");
    await user.click(screen.getByRole("button", { name: /salvar plano/i }));
    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    const saved = savePlan.mock.calls[0][0];
    expect(saved.plan.steps[0].cards[0].back).toBe("Resposta corrigida");
    expect(saved.topic).toBe("Banco de dados relacional");
    expect(push).toHaveBeenCalledWith("/");
  });

  test("apagar uma etapa remove-a do que é salvo", async () => {
    const user = await generatePlan();
    const step = screen.getByRole("heading", { name: /Joins/ }).closest("section")!;
    await user.click(within(step).getByRole("button", { name: /apagar etapa/i }));
    await user.click(screen.getByRole("button", { name: /salvar plano/i }));
    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(savePlan.mock.calls[0][0].plan.steps.map((s: { title: string }) => s.title)).toEqual([
      "Fundamentos",
      "Índices",
      "Transações",
    ]);
  });

  test("apagar um cartão remove-o da etapa", async () => {
    const user = await generatePlan();
    const step = screen.getByRole("heading", { name: /Fundamentos/ }).closest("section")!;
    await user.click(within(step).getAllByRole("button", { name: /apagar cartão/i })[0]);
    await user.click(screen.getByRole("button", { name: /salvar plano/i }));
    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(savePlan.mock.calls[0][0].plan.steps[0].cards).toHaveLength(4);
  });

  test("gerar de novo uma etapa substitui só aquela etapa", async () => {
    const user = await generatePlan();
    callGenerate.mockResolvedValueOnce({ title: "Joins", goal: "Objetivo de Joins", cards: cards("Novo") });
    const step = screen.getByRole("heading", { name: /Joins/ }).closest("section")!;
    await user.click(within(step).getByRole("button", { name: /gerar de novo/i }));
    await screen.findByDisplayValue("Novo pergunta 1");
    expect(callGenerate).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "step", step: { title: "Joins", goal: "Objetivo de Joins" } }),
      expect.anything(),
    );
    expect(screen.getByDisplayValue("Fundamentos pergunta 1")).toBeInTheDocument();
  });

  test("cota esgotada mostra a mensagem, o link de planos e mantém o tema digitado", async () => {
    callGenerate.mockRejectedValue(new AiError("quota_exceeded"));
    const user = userEvent.setup();
    render(<NewTopicFlow />);
    await user.type(screen.getByLabelText(/tema/i), "Recursão");
    await user.click(screen.getByRole("button", { name: /gerar plano/i }));
    expect(await screen.findByText(/Você usou todas as gerações com IA/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/precos");
    expect(screen.getByLabelText(/tema/i)).toHaveValue("Recursão");
  });

  test("desmontar a prévia sem salvar não grava nada", async () => {
    const { unmount } = await generatePlan();
    unmount(); // simula sair da página
    expect(savePlan).not.toHaveBeenCalled();
  });

  test("não salva etapa com menos de 1 cartão e avisa", async () => {
    const user = await generatePlan();
    const step = screen.getByRole("heading", { name: /Fundamentos/ }).closest("section")!;
    for (let i = 0; i < 5; i++) {
      await user.click(within(step).getAllByRole("button", { name: /apagar cartão/i })[0]);
    }
    await user.click(screen.getByRole("button", { name: /salvar plano/i }));
    expect(await screen.findByText(/etapa sem cartões/i)).toBeInTheDocument();
    expect(savePlan).not.toHaveBeenCalled();
  });
});
