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
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Receber link de acesso" }).click();
  await expect(page.getByText(/confira seu e-mail/i)).toBeVisible();
  const link = await magicLinkFor(email);
  await page.goto(link);
  try {
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible({ timeout: 15_000 });
  } catch {
    const body = (await page.locator("body").innerText()).slice(0, 300);
    throw new Error(`Login não concluído. Link: ${link.replace(/token=[^&]+/, "token=…")} | URL final: ${page.url()} | Página: ${body}`);
  }
}

test("gerar plano com IA, salvar e revisar um cartão", async ({ page }) => {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({ json: PLAN });
  });

  await login(page);
  // Dicas de boas-vindas na primeira visita
  await page.getByRole("button", { name: "Pular" }).click();
  await expect(page.getByRole("link", { name: "Criar meu primeiro plano" })).toBeVisible();

  // Gera e salva o plano
  await page.getByRole("link", { name: "Novo tema" }).click();
  await page.getByLabel("Tema").fill("Banco de dados relacional");
  await page.getByRole("button", { name: "Gerar plano" }).click();
  await expect(page.getByRole("heading", { name: "Fundamentos" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar plano" }).click();

  // Com cacheComponents o Next mantém páginas anteriores ocultas no DOM, por isso
  // as buscas por texto daqui em diante consideram só elementos visíveis.
  // Início: 20 cartões novos (limite diário padrão)
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
  await expect(page.getByText("cartões para hoje").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();

  // Revisa um cartão como Fácil
  await page.getByRole("link", { name: "Revisar agora" }).click();
  await expect(page.getByText("Fundamentos: pergunta 1?").filter({ visible: true })).toBeVisible();
  // Resposta idêntica ao verso: corrigida sem chamar a IA
  await page.getByLabel("Sua resposta").fill("Fundamentos: resposta 1");
  await page.getByLabel("Sua resposta").press("Enter");
  await expect(page.getByRole("heading", { name: /você acertou/i })).toBeVisible();
  await expect(page.getByText("Fundamentos: resposta 1").filter({ visible: true })).toBeVisible();
  await page.keyboard.press("4");
  await expect(page.getByText("Fundamentos: pergunta 2?").filter({ visible: true })).toBeVisible();

  // De volta ao Início, sobram 19
  await page.getByRole("link", { name: "Início" }).click();
  await expect(page.getByText("19", { exact: true }).filter({ visible: true })).toBeVisible();

  // Estatísticas registram a revisão
  await page.getByRole("link", { name: "Estatísticas" }).click();
  await expect(page.getByTestId("total-reviews")).toHaveText("1");
  await expect(page.getByTestId("accuracy")).toHaveText("100%");
});

test("compartilhar um baralho por link", async ({ page, browser }) => {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({ json: PLAN });
  });

  await login(page);
  await page.getByRole("button", { name: "Pular" }).click();
  await page.getByRole("link", { name: "Novo tema" }).click();
  await page.getByLabel("Tema").fill("Banco de dados compartilhado");
  await page.getByRole("button", { name: "Gerar plano" }).click();
  await page.getByRole("button", { name: "Salvar plano" }).click();
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();

  // Cria o link público do plano
  await page.getByRole("button", { name: "Compartilhar" }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Criar link" }).click();
  const link = await page.getByLabel("Link do baralho").inputValue();
  expect(link).toMatch(/\/b\/[A-Za-z0-9_-]{16,64}$/);

  // Um visitante sem conta vê as perguntas, com as respostas escondidas
  const visitor = await browser.newContext();
  const guest = await visitor.newPage();
  await guest.goto(link);
  await expect(guest.getByRole("heading", { name: "Banco de dados compartilhado" })).toBeVisible();
  await expect(guest.getByText("Fundamentos: pergunta 1?")).toBeVisible();
  await expect(guest.getByText("Fundamentos: resposta 1")).toHaveCount(0);

  // Para estudar, precisa entrar
  await guest.getByRole("button", { name: "Estudar este baralho" }).click();
  await expect(guest).toHaveURL(/\/login$/);
  await visitor.close();

  // Desativado, o link para de funcionar
  await page.getByRole("button", { name: "Desativar link" }).click();
  const after = await browser.newContext();
  const gone = await after.newPage();
  await gone.goto(link);
  await expect(gone.getByText("Banco de dados compartilhado")).toHaveCount(0);
  await after.close();
});
