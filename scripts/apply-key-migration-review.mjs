// Aplica, de uma vez, a revisão manual feita com a Keila sobre as pastas
// pendentes geradas pelo sync-key-migration.mjs em 13/out/2026: promove
// pasta nova pra import/key-migration-map.csv (aprovada — entra no fluxo
// automático dali pra frente), descartando material de equipe/template e
// corrigindo pasta de documento que o scan confundiu com cliente novo
// (ex.: "BVB"/"REQUEST" dentro da pasta do Andre Pucci não são clientes,
// são documentos dele — juntam no cliente certo em vez de criar cliente
// com nome de pasta).
//
// Rodar uma vez só, depois de revisar import/key-migration-pendentes.csv
// com a Keila. Idempotente: pode rodar de novo sem duplicar linha no
// map.csv (verifica por caminho antes de adicionar).
//
// Uso: node scripts/apply-key-migration-review.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PENDING_CSV = "import/key-migration-pendentes.csv";
const APPROVED_CSV = "import/key-migration-map.csv";

// Pastas de material de equipe/template/duplicata — nunca viram cliente.
const SKIP_PATHS = new Set([
  "REQUEST - SKILL ASSESSMENT ",
  "TALENT VISA",
  "LOVE STORY PPT",
  "ACEQCA",
  "485 PROCESS",
  "482 SUBSEQUENT/LETTERS",
  "186 APPLICATION/ROCHELE 186",
  "PROCESSOS TO LEARN/MELISSA PROCESS (GERMAN)",
  "PROCESSOS TO LEARN/PARTNER VISA/CARINA FARIA",
  "PROCESSOS TO LEARN/PARTNER VISA/DAHI",
  "PROCESSOS TO LEARN/PARTNER VISA/DANILO (VISA)",
  "PROCESSOS TO LEARN/TALENT VISA",
  "485 APPLICATION/APLICADOS/408 VISA",
  "485 APPLICATION/APLICADOS/485 VISA - 2025 - DIEGO BOEHM 2",
  "408 APPLICATION/IANE SILVA DA CRUZ/PEDRO NERY",
]);

// Pasta de documento de um cliente que o scan confundiu com cliente novo
// (nome da subpasta era tipo de documento, não pessoa) — junta no cliente
// certo em vez de criar cliente com o nome errado.
const MERGE_INTO = new Map([
  ["190 APPLICATION/ANDRE PUCCI/ANDRE PUCCI 190", "Andre Pucci"],
  ["190 APPLICATION/ANDRE PUCCI/BVB ", "Andre Pucci"],
  ["190 APPLICATION/ANDRE PUCCI/REQUEST ", "Andre Pucci"],
  ["190 APPLICATION/ANDRE PUCCI/REQUEST ANDRE PUCCI", "Andre Pucci"],
  ["190 APPLICATION/ANDRE PUCCI/VIAGENS E ENDEREÇO", "Andre Pucci"],
  ["190 APPLICATION/ANDRE PUCCI/fwdtraduodedocumentosandrfelipepucci", "Andre Pucci"],
  ["190 APPLICATION/ANDRE PUCCI/visa190documents", "Andre Pucci"],
  ["485 APPLICATION/ANDRE PUCCI/BVB ", "Andre Pucci"],
  ["485 APPLICATION/ANDRE PUCCI/REQUEST ", "Andre Pucci"],
  ["485 APPLICATION/ANDRE PUCCI/VIAGENS E ENDEREÇO", "Andre Pucci"],
  ["485 APPLICATION/ANDRE PUCCI/visa190documents", "Andre Pucci"],
  ["408 APPLICATION/IANE SILVA DA CRUZ/DOCS", "Iane Silva da Cruz"],
  ["408 APPLICATION/JULIANA SOARES DE DEUS/Certidao de nascimento", "Juliana Soares de Deus"],
  ["408 APPLICATION/JULIANA SOARES DE DEUS/Diploma Brasil", "Juliana Soares de Deus"],
  ["408 APPLICATION/JULIANA SOARES DE DEUS/Greenwich", "Juliana Soares de Deus"],
  ["408 APPLICATION/JULIANA SOARES DE DEUS/Passaporte", "Juliana Soares de Deus"],
  ["408 APPLICATION/THAYS BOSCOLO/TRA", "Thays Boscolo"],
  ["408 APPLICATION/THAYS BOSCOLO/drive-download-20260312T084051Z-1-001", "Thays Boscolo"],
  ["485 APPLICATION/THAYS BOSCOLO/TRA", "Thays Boscolo"],
  ["485 APPLICATION/THAYS BOSCOLO/drive-download-20260312T084051Z-1-001", "Thays Boscolo"],
  ["482 SUBSEQUENT/KARLA TAMIRES/Cartas assinadas", "Karla Tamires"],
  ["482 SUBSEQUENT/KARLA TAMIRES/Documentos", "Karla Tamires"],
  ["482 SUBSEQUENT/KARLA TAMIRES/LETTERS", "Karla Tamires"],
  ["482 SUBSEQUENT/KARLA TAMIRES/Letter", "Karla Tamires"],
  ["485 APPLICATION/ANANDA KRISHNA CECATTO GALETI/ADDRESS:TRAVEL", "Ananda Krishna Cecatto Galeti"],
  ["485 APPLICATION/ANANDA KRISHNA CECATTO GALETI/Docs Visto 485", "Ananda Krishna Cecatto Galeti"],
  ["485 APPLICATION/ARIAN/ESCOLA", "Arian"],
  ["485 APPLICATION/ARIAN/POLICE CHECK", "Arian"],
  ["485 APPLICATION/BEATRIZ E BUENO/DOCS", "Beatriz e Bueno"],
  ["485 APPLICATION/BEATRIZ E BUENO/REQUEST", "Beatriz e Bueno"],
  ["485 APPLICATION/VITORIA DA SILVA MACIEL/Documents Vitoria", "Vitoria da Silva Maciel"],
  ["485 APPLICATION/VITORIA DA SILVA MACIEL/Letters", "Vitoria da Silva Maciel"],
  ["PARTNER VISA/DANILO (VISA)/ASSINADOS", "Danilo Martins"],
  ["PARTNER VISA/DANILO (VISA)/FOTOS", "Danilo Martins"],
  ["PARTNER VISA/DANILO (VISA)/REQUEST", "Danilo Martins"],
  ["PARTNER VISA/DANILO (VISA)/untitled folder", "Danilo Martins"],
  ["USA VISAS/SANDRA USA/FORMS", "Sandra Usa"],
  ["USA VISAS/SANDRA USA/NOVO", "Sandra Usa"],
]);

function readCsv(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [caminho, tipo, cliente, qtd, acao] = line.split(";");
      return { caminho, tipo, cliente, qtd, acao };
    });
}

function writeCsv(path, rows) {
  const header = "caminho;tipo_processo;cliente_proposto;qtd_arquivos;acao";
  const csv = [header, ...rows.map((r) => [r.caminho, r.tipo, r.cliente, r.qtd ?? "", r.acao].join(";"))].join("\n");
  writeFileSync(path, csv);
}

const pending = readCsv(PENDING_CSV);
const approved = readCsv(APPROVED_CSV);
const approvedPaths = new Set(approved.map((r) => r.caminho));

let skipped = 0;
let merged = 0;
let addedDirect = 0;
let alreadyApproved = 0;
const stillPending = [];

for (const row of pending) {
  if (SKIP_PATHS.has(row.caminho)) {
    skipped++;
    continue;
  }
  if (approvedPaths.has(row.caminho)) {
    alreadyApproved++;
    continue;
  }
  const mergeName = MERGE_INTO.get(row.caminho);
  if (mergeName) {
    approved.push({ ...row, cliente: mergeName, acao: "importar" });
    approvedPaths.add(row.caminho);
    merged++;
    continue;
  }
  if (row.acao === "importar" && row.cliente) {
    approved.push(row);
    approvedPaths.add(row.caminho);
    addedDirect++;
    continue;
  }
  stillPending.push(row);
}

writeCsv(APPROVED_CSV, approved);
writeCsv(PENDING_CSV, stillPending);

console.log(`Excluídas (material de equipe/template/duplicata): ${skipped}`);
console.log(`Agrupadas em cliente existente (documento, não cliente novo): ${merged}`);
console.log(`Aprovadas direto (cliente novo): ${addedDirect}`);
console.log(`Já estavam aprovadas: ${alreadyApproved}`);
console.log(`Ainda pendentes (sobrou alguma coisa sem decisão): ${stillPending.length}`);
console.log(`\n${APPROVED_CSV} atualizado com ${approved.length} linhas aprovadas no total.`);
console.log(`Próximo passo: rodar o sync de verdade pra subir os arquivos dessas pastas novas.`);
