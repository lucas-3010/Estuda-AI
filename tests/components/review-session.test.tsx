import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeCardRow } from "../srs/helpers";

const recordReview = vi.fn();
vi.mock("@/lib/data/reviews", () => ({ recordReview: (...args: unknown[]) => recordReview(...args) }));

const requestCheck = vi.fn();
vi.mock("@/lib/checkAnswerClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/checkAnswerClient")>()),
  requestCheck: (...args: unknown[]) => requestCheck(...args),
}));

import { ReviewSession } from "@/components/review/ReviewSession";

const queue = [
  makeCardRow({ id: "c1", front: "Pergunta um", back: "Resposta um" }),
  makeCardRow({ id: "c2", front: "Pergunta dois", back: "Resposta dois" }),
];

beforeEach(() => {
  recordReview.mockReset().mockResolvedValue(undefined);
  requestCheck.mockReset().mockResolvedValue({ correct: true, feedback: "", howTo: "" });
});

/** Responde o cartão atual (a correção é simulada como certa) e espera o verso aparecer. */
async function answer(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Sua resposta"), "minha resposta{Enter}");
  await screen.findByRole("heading", { name: /você acertou/i });
}

describe("Sessão de revisão", () => {
  test("o verso só aparece depois de responder", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    expect(screen.getByText("Pergunta um")).toBeInTheDocument();
    expect(screen.getByLabelText("Sua resposta")).toHaveFocus();
    await user.click(document.body);
    await user.keyboard(" ");
    await user.keyboard("{Enter}");
    expect(screen.queryByText("Resposta um")).toBeNull();
    await answer(user);
    expect(screen.getByText("Resposta um")).toBeInTheDocument();
    for (const name of [/errei/i, /difícil/i, /bom/i, /fácil/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  test("tecla 3 grava nota Bom e avança para o próximo cartão", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await answer(user);
    await user.keyboard("3");
    await screen.findByText("Pergunta dois");
    expect(recordReview).toHaveBeenCalledWith("c1", 3, expect.objectContaining({ reps: 1 }), null);
  });

  test("teclas de nota antes de responder são ignoradas", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.click(document.body);
    await user.keyboard("3");
    expect(recordReview).not.toHaveBeenCalled();
  });

  test("duas notas rápidas gravam só uma revisão", async () => {
    let resolve!: () => void;
    recordReview.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await answer(user);
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
    await answer(user);
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
    await answer(user);
    await user.keyboard("4");
    await screen.findByText("Pergunta dois");
    await answer(user);
    await user.keyboard("4");
    await waitFor(() => expect(screen.getByRole("heading", { name: /sessão concluída/i })).toBeInTheDocument());
    expect(screen.getByText(/2 cartões revisados/i)).toBeInTheDocument();
  });

  test("cartão errado volta para o fim da fila da sessão", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await answer(user);
    await user.keyboard("1");
    await screen.findByText("Pergunta dois");
    await answer(user);
    await user.keyboard("3");
    await screen.findByText("Pergunta um");
    expect(screen.queryByRole("heading", { name: /sessão concluída/i })).toBeNull();
  });

  test("resposta certa mostra que acertou, o tempo e sugere a nota", async () => {
    requestCheck.mockResolvedValue({ correct: true, feedback: "Isso mesmo.", howTo: "" });
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.type(screen.getByLabelText("Sua resposta"), "resposta um{Enter}");
    expect(requestCheck).toHaveBeenCalledWith("c1", "resposta um");
    expect(await screen.findByRole("heading", { name: /você acertou em \d+ segundo/i })).toBeInTheDocument();
    expect(screen.getByText("Resposta um")).toBeInTheDocument();
    expect(screen.getByText(/nota sugerida/i)).toBeInTheDocument();
  });

  test("resposta errada explica o erro e o caminho até a resposta", async () => {
    requestCheck.mockResolvedValue({
      correct: false,
      feedback: "Você confundiu os conceitos.",
      howTo: "Pense primeiro na definição.",
    });
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.type(screen.getByLabelText("Sua resposta"), "outra coisa");
    await user.click(screen.getByRole("button", { name: "Responder" }));
    expect(await screen.findByRole("heading", { name: /resposta incorreta/i })).toBeInTheDocument();
    expect(screen.getByText("Por que está errada")).toBeInTheDocument();
    expect(screen.getByText("Você confundiu os conceitos.")).toBeInTheDocument();
    expect(screen.getByText("Como chegar na resposta certa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /errei/i }));
    await screen.findByText("Pergunta dois");
    expect(recordReview).toHaveBeenCalledWith("c1", 1, expect.anything(), null);
    expect(screen.getByLabelText("Sua resposta")).toHaveValue("");
  });

  test("se a correção falhar, mostra o verso para a pessoa se avaliar", async () => {
    const { CheckError } = await import("@/lib/checkAnswerClient");
    requestCheck.mockRejectedValue(new CheckError("quota_exceeded"));
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.type(screen.getByLabelText("Sua resposta"), "resposta{Enter}");
    expect(await screen.findByText(/correções pela IA de hoje/i)).toBeInTheDocument();
    expect(screen.getByText("Resposta um")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bom/i })).toBeInTheDocument();
  });

  test("\"Não sei\" mostra o verso e só deixa continuar como erro", async () => {
    const user = userEvent.setup();
    render(<ReviewSession queue={queue} retention={0.9} />);
    await user.click(screen.getByRole("button", { name: /não sei/i }));
    expect(screen.getByText("Resposta um")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bom/i })).toBeNull();
    await user.keyboard("4");
    expect(recordReview).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("Pergunta dois");
    expect(recordReview).toHaveBeenCalledWith("c1", 1, expect.anything(), null);
    expect(requestCheck).not.toHaveBeenCalled();
  });

  test("fila vazia mostra que não há nada para revisar", () => {
    render(<ReviewSession queue={[]} retention={0.9} />);
    expect(screen.getByText(/nada para revisar/i)).toBeInTheDocument();
  });
});
