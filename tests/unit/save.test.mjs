import test from "node:test";
import assert from "node:assert/strict";
import { linhasDeFormData, salvarRespostasEmBlocos } from "../../lib/case-forms/save.ts";

test("campo apagado vira valor nulo (não mantém o antigo)", () => {
  const fd = new FormData();
  fd.set("a", "  Maria  ");
  fd.set("b", "   ");
  const linhas = linhasDeFormData("cf1", [{ id: "a" }, { id: "b" }, { id: "c" }], fd);
  assert.deepEqual(linhas, [
    { case_form_id: "cf1", field_id: "a", valor: "Maria" },
    { case_form_id: "cf1", field_id: "b", valor: null },
    { case_form_id: "cf1", field_id: "c", valor: null },
  ]);
});

function falso(falhasPorChamada) {
  let chamada = 0;
  return {
    chamadas: () => chamada,
    from: () => ({
      upsert: async () => {
        const erro = falhasPorChamada[chamada++] ?? null;
        return { error: erro };
      },
    }),
  };
}
const linhas = (n) => Array.from({ length: n }, (_, i) => ({ case_form_id: "x", field_id: `f${i}`, valor: "v" }));

test("grava em blocos de 8", async () => {
  const sb = falso([]);
  const r = await salvarRespostasEmBlocos(sb, linhas(20));
  assert.deepEqual([r.gravados, r.total, r.erro], [20, 20, null]);
  assert.equal(sb.chamadas(), 3);
});

test("um bloco que falha uma vez é repetido e passa", async () => {
  const sb = falso([{ code: "57014", message: "timeout" }]);
  const r = await salvarRespostasEmBlocos(sb, linhas(8));
  assert.equal(r.erro, null);
  assert.equal(sb.chamadas(), 2);
});

test("falha no 2º bloco: informa quantos foram gravados e para", async () => {
  const sb = falso([null, { code: "57014", message: "t" }, { code: "57014", message: "t" }]);
  const r = await salvarRespostasEmBlocos(sb, linhas(20));
  assert.equal(r.gravados, 8);
  assert.equal(r.total, 20);
  assert.equal(r.erro.code, "57014");
});
