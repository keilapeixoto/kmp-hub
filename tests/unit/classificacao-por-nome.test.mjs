import test from "node:test";
import assert from "node:assert/strict";
import { classificarPeloNome, rotuloParaNome } from "../../lib/documents/classificacao-por-nome.ts";

// Itens do checklist do visto 600.
const ITENS = [
  "Passaporte (página de dados)",
  "Comprovante de renda ou holerite",
  "Extrato bancário dos últimos 3 meses",
  "Comprovante de vínculo (trabalho ou estudo)",
  "Comprovante de endereço",
  "Certidão de casamento",
  "Certidão de divórcio",
  "Comprovação de abertura da empresa",
  "Passaporte e visto de quem convida na Austrália",
  "Itinerário de viagem",
].map((nome, i) => ({ id: `i${i}`, nome }));
const item = (nome) => ITENS.find((i) => i.nome === nome).id;

test("passaporte vai para a página de dados, não para o passaporte de quem convida", () => {
  const r = classificarPeloNome("Passaporte Marildes.pdf", ITENS);
  assert.equal(r.checklistItemId, item("Passaporte (página de dados)"));
  assert.equal(r.documentType, "passaporte");
});

test("extrato, holerite, conta de luz e certidões", () => {
  assert.equal(classificarPeloNome("extrato_setembro_2026.pdf", ITENS).checklistItemId, item("Extrato bancário dos últimos 3 meses"));
  assert.equal(classificarPeloNome("holerite agosto.jpg", ITENS).checklistItemId, item("Comprovante de renda ou holerite"));
  assert.equal(classificarPeloNome("conta de luz.pdf", ITENS).checklistItemId, item("Comprovante de endereço"));
  assert.equal(classificarPeloNome("Certidao Casamento.pdf", ITENS).checklistItemId, item("Certidão de casamento"));
  assert.equal(classificarPeloNome("averbação divórcio.pdf", ITENS).checklistItemId, item("Certidão de divórcio"));
  assert.equal(classificarPeloNome("passaporte filha + carta convite.pdf", ITENS).checklistItemId, item("Passaporte e visto de quem convida na Austrália"));
});

test("nome sem informação não chuta", () => {
  assert.equal(classificarPeloNome("IMG_1234.jpg", ITENS), null);
  assert.equal(classificarPeloNome("WhatsApp Image 2026-10-14.jpeg", ITENS), null);
  assert.equal(classificarPeloNome("comprovante.pdf", ITENS), null);
});

test("tipo geral sem item do checklist", () => {
  const r = classificarPeloNome("IELTS result.pdf", ITENS);
  assert.equal(r.checklistItemId, null);
  assert.equal(r.documentType, "comprovante_ingles");
});

test("rótulo do item vira parte do nome do arquivo", () => {
  assert.equal(rotuloParaNome("Comprovante de endereço"), "comprovante_de_endereco");
});
