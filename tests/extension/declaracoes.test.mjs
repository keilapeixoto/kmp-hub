import test from "node:test";
import assert from "node:assert/strict";
import { pagina, pergunta, rodar, escolhido } from "./harness.mjs";

const ENTRADAS = [
  // [pág., rótulo no Hub, texto do ImmiAccount]
  [16, "Nos últimos 5 anos, morou ou ficou mais de 3 meses seguidos fora do país do passaporte (sem contar a Austrália)?", "In the last five years, has any applicant visited, or lived, outside their country of passport, for more than 3 consecutive months? Do not include time spent in Australia."],
  [17, "Já foi removido, deportado ou excluído de algum país (inclusive da Austrália)?", "Has any applicant ever been removed, deported or excluded from any country (including Australia)?"],
  [17, "Já serviu em força militar, polícia, milícia ou serviço de inteligência?", "Has any applicant ever served in a military force, police force, state sponsored / private militia or intelligence agency (including secret police)?"],
];

for (const [pg, rotuloHub, textoIm] of ENTRADAS) {
  test(`pág. ${pg}: "${rotuloHub.slice(0, 40)}…" — Não vira No`, async (t) => {
    const doc = await rodar(t, pagina(pg, pergunta("q", textoIm)), [{ label: rotuloHub, valor: "Não" }]);
    assert.equal(escolhido(doc, "q"), "No");
  });
  test(`pág. ${pg}: "${rotuloHub.slice(0, 40)}…" — Sim nunca é marcado`, async (t) => {
    const doc = await rodar(t, pagina(pg, pergunta("q", textoIm)), [{ label: rotuloHub, valor: "Sim" }]);
    assert.equal(escolhido(doc, "q"), null);
  });
}

test("pág. 9: estudo e visita a parentes — Sim e Não são marcados (fatos da viagem)", async (t) => {
  const html = pagina(
    9,
    pergunta("e", "Will the applicant undertake a course of study in Australia?") +
      pergunta("v", "Will the applicant visit any relatives, friends or contacts while in Australia?"),
  );
  const doc = await rodar(t, html, [
    { label: "Pretende fazer algum curso na Austrália?", valor: "Não" },
    { label: "Vai visitar parentes, amigos ou outros contatos na Austrália?", valor: "Sim" },
  ]);
  assert.equal(escolhido(doc, "e"), "No");
  assert.equal(escolhido(doc, "v"), "Yes");
});
