import test from "node:test";
import assert from "node:assert/strict";
import { camposPendentes } from "../../lib/case-forms/validate.ts";

const etapas = [
  { titulo: "Dados Pessoais", fields: [
    { id: "a", label: "Nome", obrigatorio: true },
    { id: "b", label: "Outros nomes", obrigatorio: false },
  ] },
  { titulo: "Passaporte", fields: [{ id: "c", label: "Número", obrigatorio: true }] },
];

test("lista obrigatórios vazios com etapa (1-based) e rótulo", () => {
  const r = camposPendentes(etapas, { a: "Maria" });
  assert.deepEqual(r, [{ etapa: 2, titulo: "Passaporte", fieldId: "c", label: "Número" }]);
});

test("só espaços conta como vazio; opcional vazio não conta", () => {
  const r = camposPendentes(etapas, { a: "   ", c: "FU1" });
  assert.deepEqual(r.map((p) => p.fieldId), ["a"]);
});

test("tudo preenchido: nenhuma pendência", () => {
  assert.deepEqual(camposPendentes(etapas, { a: "x", c: "y" }), []);
});
