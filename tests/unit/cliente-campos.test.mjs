import test from "node:test";
import assert from "node:assert/strict";
import { camposParaAtualizar } from "../../lib/clients/update-fields.ts";

const base = { nome: "Maria", email: null, idioma_preferencial: "pt", consultor_id: "u-outra" };

test("'Eu mesmo(a)' (valor vazio) vira o usuário logado — nunca vazio", () => {
  const r = camposParaAtualizar({ ...base, consultor_id: null }, { usuarioId: "u-keila", consultorNoFormulario: true });
  assert.equal(r.consultor_id, "u-keila");
});

test("consultor escolhido na lista é mantido", () => {
  const r = camposParaAtualizar(base, { usuarioId: "u-keila", consultorNoFormulario: true });
  assert.equal(r.consultor_id, "u-outra");
});

test("campo de consultor travado (não enviado) não é alterado", () => {
  const r = camposParaAtualizar({ ...base, consultor_id: null }, { usuarioId: "u-keila", consultorNoFormulario: false });
  assert.equal("consultor_id" in r, false);
});

test("idioma vazio mantém o atual (é obrigatório no banco)", () => {
  const r = camposParaAtualizar({ ...base, idioma_preferencial: null }, { usuarioId: "u", consultorNoFormulario: true });
  assert.equal("idioma_preferencial" in r, false);
});

test("campo opcional apagado vira nulo (o cliente pode limpar um dado)", () => {
  const r = camposParaAtualizar(base, { usuarioId: "u", consultorNoFormulario: true });
  assert.equal(r.email, null);
});
