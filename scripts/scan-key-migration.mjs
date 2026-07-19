// Etapa 1 da importação de documentos: varre a pasta KEY MIGRATION e gera um
// CSV de mapeamento (pasta → cliente/tipo de processo) para revisão manual.
// Não sobe nada — a importação real (etapa 2) só roda depois do CSV revisado.
//
// Uso: node scripts/scan-key-migration.mjs "<caminho da pasta>" [saida.csv]

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2];
const OUT = process.argv[3] ?? "import/key-migration-map.csv";

if (!BASE) {
  console.error('Uso: node scripts/scan-key-migration.mjs "<pasta>" [saida.csv]');
  process.exit(1);
}

const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db"]);

// Pastas de material de referência (não são clientes) — entram no CSV com
// acao=pular por padrão; é só trocar para importar se eu estiver errado.
const REFERENCE_FOLDERS = new Set([
  "TEMPLATES VISTOS",
  "IMMI CONTACTS",
  "PROBLEMAS SOLVED IMMI",
  "QUALIFICATIONS AUSTRALIA",
  "SPONSORS PARA ESTUDOS",
  "VISA PROCESS (TRIP STUDY)",
  "NZ",
  "REQUEST TRA",
  "WORKING HOLIDAY VISA",
  "VISTO DE ESTUDANTE",
]);

// Caminhos (relativos) que são agrupamentos e precisam descer mais um nível
// para achar os clientes (confirmado por inspeção manual).
const FORCE_GROUPING = new Set(["485 PARA APLICAR/APLICADOS/408 VISA"]);

// Caminhos que SÃO uma pasta de cliente apesar de terem subpastas (as
// subpastas são organização interna do processo, não clientes distintos).
const FORCE_CLIENT = new Map([
  ["190 APPLICATION/AUGUSTO RENDA", "Augusto Renda"],
  ["PR'S/ANDRE PUCCI", "Andre Pucci"],
]);

// Entradas específicas que não são clientes (tribunal, templates etc.).
const FORCE_SKIP = new Set(["APPEAL/AAT", "PROCESSOS/TALENT VISA"]);

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
  rows.push({ caminho: file, tipo: "", cliente: "", arquivos: 1, acao: "pular" });
}

for (const top of root.dirs) {
  const topPath = join(BASE, top);
  const { dirs: level2, files: looseFiles } = listDir(topPath);
  const isReference = REFERENCE_FOLDERS.has(top.trim());

  // Pasta de topo sem subpastas = candidata a cliente direto na raiz
  // (ex.: VICTOR CASSIANO (BVE), LELECO).
  if (level2.length === 0) {
    const total = looseFiles.length;
    rows.push({
      caminho: top,
      tipo: "",
      cliente: isReference ? "" : titleCase(top),
      arquivos: total,
      acao: isReference || total === 0 ? "pular" : "importar",
    });
    continue;
  }

  // Arquivos soltos dentro da pasta de tipo — sem cliente, pular.
  if (looseFiles.length > 0) {
    rows.push({
      caminho: `${top}/(arquivos soltos)`,
      tipo: top.trim(),
      cliente: "",
      arquivos: looseFiles.length,
      acao: "pular",
    });
  }

  for (const second of level2) {
    const secondPath = join(topPath, second);
    const relPath = `${top}/${second}`;
    const relTrimmed = `${top.trim()}/${second.trim()}`;
    const { dirs: level3 } = listDir(secondPath);
    const total = countFilesRecursive(secondPath);

    const forceClientName =
      FORCE_CLIENT.get(relPath) ?? FORCE_CLIENT.get(relTrimmed) ?? null;
    const forceSkip = FORCE_SKIP.has(relPath) || FORCE_SKIP.has(relTrimmed);

    if (forceClientName) {
      rows.push({
        caminho: relPath,
        tipo: top.trim(),
        cliente: forceClientName,
        arquivos: total,
        acao: total === 0 ? "pular" : "importar",
      });
      continue;
    }

    if (forceSkip) {
      rows.push({
        caminho: relPath,
        tipo: top.trim(),
        cliente: "",
        arquivos: total,
        acao: "pular",
      });
      continue;
    }

    // Heurística: se a subpasta ainda tem subpastas com nomes de pessoas
    // (ex.: 485 PARA APLICAR/APLICADOS/...), desce um nível.
    const looksLikeGrouping =
      level3.length > 0 &&
      /^[A-Z0-9\s'()&-]+$/.test(second) &&
      total > 0 &&
      level3.length >= 2;

    if (looksLikeGrouping) {
      for (const third of level3) {
        const thirdPath = join(secondPath, third);
        const thirdRel = `${relPath}/${third}`;
        const thirdIsGrouping =
          FORCE_GROUPING.has(thirdRel) || FORCE_GROUPING.has(`${relTrimmed}/${third.trim()}`);

        if (thirdIsGrouping) {
          // Mais um nível de agrupamento (ex.: .../APLICADOS/408 VISA/<clientes>)
          const { dirs: level4, files: files4 } = listDir(thirdPath);
          if (files4.length > 0) {
            rows.push({
              caminho: `${thirdRel}/(arquivos soltos)`,
              tipo: `${top.trim()} / ${third.trim()}`,
              cliente: "",
              arquivos: files4.length,
              acao: "pular",
            });
          }
          for (const fourth of level4) {
            const fourthTotal = countFilesRecursive(join(thirdPath, fourth));
            rows.push({
              caminho: `${thirdRel}/${fourth}`,
              tipo: `${top.trim()} / ${third.trim()}`,
              cliente: titleCase(fourth),
              arquivos: fourthTotal,
              acao: fourthTotal === 0 ? "pular" : "importar",
            });
          }
          continue;
        }

        const thirdTotal = countFilesRecursive(thirdPath);
        rows.push({
          caminho: thirdRel,
          tipo: `${top.trim()} / ${second.trim()}`,
          cliente: titleCase(third),
          arquivos: thirdTotal,
          acao: isReference || thirdTotal === 0 ? "pular" : "importar",
        });
      }
    } else {
      rows.push({
        caminho: relPath,
        tipo: top.trim(),
        cliente: isReference ? "" : titleCase(second),
        arquivos: total,
        acao: isReference || total === 0 ? "pular" : "importar",
      });
    }
  }
}

const header = "caminho;tipo_processo;cliente_proposto;qtd_arquivos;acao";
const csv = [
  header,
  ...rows.map((r) => [r.caminho, r.tipo, r.cliente, r.arquivos, r.acao].join(";")),
].join("\n");

writeFileSync(OUT, csv);

const importar = rows.filter((r) => r.acao === "importar");
console.log(`${rows.length} entradas mapeadas → ${OUT}`);
console.log(`  importar: ${importar.length} pastas, ${importar.reduce((s, r) => s + r.arquivos, 0)} arquivos`);
console.log(`  pular:    ${rows.length - importar.length} entradas`);
