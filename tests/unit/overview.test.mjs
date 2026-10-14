import test from "node:test";
import assert from "node:assert/strict";
import { contarFormularios } from "../../lib/case-forms/overview.ts";

const comModelo = { case_form_template_id: "t1" };

test("conta aguardando (sem formulário ou em preenchimento) e enviados", () => {
  const r = contarFormularios([
    { service_types: comModelo, case_forms: [] },
    { service_types: comModelo, case_forms: [{ status: "em_preenchimento" }] },
    { service_types: comModelo, case_forms: [{ status: "enviado" }] },
    { service_types: comModelo, case_forms: [{ status: "aprovado" }] },
  ]);
  assert.deepEqual(r, { aguardando: 2, enviados: 1 });
});

test("processo de tipo sem formulário não conta", () => {
  assert.deepEqual(
    contarFormularios([
      { service_types: { case_form_template_id: null }, case_forms: [] },
      { service_types: null, case_forms: [] },
    ]),
    { aguardando: 0, enviados: 0 },
  );
});
