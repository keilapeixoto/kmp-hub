import test from "node:test";
import assert from "node:assert/strict";
import { planoDoAcesso } from "../../lib/clients/acesso-regra.ts";

const acesso = (email, outrosClientes = 0, id = "a1", userId = "u1") => ({ id, userId, email, outrosClientes });

test("sem acesso ao portal: nada muda", () => {
  assert.deepEqual(planoDoAcesso("novo@x.com", [], null), { resultado: "nada" });
});

test("e-mail apagado: tira o acesso", () => {
  assert.deepEqual(planoDoAcesso(null, [acesso("velho@x.com")], null), { resultado: "removido", remover: ["a1"] });
});

test("login só deste cliente e ninguém com o e-mail novo: troca o e-mail do login", () => {
  assert.deepEqual(planoDoAcesso("Novo@X.com", [acesso("velho@x.com")], null), {
    resultado: "renomeado",
    renomear: { userId: "u1", email: "novo@x.com" },
    remover: [],
  });
});

test("já existe conta com o e-mail novo: o acesso passa para ela", () => {
  assert.deepEqual(planoDoAcesso("novo@x.com", [acesso("velho@x.com")], { userId: "u2", ehEquipe: false }), {
    resultado: "movido",
    remover: ["a1"],
    vincular: "u2",
  });
});

test("e-mail novo é de alguém da equipe: não mexe", () => {
  assert.deepEqual(planoDoAcesso("equipe@x.com", [acesso("velho@x.com")], { userId: "u9", ehEquipe: true }), {
    resultado: "equipe",
  });
});

test("login usado por outros clientes: sai deste e pede convite", () => {
  assert.deepEqual(planoDoAcesso("novo@x.com", [acesso("mae@x.com", 2)], null), { resultado: "convidar", remover: ["a1"] });
});

test("já tem o login certo e um errado: tira só o errado", () => {
  const r = planoDoAcesso("certo@x.com", [acesso("certo@x.com"), acesso("outro@x.com", 0, "a2", "u2")], null);
  assert.deepEqual(r, { resultado: "removido", remover: ["a2"] });
});
