import test from "node:test";
import assert from "node:assert/strict";
import { pagina, campoTexto, campoData, pergunta, rodar, texto, escolhido } from "./harness.mjs";

test("datas saem com o mês em letras (o ImmiAccount recusa dd/mm/aaaa)", async (t) => {
  const doc = await rodar(t, pagina(3, campoData("dn", "Date of birth")), [
    { label: "Data de nascimento", valor: "1970-07-13" },
  ]);
  assert.equal(texto(doc, "dn"), "13 Jul 1970");
});

test("telefone vai só com dígitos e sem o +55", async (t) => {
  const doc = await rodar(t, pagina(6, campoTexto("cel", "Mobile / Cell phone", 20)), [
    { label: "Celular", valor: "+55 11 95808-0252" },
  ]);
  assert.equal(texto(doc, "cel"), "11958080252");
});

test("campo de outra página não é preenchido", async (t) => {
  const doc = await rodar(t, pagina(8, campoData("dn", "Date of birth")), [
    { label: "Data de nascimento", valor: "1970-07-13" },
  ]);
  assert.equal(texto(doc, "dn"), "");
});

const CONDENADO =
  "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?";

test("declaração adversa: marca No quando o cliente respondeu Não", async (t) => {
  const doc = await rodar(t, pagina(17, pergunta("q", CONDENADO)), [
    { label: "Já foi condenado por crime em qualquer país?", valor: "Não" },
  ]);
  assert.equal(escolhido(doc, "q"), "No");
});

test("declaração adversa: nunca marca Yes", async (t) => {
  const doc = await rodar(t, pagina(17, pergunta("q", CONDENADO)), [
    { label: "Já foi condenado por crime em qualquer país?", valor: "Sim" },
  ]);
  assert.equal(escolhido(doc, "q"), null);
});
