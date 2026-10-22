// Baixa as questões do ENEM do projeto aberto API ENEM (enem.dev, dados em domínio público
// pelo art. 8º da Lei 9.610/98) e grava um arquivo por área em public/enem/.
// Uso: node scripts/enem-build.mjs
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://raw.githubusercontent.com/yunger7/enem-api/main/public";
const AREAS = ["linguagens", "ciencias-humanas", "ciencias-natureza", "matematica"];
const OUT = new URL("../public/enem/", import.meta.url);

async function get(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (attempt === 4) throw new Error(`${res.status} em ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function pool(items, size, fn) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

function alternative(a) {
  const parts = [];
  if (a.file) parts.push(`![Alternativa ${a.letter}](${a.file})`);
  if (a.text?.trim()) parts.push(a.text.trim());
  return parts.join("\n\n");
}

const exams = await get(`${BASE}/exams.json`);
const refs = [];
for (const exam of exams) {
  const details = await get(`${BASE}/${exam.year}/details.json`);
  for (const q of details.questions) {
    refs.push(`${exam.year}/questions/${q.language ? `${q.index}-${q.language}` : q.index}`);
  }
}

const raw = await pool(refs, 16, (ref) => get(`${BASE}/${ref}/details.json`));
const byArea = Object.fromEntries(AREAS.map((a) => [a, []]));
let skipped = 0;
const seen = new Set();
for (const q of raw) {
  const id = `${q.year}-${q.index}${q.language ? `-${q.language}` : ""}`;
  // O índice da fonte repete algumas questões.
  if (seen.has(id)) continue;
  seen.add(id);
  const alts = q.alternatives.map(alternative);
  const answer = q.alternatives.findIndex((a) => a.isCorrect);
  // Algumas questões vieram sem uma das alternativas: ficam de fora para não distorcer a prova.
  if (alts.length !== 5 || alts.some((a) => !a) || answer < 0 || !byArea[q.discipline]) {
    skipped++;
    continue;
  }
  byArea[q.discipline].push({
    id,
    year: q.year,
    number: q.index,
    language: q.language ?? null,
    context: (q.context ?? "").trim(),
    question: (q.alternativesIntroduction ?? "").trim(),
    options: alts,
    answer,
  });
}

await mkdir(OUT, { recursive: true });
for (const area of AREAS) {
  const list = byArea[area].sort((a, b) => b.year - a.year || a.number - b.number || a.id.localeCompare(b.id));
  await writeFile(new URL(`${area}.json`, OUT), JSON.stringify(list));
  console.log(`${area}: ${list.length} questões`);
}
console.log(`${skipped} questões incompletas ficaram de fora`);
