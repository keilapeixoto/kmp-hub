import test from "node:test";
import assert from "node:assert/strict";
import { trocaDeOrdem, proximaOrdem } from "../../lib/cases/etapas.ts";

const etapas = [
  { id: "a", ordem: 1 },
  { id: "b", ordem: 2 },
  { id: "c", ordem: 5 },
];

test("subir troca a ordem com a etapa de cima", () => {
  assert.deepEqual(trocaDeOrdem(etapas, "b", "subir"), [
    { id: "b", ordem: 1 },
    { id: "a", ordem: 2 },
  ]);
});

test("descer troca com a de baixo, mesmo com buracos na numeração", () => {
  assert.deepEqual(trocaDeOrdem(etapas, "b", "descer"), [
    { id: "b", ordem: 5 },
    { id: "c", ordem: 2 },
  ]);
});

test("a primeira não sobe e a última não desce", () => {
  assert.equal(trocaDeOrdem(etapas, "a", "subir"), null);
  assert.equal(trocaDeOrdem(etapas, "c", "descer"), null);
});

test("nova etapa entra depois da última", () => {
  assert.equal(proximaOrdem(etapas), 6);
  assert.equal(proximaOrdem([]), 1);
});
