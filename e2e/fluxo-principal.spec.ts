import { expect, test, type Page } from "@playwright/test";

// Requer o Supabase local rodando (`npx supabase start`) e o app com .env.local
// apontando para ele. O e-mail de login é lido do Mailpit do Supabase local.
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const cards = (prefix: string) =>
  Array.from({ length: 5 }, (_, i) => ({
    front: `${prefix}: pergunta ${i + 1}?`,
    back: `${prefix}: resposta ${i + 1}`,
  }));
const PLAN = {
  steps: ["Fundamentos", "Joins", "Índices", "Transações"].map((title) => ({
    title,
    goal: `Entender ${title.toLowerCase()}`,
    cards: cards(title),
  })),
};

async function magicLinkFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      const link = String(msg.Text).match(/https?:\/\/\S+\/auth\/v1\/verify\S+/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("E-mail de login não chegou");
}

async function login(page: Page) {
  const email = `e2e-${Date.now()}@teste.dev`;
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Receber link de acesso" }).click();
  await expect(page.getByText(/confira seu e-mail/i)).toBeVisible();
  await page.goto(await magicLinkFor(email));
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
}

test("gerar plano com IA, salvar e revisar um cartão", async ({ page }) => {
  let sentKey: string | null = null;
  await page.route("**/api/generate", async (route) => {
    sentKey = route.request().headers()["x-anthropic-key"] ?? null;
    await route.fulfill({ json: PLAN });
  });

  await login(page);
  await expect(page.getByRole("link", { name: "Criar meu primeiro plano" })).toBeVisible();

  // Configura a chave (só no navegador)
  await page.getByRole("link", { name: "Configurações" }).click();
  await page.getByLabel("Cole sua chave").fill("sk-ant-e2e-falsa-1234");
  await page.getByRole("button", { name: "Salvar" }).first().click();
  await expect(page.getByText("sk-ant-…1234")).toBeVisible();

  // Gera e salva o plano
  await page.getByRole("link", { name: "Novo tema" }).click();
  await page.getByLabel("Tema").fill("Banco de dados relacional");
  await page.getByRole("button", { name: "Gerar plano" }).click();
  await expect(page.getByRole("heading", { name: "Fundamentos" })).toBeVisible();
  expect(sentKey).toBe("sk-ant-e2e-falsa-1234");
  await page.getByRole("button", { name: "Salvar plano" }).click();

  // Início: 20 cartões novos (limite diário padrão)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
  await expect(page.getByText("cartões para hoje")).toBeVisible();
  await expect(page.getByText("20", { exact: true })).toBeVisible();

  // Revisa um cartão como Fácil
  await page.getByRole("link", { name: "Revisar agora" }).click();
  await expect(page.getByText("Fundamentos: pergunta 1?")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("Fundamentos: resposta 1")).toBeVisible();
  await page.keyboard.press("4");
  await expect(page.getByText("Fundamentos: pergunta 2?")).toBeVisible();

  // De volta ao Início, sobram 19
  await page.getByRole("link", { name: "Início" }).click();
  await expect(page.getByText("19", { exact: true })).toBeVisible();

  // Estatísticas registram a revisão
  await page.getByRole("link", { name: "Estatísticas" }).click();
  await expect(page.getByTestId("total-reviews")).toHaveText("1");
  await expect(page.getByTestId("accuracy")).toHaveText("100%");
});
