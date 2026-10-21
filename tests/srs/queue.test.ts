import { describe, expect, test } from "vitest";
import { buildQueue } from "@/lib/srs/queue";
import { makeCardRow } from "./helpers";

const tz = "America/Sao_Paulo";
// 09:00 em São Paulo (UTC-3)
const now = new Date("2026-10-21T12:00:00.000Z");

function review(id: string, due: string) {
  return makeCardRow({ id, state: 2, due, reps: 3, stability: 3 });
}
function fresh(id: string, created = "2026-10-20T12:00:00.000Z") {
  return makeCardRow({ id, state: 0, due: created, created_at: created });
}

describe("fila do dia", () => {
  test("vencidos vêm antes dos novos, mais atrasados primeiro", () => {
    const queue = buildQueue(
      [fresh("n1"), review("r-recente", "2026-10-21T10:00:00.000Z"), review("r-antigo", "2026-10-18T10:00:00.000Z")],
      { now, timeZone: tz, newPerDay: 20, newStudiedToday: 0 },
    );
    expect(queue.map((c) => c.id)).toEqual(["r-antigo", "r-recente", "n1"]);
  });

  test("cartão que vence às 23h locais entra na fila de hoje", () => {
    // 23:00 em São Paulo = 02:00 UTC do dia seguinte
    const queue = buildQueue([review("tarde", "2026-10-22T02:00:00.000Z")], {
      now,
      timeZone: tz,
      newPerDay: 20,
      newStudiedToday: 0,
    });
    expect(queue.map((c) => c.id)).toEqual(["tarde"]);
  });

  test("cartões que vencem amanhã no fuso local ficam de fora", () => {
    // 00:30 de amanhã em São Paulo = 03:30 UTC
    const queue = buildQueue([review("amanha", "2026-10-22T03:30:00.000Z")], {
      now,
      timeZone: tz,
      newPerDay: 20,
      newStudiedToday: 0,
    });
    expect(queue).toEqual([]);
  });

  test("respeita o limite de novos já parcialmente gasto", () => {
    const novos = Array.from({ length: 30 }, (_, i) => fresh(`n${i}`));
    const queue = buildQueue(novos, { now, timeZone: tz, newPerDay: 20, newStudiedToday: 15 });
    expect(queue).toHaveLength(5);
  });

  test("limite já esgotado não traz novos", () => {
    const queue = buildQueue([fresh("n1")], { now, timeZone: tz, newPerDay: 20, newStudiedToday: 25 });
    expect(queue).toEqual([]);
  });
});
