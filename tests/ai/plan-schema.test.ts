import { describe, expect, test } from "vitest";
import { generateRequestSchema, planSchema } from "@/lib/validation/plan";

const card = { front: "O que é um índice?", back: "Uma estrutura que acelera buscas." };
const step = (n: number) => ({ title: "Etapa", goal: "Objetivo", cards: Array(n).fill(card) });

describe("planSchema", () => {
  test("aceita plano com 4 etapas de 5 cartões", () => {
    expect(planSchema.safeParse({ steps: Array(4).fill(step(5)) }).success).toBe(true);
  });

  test("rejeita plano com 3 etapas", () => {
    expect(planSchema.safeParse({ steps: Array(3).fill(step(5)) }).success).toBe(false);
  });

  test("rejeita plano com 9 etapas", () => {
    expect(planSchema.safeParse({ steps: Array(9).fill(step(5)) }).success).toBe(false);
  });

  test("rejeita etapa com 11 cartões", () => {
    expect(planSchema.safeParse({ steps: [...Array(3).fill(step(5)), step(11)] }).success).toBe(false);
  });

  test("rejeita etapa com 4 cartões", () => {
    expect(planSchema.safeParse({ steps: [...Array(3).fill(step(5)), step(4)] }).success).toBe(false);
  });
});

describe("generateRequestSchema", () => {
  test("aceita pedido de plano válido", () => {
    expect(
      generateRequestSchema.safeParse({ mode: "plan", topic: "Índices no PostgreSQL", level: "iniciante" }).success,
    ).toBe(true);
  });

  test("rejeita tema com 201 caracteres", () => {
    expect(
      generateRequestSchema.safeParse({ mode: "plan", topic: "a".repeat(201), level: "iniciante" }).success,
    ).toBe(false);
  });

  test("rejeita tema com 2 caracteres", () => {
    expect(generateRequestSchema.safeParse({ mode: "plan", topic: "ab", level: "iniciante" }).success).toBe(false);
  });

  test("rejeita contexto com mais de 1000 caracteres", () => {
    expect(
      generateRequestSchema.safeParse({
        mode: "plan",
        topic: "Joins",
        level: "avancado",
        context: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  test("rejeita nível desconhecido", () => {
    expect(generateRequestSchema.safeParse({ mode: "plan", topic: "Joins", level: "expert" }).success).toBe(false);
  });

  test("modo step exige a etapa", () => {
    expect(generateRequestSchema.safeParse({ mode: "step", topic: "Joins", level: "iniciante" }).success).toBe(false);
    expect(
      generateRequestSchema.safeParse({
        mode: "step",
        topic: "Joins",
        level: "iniciante",
        step: { title: "Inner join", goal: "Entender inner join" },
      }).success,
    ).toBe(true);
  });

  test("modo source aceita texto, PDF e imagem, e recusa texto curto demais", () => {
    const base = { mode: "source", topic: "Biologia", level: "iniciante" };
    expect(generateRequestSchema.safeParse({ ...base, source: { kind: "text", text: "a".repeat(60) } }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ ...base, source: { kind: "text", text: "curto" } }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, source: { kind: "pdf", data: "JVBERi0x" } }).success).toBe(true);
    expect(
      generateRequestSchema.safeParse({ ...base, source: { kind: "image", mediaType: "image/png", data: "iVBOR" } }).success,
    ).toBe(true);
    expect(
      generateRequestSchema.safeParse({ ...base, source: { kind: "image", mediaType: "image/heic", data: "x" } }).success,
    ).toBe(false);
  });
});
