import { describe, expect, test } from "vitest";
import { exportToAnki, htmlToText, parseAnkiText } from "@/lib/anki";

describe("Anki", () => {
  test("exporta em texto com cabeçalho, HTML e baralho", () => {
    const out = exportToAnki([{ front: "O que é `SELECT`?", back: "Linha 1\nLinha 2", deck: "SQL" }]);
    expect(out).toContain("#separator:tab\n#html:true");
    expect(out).toContain("O que é <code>SELECT</code>?\tLinha 1<br>Linha 2\tEstuda-AI::SQL");
  });

  test("importa o texto exportado pelo Anki", () => {
    const raw = "#separator:tab\n#html:true\nCapital da França?\tParis<br>(França)\nO que é <b>DNA</b>?\tÁcido desoxirribonucleico\n";
    expect(parseAnkiText(raw)).toEqual([
      { front: "Capital da França?", back: "Paris\n(França)" },
      { front: "O que é DNA?", back: "Ácido desoxirribonucleico" },
    ]);
  });

  test("importa CSV com aspas e quebra de linha dentro do campo", () => {
    const raw = 'frente;verso\n"Pergunta; com ponto e vírgula";"Resposta\nem duas linhas"\n';
    expect(parseAnkiText(raw)).toEqual([
      { front: "frente", back: "verso" },
      { front: "Pergunta; com ponto e vírgula", back: "Resposta\nem duas linhas" },
    ]);
  });

  test("ida e volta preserva o conteúdo", () => {
    const cards = [{ front: "A < B & C?", back: "Sim\nNão", deck: "X" }];
    expect(parseAnkiText(exportToAnki(cards))).toEqual([{ front: "A < B & C?", back: "Sim\nNão" }]);
  });

  test("htmlToText remove tags e decodifica entidades", () => {
    expect(htmlToText("<div>a&nbsp;&amp;&nbsp;b</div><div>c</div>")).toBe("a & b\nc");
  });
});
