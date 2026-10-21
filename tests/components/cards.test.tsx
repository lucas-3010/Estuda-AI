import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeCardRow } from "../srs/helpers";

const listCards = vi.fn();
const updateCard = vi.fn();
const deleteCard = vi.fn();
const createCard = vi.fn();
vi.mock("@/lib/data/cards", () => ({
  listCards: (...a: unknown[]) => listCards(...a),
  updateCard: (...a: unknown[]) => updateCard(...a),
  deleteCard: (...a: unknown[]) => deleteCard(...a),
  createCard: (...a: unknown[]) => createCard(...a),
}));
vi.mock("@/lib/data/plans", () => ({
  listPlansWithProgress: async () => [
    { id: "p1", topic: "SQL", level: "iniciante", createdAt: "", steps: [{ id: "s1", title: "Joins", goal: "", position: 0, counts: { new: 0, learning: 0, review: 0 } }] },
  ],
}));

import { CardsManager } from "@/components/cards/CardsManager";

const rows = [
  makeCardRow({ id: "c1", front: "O que é um INNER JOIN?", back: "Linhas que casam nas duas tabelas", step_id: "s1" }),
  makeCardRow({ id: "c2", front: "O que é Big O?", back: "Notação de complexidade" }),
];

beforeEach(() => {
  listCards.mockReset().mockResolvedValue(rows);
  updateCard.mockReset().mockResolvedValue(undefined);
  deleteCard.mockReset().mockResolvedValue(undefined);
  createCard.mockReset().mockImplementation(async (c) => makeCardRow({ id: "novo", ...c }));
});

describe("Cartões", () => {
  test("buscar 'join' filtra a lista", async () => {
    const user = userEvent.setup();
    render(<CardsManager />);
    await screen.findByText("O que é Big O?");
    await user.type(screen.getByRole("searchbox"), "join");
    expect(screen.queryByText("O que é Big O?")).toBeNull();
    expect(screen.getByText("O que é um INNER JOIN?")).toBeInTheDocument();
  });

  test("editar e salvar chama updateCard com o texto novo", async () => {
    const user = userEvent.setup();
    render(<CardsManager />);
    const item = (await screen.findByText("O que é Big O?")).closest("li")!;
    await user.click(within(item).getByRole("button", { name: /editar/i }));
    const back = within(item).getByLabelText(/verso/i);
    await user.clear(back);
    await user.type(back, "Mede como o custo cresce");
    await user.click(within(item).getByRole("button", { name: /salvar/i }));
    await waitFor(() =>
      expect(updateCard).toHaveBeenCalledWith("c2", { front: "O que é Big O?", back: "Mede como o custo cresce" }),
    );
  });

  test("apagar pede confirmação na própria página", async () => {
    const user = userEvent.setup();
    render(<CardsManager />);
    const item = (await screen.findByText("O que é Big O?")).closest("li")!;
    await user.click(within(item).getByRole("button", { name: /^apagar$/i }));
    expect(deleteCard).not.toHaveBeenCalled();
    await user.click(within(item).getByRole("button", { name: /confirmar/i }));
    await waitFor(() => expect(deleteCard).toHaveBeenCalledWith("c2"));
    await waitFor(() => expect(screen.queryByText("O que é Big O?")).toBeNull());
  });

  test("criar cartão manual adiciona à lista", async () => {
    const user = userEvent.setup();
    render(<CardsManager />);
    await screen.findByText("O que é Big O?");
    await user.click(screen.getByRole("button", { name: /novo cartão/i }));
    const form = screen.getByRole("form", { name: /novo cartão/i });
    await user.type(within(form).getByLabelText(/frente/i), "O que é recursão?");
    await user.type(within(form).getByLabelText(/verso/i), "Função que chama a si mesma");
    await user.click(within(form).getByRole("button", { name: /salvar/i }));
    await waitFor(() =>
      expect(createCard).toHaveBeenCalledWith({ front: "O que é recursão?", back: "Função que chama a si mesma", stepId: null }),
    );
    expect(await screen.findByText("O que é recursão?")).toBeInTheDocument();
  });
});
