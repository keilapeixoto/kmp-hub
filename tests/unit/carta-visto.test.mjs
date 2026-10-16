import test from "node:test";
import assert from "node:assert/strict";
import { lerCartaDoVisto, dataIso } from "../../lib/carta-visto/parse.ts";

// Textos sintéticos (nenhum dado real), no formato das cartas do Home Affairs.

const GRANT = `
Australian Government
Department of Home Affairs
Visa grant notice
Dear Ana Maria SOUZA
This letter confirms the grant of a visa.
Visa holder details
Family name SOUZA
Given names Ana Maria
Date of birth 03 April 1995
Passport number FX1234567
Country of passport BRAZIL
Visa grant details
Visa Student (class TU) subclass 500
Stream Higher Education Sector
Visa grant number 1234567890123
Date of grant 12 September 2026
Visa expiry date 15 March 2029
Transaction Reference Number (TRN) EGO1234567
`;

const VEVO = `
Visa Entitlement Verification Online (VEVO)
Family name SILVA
Given names JOAO PEDRO
Date of birth 21/07/1990
Document number YB7654321
Visa class / subclass TU / 485
Visa stream Post-Higher Education Work
Visa applicant Primary
Visa grant date 01 Feb 2025
Visa expiry date 01 Feb 2027
Visa status In effect
`;

test("dataIso: formatos por extenso, abreviado e com barras", () => {
  assert.equal(dataIso("15 March 2029"), "2029-03-15");
  assert.equal(dataIso("01 Feb 2025"), "2025-02-01");
  assert.equal(dataIso("21/07/1990"), "1990-07-21");
  assert.equal(dataIso("3 April 1995"), "1995-04-03");
  assert.equal(dataIso("sem data"), null);
});

test("lerCartaDoVisto: grant notice", () => {
  const r = lerCartaDoVisto(GRANT);
  assert.equal(r.tipo, "grant");
  assert.equal(r.nome, "Ana Maria Souza");
  assert.equal(r.dataNascimento, "1995-04-03");
  assert.equal(r.passaporte, "FX1234567");
  assert.equal(r.subclasse, "500");
  assert.equal(r.stream, "Higher Education Sector");
  assert.equal(r.dataConcessao, "2026-09-12");
  assert.equal(r.dataVencimento, "2029-03-15");
});

test("lerCartaDoVisto: VEVO", () => {
  const r = lerCartaDoVisto(VEVO);
  assert.equal(r.tipo, "vevo");
  assert.equal(r.nome, "Joao Pedro Silva");
  assert.equal(r.subclasse, "485");
  assert.equal(r.passaporte, "YB7654321");
  assert.equal(r.dataConcessao, "2025-02-01");
  assert.equal(r.dataVencimento, "2027-02-01");
});

test("lerCartaDoVisto: 'must not arrive after' não é vencimento; 'stay until' é", () => {
  const r = lerCartaDoVisto(`Visa grant notice
Family name LEE
Given names Kim
Visa Visitor (class FA) subclass 600
Date of grant 10 October 2026
Must not arrive after 10 October 2027
Length of stay 3 months, stay until 10 January 2027`);
  assert.equal(r.subclasse, "600");
  assert.equal(r.dataVencimento, null);
  assert.equal(r.permanenciaAte, "2027-01-10");
});

test("lerCartaDoVisto: texto que não é carta de visto", () => {
  const r = lerCartaDoVisto("Fatura de energia elétrica\nTotal a pagar 120,00");
  assert.equal(r.tipo, null);
  assert.equal(r.subclasse, null);
  assert.ok(r.avisos.length > 0);
});
