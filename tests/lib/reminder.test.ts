import { describe, expect, test } from "vitest";
import { reminderEmail } from "@/lib/email/reminder";

describe("lembrete diário", () => {
  test("diz quantos cartões há para hoje e quantas gerações restam", () => {
    const mail = reminderEmail({ email: "a@b.c", plan: "pro", due_today: 12, generations_used: 10 }, "https://x.dev");
    expect(mail.subject).toBe("Você tem 12 cartões para revisar hoje");
    expect(mail.text).toContain("Ainda restam 50 de 60 gerações");
    expect(mail.html).toContain("https://x.dev/revisar");
  });

  test("singular para um cartão", () => {
    expect(reminderEmail({ email: "a@b.c", plan: "basico", due_today: 1, generations_used: 0 }, "x").subject).toBe(
      "Você tem 1 cartão para revisar hoje",
    );
  });
});
