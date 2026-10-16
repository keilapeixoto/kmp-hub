// KMP Hub · Estrutura de uma carta de visto (grant notice ou VEVO), SEM dados.
// Serve para ajustar a leitura (lib/carta-visto/parse.ts) a cartas com
// rótulos diferentes. Mantém só palavras de rótulo em inglês de uma lista fixa
// e troca todo o resto (nomes, números, datas, endereços) por ▒. Também diz
// quais campos a leitura achou, sem mostrar os valores.
//
// Uso: node scripts/carta-visto-estrutura.mjs "/caminho/carta.pdf"

import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { lerCartaDoVisto } from "../lib/carta-visto/parse.ts";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node scripts/carta-visto-estrutura.mjs "/caminho/carta.pdf"');
  process.exit(1);
}

// Palavras que podem aparecer (rótulos); qualquer outra vira ▒.
const ROTULOS = new Set(
  `australian government department of home affairs visa grant notice notification letter confirms the a an and or of
  to for in on at by with your you this that is are be has have been was were not no yes must after before until
  holder holders details applicant applicants primary secondary family name names given other date dates birth sex
  gender passport passports document documents number numbers country countries citizenship nationality travel
  class subclass stream type status effect in-effect entries entry multiple single period stay length leave arrive
  expiry expires ceases cease end start commencement location onshore offshore conditions condition work study
  limitation limitations mandatory reference transaction trn grant-number grants granted valid validity visa-holder
  vevo verification online entitlement enquiry enquiries result results check checked time generated page months
  years days year month day student visitor tourist employer sponsored skilled independent nominated regional
  graduate temporary permanent partner bridging working holiday higher education sector post work rights
  dear regards important information about further contact us`.split(/\s+/),
);

const pdf = await getDocumentProxy(new Uint8Array(readFileSync(arquivo)));
const { text } = await extractText(pdf, { mergePages: false });
const todo = text.join("\n");

console.log("=== Estrutura (▒ = dado escondido) ===");
for (const linha of todo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
  const mascarada = linha
    .split(/(\s+|[/:(),.-])/)
    .map((p) => (/^\s*$|^[/:(),.-]$/.test(p) ? p : ROTULOS.has(p.toLowerCase()) ? p : "▒"))
    .join("")
    .replace(/▒(\s*▒)+/g, "▒");
  console.log(mascarada);
}

const r = lerCartaDoVisto(todo);
const achou = (v) => (v ? "achou" : "NÃO achou");
console.log("\n=== O que a leitura achou (sem mostrar valores) ===");
console.log({
  tipo: r.tipo ?? "não reconhecido",
  nome: achou(r.nome),
  dataNascimento: achou(r.dataNascimento),
  passaporte: achou(r.passaporte),
  subclasse: r.subclasse ?? "NÃO achou", // subclasse não identifica ninguém
  stream: achou(r.stream),
  dataConcessao: achou(r.dataConcessao),
  dataVencimento: achou(r.dataVencimento),
  permanenciaAte: achou(r.permanenciaAte),
  permanente: r.permanente,
  viagemAte: achou(r.viagemAte),
  entradaAte: achou(r.entradaAte),
  validadeSugerida: achou(r.validadeSugerida),
  ponte: r.ponte ?? "não",
  aplicacaoSubclasse: r.aplicacaoSubclasse ?? "—",
  avisos: r.avisos,
});
