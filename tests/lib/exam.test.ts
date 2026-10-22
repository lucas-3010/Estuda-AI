import { describe, expect, test } from "vitest";
import { daysBetween, examPlan, shortDate, todayIn } from "@/lib/exam";

describe("examPlan", () => {
  test("divide os cartões novos pelos dias até a prova, arredondando para cima", () => {
    expect(examPlan("2026-11-01", "2026-10-22", 40)).toEqual({ kind: "ahead", days: 10, newPerDay: 4 });
    expect(examPlan("2026-10-25", "2026-10-22", 10)).toEqual({ kind: "ahead", days: 3, newPerDay: 4 });
  });

  test("hoje e datas passadas", () => {
    expect(examPlan("2026-10-22", "2026-10-22", 10)).toEqual({ kind: "today" });
    expect(examPlan("2026-10-01", "2026-10-22", 10)).toEqual({ kind: "past" });
  });

  test("conta dias atravessando o horário de verão e a virada do ano", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  test("data de hoje no fuso da pessoa", () => {
    const now = new Date("2026-10-22T02:00:00Z");
    expect(todayIn("America/Sao_Paulo", now)).toBe("2026-10-21");
    expect(todayIn("UTC", now)).toBe("2026-10-22");
  });

  test("formato curto", () => {
    expect(shortDate("2026-11-12")).toBe("12/11");
  });
});
