import test from "node:test";
import assert from "node:assert/strict";
import { mapRecordTo600 } from "../../lib/record-of-responses/map-600.ts";

// Texto sintético no formato do "Record of Responses" (sem dado real).
const TEXTO = `
Application context
Current location
Is the applicant currently outside Australia?
Yes
Give the current location of the applicant and their legal status at this location.
Current location: BRAZIL
Legal status: Citizen
National identity card
Does this applicant have a national identity card?
No
Other names / spellings
Is this applicant currently, or have they ever been known by any other names?
Yes
Citizenship
Is this applicant a citizen of the selected country of passport (BRAZIL)?
Yes
Is this applicant a citizen of any other country?
No
Grant number
Does this applicant have an Australian visa grant number?
Yes
Australian visa grant number (if known): 0123456789012
`;

test("traz situação legal, outros nomes, cidadania, RG nacional e número do visto", () => {
  const { campos } = mapRecordTo600(TEXTO);
  assert.equal(campos["Qual é a sua situação legal no país onde mora?"], "Cidadão");
  assert.equal(campos["Já usou ou usa outros nomes (nome de solteira, apelido legal)?"], "Sim");
  assert.equal(campos["É cidadão do país do passaporte?"], "Sim");
  assert.equal(campos["Possui carteira de identidade nacional (RG)?"], "Não");
  assert.equal(campos["Número do visto australiano anterior (se tiver)"], "0123456789012");
});

test("não importa declarações de saúde nem de caráter", () => {
  const { campos } = mapRecordTo600(
    `${TEXTO}\nCharacter declarations\nHas any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?\nNo`,
  );
  assert.equal(campos["Já foi condenado por crime em qualquer país?"], undefined);
});
