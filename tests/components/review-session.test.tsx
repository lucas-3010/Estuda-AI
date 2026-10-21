import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeCardRow } from "../srs/helpers";

const recordReview = vi.fn();
vi.mock("@/lib/data/reviews", () => ({ recordReview: (...args: unknown[]) => recordReview(...args) }));

import { ReviewSession } from "@/components/review/ReviewSession";

const queue = [
  makeCardRow({ id: "c1", front: "Pergunta um", back: "Resposta um" }),
  makeCardRow({ id: "c2", front: "Pergunta dois", back: "Resposta dois" }),
];

beforeEach(() => {
  recordReview.mockReset().mockResolvedValue(undefined);
});

describe("Sessão de revisão", () => {
  test("espaço revela o verso e mostra os 4 botões com intervalo", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    expect(screen.getByText("Pergunta um")).toBeInTheDocument();
    expect(screen.queryByText("Resposta um")).toBeNull();
    await user.keyboard(" ");
    expect(screen.getByText("Resposta um")).toBeInTheDocument();
    for (const name of [/errei/i, /difícil/i, /bom/i, /fácil/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  test("tecla 3 grava nota Bom e avança para o próximo cartão", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.keyboard(" ");
    await user.keyboard("3");
    await screen.findByText("Pergunta dois");
    expect(recordReview).toHaveBeenCalledWith("c1", 3, expect.objectContaining({ reps: 1 }));
  });

  test("teclas de nota antes de virar o cartão são ignoradas", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.keyboard("3");
    expect(recordReview).not.toHaveBeenCalled();
  });

  test("duas notas rápidas gravam só uma revisão", async () => {
    let resolve!: () => void;
    recordReview.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.keyboard(" ");
    await user.keyboard("3");
    await user.keyboard("3");
    expect(recordReview).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    await screen.findByText("Pergunta dois");
  });

  test("falha ao gravar mantém o cartão e mostra aviso", async () => {
    recordReview.mockRejectedValueOnce(new Error("rede"));
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.keyboard(" ");
    await user.click(screen.getByRole("button", { name: /bom/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível salvar/i);
    expect(screen.getByText("Pergunta um")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /bom/i }));
    await screen.findByText("Pergunta dois");
  });

  test("ao terminar mostra o resumo da sessão", async () => {
    // "Fácil" gradua cartões novos direto; "Bom" ainda passa pelos passos de aprendizagem
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.keyboard(" ");
    await user.keyboard("4");
    await screen.findByText("Pergunta dois");
    await user.keyboard(" ");
    await user.keyboard("4");
    await waitFor(() => expect(screen.getByRole("heading", { name: /sessão concluída/i })).toBeInTheDocument());
    expect(screen.getByText(/2 cartões revisados/i)).toBeInTheDocument();
  });

  test("cartão errado volta para o fim da fila da sessão", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.keyboard(" ");
    await user.keyboard("1");
    await screen.findByText("Pergunta dois");
    await user.keyboard(" ");
    await user.keyboard("3");
    await screen.findByText("Pergunta um");
    expect(screen.queryByRole("heading", { name: /sessão concluída/i })).toBeNull();
  });

  test("fila vazia mostra que não há nada para revisar", () => {
    render(<ReviewSession queue={[]} retention={0.9} />);
    expect(screen.getByText(/nada para revisar/i)).toBeInTheDocument();
  });
});
