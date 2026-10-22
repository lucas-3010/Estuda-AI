// Lei seca: leitura do texto da lei em artigos, para citar nos cartões e vigiar mudanças.

/** Sites oficiais de onde o servidor pode baixar o texto da lei. */
export const LAW_HOSTS = [
  "planalto.gov.br",
  "www.planalto.gov.br",
  "legis.senado.leg.br",
  "www25.senado.leg.br",
  "www.senado.leg.br",
  "www2.camara.leg.br",
  "www.camara.leg.br",
  "normas.leg.br",
] as const;

export function isLawUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && (LAW_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  ordm: "º",
  ordf: "ª",
  deg: "°",
  sect: "§",
  ndash: "–",
  mdash: "—",
  aacute: "á",
  agrave: "à",
  acirc: "â",
  atilde: "ã",
  eacute: "é",
  ecirc: "ê",
  iacute: "í",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  uacute: "ú",
  ccedil: "ç",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  Ccedil: "Ç",
  Atilde: "Ã",
  Otilde: "Õ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code] ?? match;
  });
}

/**
 * Texto corrido a partir do HTML da lei. O texto riscado (revogado ou com redação antiga,
 * como o Planalto mostra) sai, para os cartões usarem só a redação em vigor.
 */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(strike|s|del)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text);
}

/** Espaços repetidos viram um só, linha a linha; linhas vazias saem. */
export function normalizeLaw(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[\s ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const ARTICLE_START = /^Art\.?\s*(\d+)\s*(?:º|°|o)?(?:\s*-\s*([A-Z]))?(?=[\s.\-–—]|$)/i;

export type LawArticle = { key: string; number: number; text: string };

/** Divide o texto normalizado em artigos ("Art. 5º", "Art. 121-A"). Repetições ficam com a primeira. */
export function splitArticles(text: string): LawArticle[] {
  const articles: LawArticle[] = [];
  const seen = new Set<string>();
  let current: LawArticle | null = null;
  for (const line of normalizeLaw(text).split("\n")) {
    const match = ARTICLE_START.exec(line);
    if (match) {
      const key = match[2] ? `${match[1]}-${match[2].toUpperCase()}` : match[1];
      current = seen.has(key) ? null : { key, number: Number(match[1]), text: line };
      if (current) {
        seen.add(key);
        articles.push(current);
      }
    } else if (current) {
      current.text += `\n${line}`;
    }
  }
  return articles;
}

/** "Art. 5º, LXIII" → "5"; "art. 121-A, § 2º" → "121-A". */
export function articleKey(ref: string): string | null {
  const match = /art(?:igo)?s?\.?\s*(\d+)\s*(?:º|°|o)?(?:\s*-\s*([A-Z])\b)?/i.exec(ref);
  if (!match) return null;
  return match[2] ? `${match[1]}-${match[2].toUpperCase()}` : match[1];
}

/** Intervalo digitado pela pessoa: "1 a 20", "arts. 5º ao 17", "37". */
export function parseRange(value: string): { from: number; to: number } | null {
  const numbers = (value.match(/\d+/g) ?? []).map(Number);
  if (numbers.length === 0) return null;
  const from = numbers[0];
  const to = numbers.length > 1 ? numbers[1] : numbers[0];
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Só os artigos do intervalo; sem intervalo, a lei inteira. */
export function selectArticles(articles: LawArticle[], range: { from: number; to: number } | null): LawArticle[] {
  return range ? articles.filter((a) => a.number >= range.from && a.number <= range.to) : articles;
}

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 10_000_000;

function charsetOf(contentType: string | null, head: string): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? "")?.[1];
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  return (fromHeader ?? fromMeta ?? "windows-1252").toLowerCase();
}

/**
 * Baixa a lei de um site oficial (lista fechada de domínios) e devolve o texto normalizado.
 * Só aceita páginas HTML ou texto; o redirecionamento também precisa ficar nos sites oficiais.
 */
export async function fetchLawText(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!isLawUrl(url)) throw new Error("law_host");
  const res = await fetcher(url, { redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok || (res.url && !isLawUrl(res.url))) throw new Error("law_fetch");
  const type = res.headers.get("content-type");
  if (type && !/text\/(html|plain)|xhtml/i.test(type)) throw new Error("law_type");
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) throw new Error("law_size");
  const head = new TextDecoder("latin1").decode(buffer.slice(0, 2048));
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charsetOf(type, head));
  } catch {
    decoder = new TextDecoder("windows-1252");
  }
  const raw = decoder.decode(buffer);
  return normalizeLaw(type?.includes("text/plain") ? raw : htmlToText(raw));
}
