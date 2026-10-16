import test from "node:test";
import assert from "node:assert/strict";
import { colunasPadrao, destaqueDoVencimento, etapaDoVisto } from "../../lib/cases/pipeline-padrao.ts";

const etapas = [
  { id: "a1", nome: "Análise de documentos", ordem: 1, service_type_id: "A" },
  { id: "a2", nome: "Lodgement do visto", ordem: 2, service_type_id: "A" },
  { id: "a3", nome: "Visto aprovado", ordem: 3, service_type_id: "A" },
  { id: "b1", nome: "Análise de documentos", ordem: 1, service_type_id: "B" },
  { id: "b2", nome: "GTE", ordem: 2, service_type_id: "B" },
  { id: "b3", nome: "Lodgement do visto", ordem: 3, service_type_id: "B" },
  { id: "b4", nome: "Visto aprovado", ordem: 4, service_type_id: "B" },
];

test("colunas na ordem média, etapa de um visto só no meio", () => {
  assert.deepEqual(colunasPadrao(etapas), ["Análise de documentos", "GTE", "Lodgement do visto", "Visto aprovado"]);
});

test("arrastar acha a etapa do mesmo nome no visto do processo", () => {
  assert.equal(etapaDoVisto(etapas, "B", "Lodgement do visto"), "b3");
  assert.equal(etapaDoVisto(etapas, "A", "GTE"), null);
});

test("vencimento em destaque com cores", () => {
  assert.deepEqual(destaqueDoVencimento("2026-10-10", "2026-10-17"), { cor: "vermelho", texto: "venceu há 7d", data: "10/10/2026" });
  assert.equal(destaqueDoVencimento("2026-11-01", "2026-10-17").cor, "laranja");
  assert.equal(destaqueDoVencimento("2026-12-31", "2026-10-17").cor, "amarelo");
  assert.equal(destaqueDoVencimento("2027-06-01", "2026-10-17").cor, "verde");
  assert.equal(destaqueDoVencimento(null, "2026-10-17"), null);
});
