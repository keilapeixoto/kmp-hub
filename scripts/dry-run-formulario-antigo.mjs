// KMP Hub · Simula a importação do e-mail do formulário antigo (visto 600),
// sem gravar nada e sem mostrar dados do cliente: lista os campos do Hub que
// seriam preenchidos, com o tamanho do valor; só as respostas de opção
// (Sim/Não, estado civil, motivo da viagem...) aparecem por extenso.
//
// Uso: node scripts/dry-run-formulario-antigo.mjs "/caminho/e-mail.pdf"

import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { ehEmailDoFormularioAntigo, mapEmailTo600 } from "../lib/formulario-antigo/parse.ts";

const OPCAO = /^(Sim|Não|Masculino|Feminino|Outro|Solteiro\(a\)|Casado\(a\)|Divorciado\(a\)|Viúvo\(a\)|Separado\(a\)|União Estável|Noivo\(a\)|Ensino .+|Pós-Graduação|Turismo|Visitar família\/amigos|Negócios|Estudo .+|Tratamento médico|Até 2 semanas|\d a \d+ (semanas|meses)|Empregado\(a\)|Autônomo\(a\)|Empresário\(a\)|Aposentado\(a\)|Estudante|Do lar|Desempregado\(a\)|Eu mesmo\(a\)|Cônjuge\/parceiro\(a\)|Pais|Empresa|Patrocinador na Austrália|Até R\$ 3\.000|R\$ [\d.]+ a R\$ [\d.]+|Acima de R\$ 20\.000)$/;

const arquivo = process.argv[2];
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(arquivo)));
const texto = (await extractText(pdf, { mergePages: false })).text.join("\n");
console.log("É o e-mail do formulário antigo?", ehEmailDoFormularioAntigo(texto));
const { campos, avisos } = mapEmailTo600(texto);
for (const [rotulo, valor] of Object.entries(campos)) {
  console.log(`${rotulo}: ${OPCAO.test(valor) ? valor : `[${valor.length} caracteres]`}`);
}
console.log(`\n${Object.keys(campos).length} campos`);
console.log("Avisos:", avisos);
