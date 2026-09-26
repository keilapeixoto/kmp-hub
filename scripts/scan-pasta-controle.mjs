// Etapa 1 da importação da pasta de controle: varre a pasta local e gera um
// CSV de mapeamento (pasta → cliente/categoria) para revisão manual. Não
// sobe nada — a importação real (etapa 2, import-pasta-controle.mjs) só
// roda depois do CSV revisado.
//
// Mesmo padrão de scan-key-migration.mjs (usado pra importar a pasta KEY
// MIGRATION), mas sem as regras manuais específicas daquela pasta — aqui a
// heurística é só: pasta de topo sem subpastas = cliente direto na raiz;
// pasta de topo com subpastas = categoria, cada subpasta = um cliente.
//
// Uso: node scripts/scan-pasta-controle.mjs "<caminho da pasta>" [saida.csv]

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2];
const OUT = process.argv[3] ?? "import/pasta-controle-map.csv";

if (!BASE) {
  console.error('Uso: node scripts/scan-pasta-controle.mjs "<pasta>" [saida.csv]');
  process.exit(1);
}

const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

function listDir(path) {
  const entries = readdirSync(path).filter((e) => !IGNORED_FILES.has(e));
  const dirs = [];
  const files = [];
  for (const entry of entries) {
    try {
      if (statSync(join(path, entry)).isDirectory()) dirs.push(entry);
      else files.push(entry);
    } catch {
      // links quebrados etc. — ignora
    }
  }
  return { dirs, files };
}

function countFilesRecursive(path) {
  const { dirs, files } = listDir(path);
  return files.length + dirs.reduce((sum, d) => sum + countFilesRecursive(join(path, d)), 0);
}

function titleCase(name) {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const rows = [];
const root = listDir(BASE);

// Arquivos soltos na raiz — sem cliente associável, ficam como pular.
for (const file of root.files) {
  rows.push({ caminho: file, categoria: "", cliente: "", arquivos: 1, acao: "pular" });
}

for (const top of root.dirs) {
  const topPath = join(BASE, top);
  const { dirs: subdirs, files: looseFiles } = listDir(topPath);

  // Pasta de topo sem subpastas = candidata a cliente direto na raiz.
  if (subdirs.length === 0) {
    const total = looseFiles.length;
    rows.push({
      caminho: top,
      categoria: "",
      cliente: titleCase(top),
      arquivos: total,
      acao: total === 0 ? "pular" : "importar",
    });
    continue;
  }

  // Arquivos soltos dentro da pasta de categoria — sem cliente, pular.
  if (looseFiles.length > 0) {
    rows.push({
      caminho: `${top}/(arquivos soltos)`,
      categoria: top.trim(),
      cliente: "",
      arquivos: looseFiles.length,
      acao: "pular",
    });
  }

  // Pasta de topo com subpastas = categoria; cada subpasta = um cliente.
  for (const sub of subdirs) {
    const subPath = join(topPath, sub);
    const total = countFilesRecursive(subPath);
    rows.push({
      caminho: `${top}/${sub}`,
      categoria: top.trim(),
      cliente: titleCase(sub),
      arquivos: total,
      acao: total === 0 ? "pular" : "importar",
    });
  }
}

const header = "caminho;categoria;cliente_proposto;qtd_arquivos;acao";
const csv = [
  header,
  ...rows.map((r) => [r.caminho, r.categoria, r.cliente, r.arquivos, r.acao].join(";")),
].join("\n");

writeFileSync(OUT, csv);

const importar = rows.filter((r) => r.acao === "importar");
console.log(`${rows.length} entradas mapeadas → ${OUT}`);
console.log(`  importar: ${importar.length} pastas, ${importar.reduce((s, r) => s + r.arquivos, 0)} arquivos`);
console.log(`  pular:    ${rows.length - importar.length} entradas`);
console.log(`\nAbra o CSV e revise cada linha antes de importar:`);
console.log(`  - "cliente_proposto" errado → corrija o nome (tem que bater com o nome já cadastrado no Hub, se o cliente já existir).`);
console.log(`  - "acao" errada → troque "importar"/"pular" manualmente.`);
console.log(`  - pasta de agrupamento que virou "cliente" por engano → mude "acao" pra "pular" e me avise, que eu ajusto o script pra descer mais um nível nessa pasta.`);
