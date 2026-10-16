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

// Mesma estrutura de uma carta real de visto permanente (190), dados inventados.
const PERMANENTE = `
Dear Ana SOUZA
We have granted you a Skilled - Nominated (subclass 190) visa on 12 September 2026.
Visa status
Skilled - Nominated (subclass 190): Granted
Visa conditions and travel
Date of grant 12 September 2026
For first entry, arrive by 01 March 2027
Must not arrive after 12 September 2031
Length of stay Indefinite from the date of entry
Travel facility until 12 September 2031. For more information:
Visa holder
Name Ana Maria SOUZA
Date of birth 03 April 1995
Visa Skilled - Nominated (subclass 190)
Date of grant 12 September 2026
Visa grant number 1234567890123
Passport (or other travel
document) number
FX1234567
Passport (or other travel
document) country
BRAZIL
Transaction reference number EGO1234567
Check your visa details in VEVO.
`;

test("lerCartaDoVisto: carta real de visto permanente (formato do Home Affairs)", () => {
  const r = lerCartaDoVisto(PERMANENTE);
  assert.equal(r.tipo, "grant"); // cita VEVO no fim, mas é carta de concessão
  assert.equal(r.nome, "Ana Maria Souza");
  assert.equal(r.passaporte, "FX1234567");
  assert.equal(r.subclasse, "190");
  assert.equal(r.permanente, true);
  assert.equal(r.dataConcessao, "2026-09-12");
  assert.equal(r.dataVencimento, null); // visto permanente não vence
  assert.equal(r.viagemAte, "2031-09-12");
  assert.deepEqual(r.avisos, []);
});

// Estrutura de uma carta real de Bridging A ligada a um Partner 820, dados inventados.
const PONTE = `
Dear Ana SOUZA
We have given you a Bridging A visa associated with your Partner (subclass 820) application which is being processed.
Application status
Partner (subclass 820) application: Being processed
Student (Temporary) visa: In effect
Bridging A visa: Not in effect
Visa holder
Status Not in effect
Name Ana Maria SOUZA
Date of birth 03 April 1995
Comes into effect after Student (Temporary) visa ceases on 30 June 2027
Travel No Travel
Bridging visa conditions No conditions
Date of bridging visa grant 05 August 2026
Bridging visa grant number 1234567890123
Transaction reference number EGO1234567
`;

test("lerCartaDoVisto: bridging visa ligado a outra aplicação", () => {
  const r = lerCartaDoVisto(PONTE);
  assert.equal(r.tipo, "grant");
  assert.equal(r.ponte, "A");
  assert.equal(r.subclasse, "010"); // o visto concedido é o Bridging A, não o 820
  assert.equal(r.aplicacaoSubclasse, "820");
  assert.equal(r.nome, "Ana Maria Souza");
  assert.equal(r.dataConcessao, "2026-08-05");
  assert.equal(r.dataVencimento, null);
  assert.equal(r.permanente, false);
  assert.match(r.avisos.join(" "), /não tem data de vencimento/);
});

// Estrutura de uma carta real de visitante (600), dados inventados.
const VISITANTE = `
Dear Ana SOUZA
We have granted you a Visitor (subclass 600) visa on 10 October 2026.
Visa status
Visitor (subclass 600): Granted
Visa conditions
8101 - No work
8201 - 3 months study
Visa details and travel
Date of grant 10 October 2026
Must not arrive after 10 October 2027
Length of stay 3 month(s) from the date of each entry
Travel Multiple entries
Visa holder
Name Ana Maria SOUZA
Date of birth 03 April 1995
Visa Visitor (subclass 600)
Stream Tourist
Date of grant 10 October 2026
Visa grant number 1234567890123
Passport (or other travel
document) number
FX1234567
`;

test("lerCartaDoVisto: visitante usa 'Must not arrive after' como validade", () => {
  const r = lerCartaDoVisto(VISITANTE);
  assert.equal(r.subclasse, "600");
  assert.equal(r.stream, "Tourist");
  assert.equal(r.dataVencimento, null);
  assert.equal(r.entradaAte, "2027-10-10");
  assert.equal(r.validadeSugerida, "2027-10-10");
  assert.equal(r.passaporte, "FX1234567");
  assert.equal(r.avisos.length, 0);
});

test("lerCartaDoVisto: texto que não é carta de visto", () => {
  const r = lerCartaDoVisto("Fatura de energia elétrica\nTotal a pagar 120,00");
  assert.equal(r.tipo, null);
  assert.equal(r.subclasse, null);
  assert.ok(r.avisos.length > 0);
});
