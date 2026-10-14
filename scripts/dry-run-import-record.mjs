// KMP Hub · Simula a importação de um "Record of Responses" (PDF do ImmiAccount)
// para o formulário do visto 600, SEM gravar nada. Mostra quais campos do Hub
// seriam preenchidos, com os valores mascarados (só o tamanho), exceto os que
// não identificam ninguém (listas, Sim/Não, países).
//
// Uso: node scripts/dry-run-import-record.mjs "/caminho/Application.pdf"

import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { mapRecordTo600 } from "../lib/record-of-responses/map-600.ts";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node scripts/dry-run-import-record.mjs "/caminho/Application.pdf"');
  process.exit(1);
}

const pdf = await getDocumentProxy(new Uint8Array(readFileSync(arquivo)));
const { text } = await extractText(pdf, { mergePages: false });
const { campos, avisos } = mapRecordTo600(text.join("\n"));

const MOSTRAR = new Set([
  "Gênero",
  "Estado civil",
  "País de emissão",
  "Nacionalidade conforme passaporte",
  "Nacionalidade atual",
  "País de nascimento",
  "País",
  "Estado",
  "Motivo da viagem à Austrália",
  "Tempo de permanência pretendido",
  "Situação profissional atual",
  "Quem custeará sua viagem?",
  "Pretende entrar na Austrália mais de uma vez durante a estadia?",
  "Alguém está te acompanhando nesta viagem?",
  "Possui, ou já possuiu, outra nacionalidade ou cidadania?",
  "Possui, ou já possuiu, outro passaporte?",
  "Já visitou a Austrália antes?",
  "Já solicitou visto para a Austrália antes?",
]);

const nomes = Object.keys(campos);
console.log(`\n${nomes.length} campos do Hub seriam preenchidos:\n`);
for (const k of nomes) {
  const v = campos[k];
  console.log(`  ${k}: ${MOSTRAR.has(k) ? v : `#### (${v.length} car.)`}`);
}
if (avisos.length) {
  console.log("\nAvisos:");
  for (const a of avisos) console.log("  - " + a);
}
