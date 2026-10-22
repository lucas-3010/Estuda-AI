import { describe, expect, test, vi } from "vitest";
import type { AiClient } from "@/lib/ai/generate";
import { tutorReply, tutorRequestSchema } from "@/lib/ai/tutor";

const CARD_ID = "7f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f";
const card = { front: "Qual a capital da França?", back: "Paris" };

describe("tutorRequestSchema", () => {
  test("aceita conversa alternada que termina no estudante", () => {
    const messages = [
      { role: "user", content: "Me explica?" },
      { role: "assistant", content: "Claro." },
      { role: "user", content: "E por quê?" },
    ];
    expect(tutorRequestSchema.safeParse({ cardId: CARD_ID, messages }).success).toBe(true);
  });

  test("recusa conversa que termina no tutor ou não alterna", () => {
    const endsWithTutor = [
      { role: "user", content: "Oi" },
      { role: "assistant", content: "Oi" },
    ];
    const twoUsers = [
      { role: "user", content: "Oi" },
      { role: "user", content: "Oi de novo" },
    ];
    expect(tutorRequestSchema.safeParse({ cardId: CARD_ID, messages: endsWithTutor }).success).toBe(false);
    expect(tutorRequestSchema.safeParse({ cardId: CARD_ID, messages: twoUsers }).success).toBe(false);
  });

  test("limita a conversa a 4 perguntas", () => {
    const messages = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" }));
    expect(tutorRequestSchema.safeParse({ cardId: CARD_ID, messages }).success).toBe(false);
  });
});

describe("tutorReply", () => {
  test("manda o cartão junto com a primeira pergunta e devolve o texto", async () => {
    const create = vi.fn().mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: " Porque sim. " }] });
    const client = { messages: { create } } as unknown as AiClient;
    await expect(tutorReply(client, card, [{ role: "user", content: "Me explica?" }])).resolves.toBe("Porque sim.");
    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.messages[0].content).toContain("Paris");
    expect(params.messages[0].content).toContain("Me explica?");
  });

  test("recusa vira refused", async () => {
    const create = vi.fn().mockResolvedValue({ stop_reason: "refusal", content: [] });
    const client = { messages: { create } } as unknown as AiClient;
    await expect(tutorReply(client, card, [{ role: "user", content: "Oi" }])).rejects.toMatchObject({ code: "refused" });
  });
});
