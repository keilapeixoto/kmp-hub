import test from "node:test";
import assert from "node:assert/strict";
import {
  pagina, campoTexto, campoLista, pergunta, rodar, texto, escolhido, opcaoLista,
} from "./harness.mjs";

test("pág. 2: país atual, situação legal, motivo, stream e governo", async (t) => {
  const html = pagina(
    2,
    campoLista("loc", "Current location", ["BRAZIL", "PORTUGAL"]) +
      campoLista("leg", "Legal status", ["Citizen", "Visitor", "Other"]) +
      campoLista("mot", "Select an option", ["Business", "Tourism", "Family visit", "Other"]) +
      pergunta("str", "Select the stream the applicant is applying for:", [
        "Business Visitor stream (business visit)",
        "Tourist stream (tourism/visit family or friends)",
      ]) +
      pergunta("gov", "Is the applicant travelling as a representative of a foreign government, travelling on a United Nations Laissez-Passer or a member of an exempt group?"),
  );
  const doc = await rodar(t, html, [
    { label: "País", valor: "Brasil" },
    { label: "Qual é a sua situação legal no país onde mora?", valor: "Cidadão" },
    { label: "Motivo da viagem à Austrália", valor: "Visitar família/amigos" },
  ]);
  assert.equal(opcaoLista(doc, "loc"), "BRAZIL");
  assert.equal(opcaoLista(doc, "leg"), "Citizen");
  assert.equal(opcaoLista(doc, "mot"), "Family visit");
  assert.match(escolhido(doc, "str"), /^Tourist stream/);
  assert.equal(escolhido(doc, "gov"), "No");
});

test("pág. 2: texto longo das datas importantes (rótulo com ou sem dois-pontos)", async (t) => {
  const html = pagina(
    2,
    `<label class="wc-label" for="dt">Give details of any significant dates on which the applicant needs to be in Australia:</label><textarea id="dt"></textarea>`,
  );
  const doc = await rodar(t, html, [
    { label: "Há datas importantes em que você precisa estar na Austrália? (evento, casamento, formatura...)", valor: "Formatura em 12/03" },
  ]);
  assert.equal(doc.getElementById("dt").value, "Formatura em 12/03");
});

const VIAJOU = "Has this applicant previously travelled to Australia?";
const PEDIU = "Has this applicant previously applied for a visa to Australia?";
const OUTRO_PASS = "Does this applicant have any other passports or documents for travel?";
const PACIFICO = "Is the applicant a Pacific-Australia Card holder?";
const CIDADAO_PASS = "Is this applicant a citizen of the selected country of passport (BRAZIL)?";
const CIDADAO_OUTRO = "Is this applicant a citizen of any other country?";

test("pág. 3: viagem anterior, pedido anterior, outro passaporte e Pacific card", async (t) => {
  const html = pagina(
    3,
    pergunta("v", VIAJOU) + pergunta("p", PEDIU) + pergunta("o", OUTRO_PASS) + pergunta("c", PACIFICO),
  );
  const doc = await rodar(t, html, [
    { label: "Já visitou a Austrália antes?", valor: "Sim" },
    { label: "Já solicitou visto para a Austrália antes?", valor: "Não" },
    { label: "Possui, ou já possuiu, outro passaporte?", valor: "Não" },
  ]);
  assert.equal(escolhido(doc, "v"), "Yes");
  assert.equal(escolhido(doc, "p"), "No");
  assert.equal(escolhido(doc, "o"), "No");
  assert.equal(escolhido(doc, "c"), "No");
});

test("pág. 3: outro passaporte — Sim não é marcado (só No)", async (t) => {
  const doc = await rodar(t, pagina(3, pergunta("o", OUTRO_PASS)), [
    { label: "Possui, ou já possuiu, outro passaporte?", valor: "Sim" },
  ]);
  assert.equal(escolhido(doc, "o"), null);
});

test("pág. 3: perguntas de cidadania com começo parecido não se confundem", async (t) => {
  const html = pagina(3, pergunta("cp", CIDADAO_PASS) + pergunta("co", CIDADAO_OUTRO));
  const doc = await rodar(t, html, [
    { label: "É cidadão do país do passaporte?", valor: "Sim" },
    { label: "Possui, ou já possuiu, outra nacionalidade ou cidadania?", valor: "Não" },
  ]);
  assert.equal(escolhido(doc, "cp"), "Yes");
  assert.equal(escolhido(doc, "co"), "No");
});

test("pág. 3: número do visto australiano — marca Yes só se o cliente informou", async (t) => {
  const html = pagina(
    3,
    pergunta("g", "Does this applicant have an Australian visa grant number?") +
      campoTexto("gn", "Australian visa grant number (if known)", 13),
  );
  const com = await rodar(t, html, [
    { label: "Número do visto australiano anterior (se tiver)", valor: "0123456789012" },
  ]);
  assert.equal(escolhido(com, "g"), "Yes");
  assert.equal(texto(com, "gn"), "0123456789012");

  const sem = await rodar(t, html, []);
  assert.equal(escolhido(sem, "g"), null);
});
