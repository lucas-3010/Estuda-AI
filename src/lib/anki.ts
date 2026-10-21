// Importação e exportação no formato de texto do Anki ("Notas em texto simples").
// O .apkg é um banco SQLite compactado; texto é o formato que o Anki importa e exporta sem plugins.

export type PlainCard = { front: string; back: string };

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** HTML do Anki para texto: quebras viram linhas, tags somem, entidades são decodificadas. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Markdown simples do Estuda-AI para HTML que o Anki mostra bem. */
export function textToAnkiHtml(text: string): string {
  return escapeHtml(text)
    .replace(/```\w*\n([\s\S]*?)```/g, (_, code: string) => `<pre>${code.replace(/\n/g, "<br>")}</pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, "<br>");
}

export function exportToAnki(cards: (PlainCard & { deck: string })[]): string {
  const header = ["#separator:tab", "#html:true", "#notetype:Basic", "#deck column:3"];
  const deckName = (deck: string) => `Estuda-AI::${deck.replace(/[\t\r\n]+/g, " ").replace(/::/g, ":")}`;
  const lines = cards.map((c) => [textToAnkiHtml(c.front), textToAnkiHtml(c.back), deckName(c.deck)].join("\t"));
  return [...header, ...lines].join("\n") + "\n";
}

function detectSeparator(headerValue: string | undefined, sample: string): string {
  const named: Record<string, string> = { tab: "\t", comma: ",", semicolon: ";", pipe: "|", space: " " };
  if (headerValue) return named[headerValue.toLowerCase()] ?? headerValue;
  if (sample.includes("\t")) return "\t";
  if (sample.includes(";")) return ";";
  return ",";
}

/** Separa campos respeitando aspas, inclusive campos com quebra de linha. */
function splitRecords(text: string, sep: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === sep) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/** Lê um arquivo de texto exportado do Anki (ou um CSV de duas colunas: frente e verso). */
export function parseAnkiText(raw: string): PlainCard[] {
  const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
  const headers: Record<string, string> = {};
  let start = 0;
  while (start < lines.length && lines[start].startsWith("#")) {
    const [key, ...value] = lines[start].slice(1).split(":");
    headers[key.trim().toLowerCase()] = value.join(":").trim();
    start++;
  }
  const body = lines.slice(start).join("\n");
  const sep = detectSeparator(headers.separator, body.slice(0, 2000));
  const html = headers.html !== "false";

  return splitRecords(body, sep)
    .filter((r) => r.length >= 2)
    .map(([front, back]) => ({
      front: html ? htmlToText(front) : front.trim(),
      back: html ? htmlToText(back) : back.trim(),
    }))
    .filter((c) => c.front && c.back);
}
