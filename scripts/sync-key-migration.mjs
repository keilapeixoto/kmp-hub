// Sincronização automática da pasta KEY MIGRATION — pensada para rodar sem
// supervisão (launchd/cron), ao contrário dos dois scripts manuais
// (scan-key-migration.mjs + import-key-migration.mjs) que ela reaproveita.
//
// Por que não reaplica tudo automaticamente: pastas de cliente nem sempre
// têm nome igual ao nome do cliente, e há pastas de material de referência
// que não são cliente — por isso a primeira importação precisou de revisão
// manual (import/key-migration-map.csv). Importar pasta nova sem revisão
// arrisca jogar documento de imigração no cliente errado.
//
// O que este script faz em cada execução:
//   1. Varre a pasta de novo com a mesma heurística do scan-key-migration.mjs.
//   2. Pastas que já estão em import/key-migration-map.csv com acao=importar
//      → sobe os arquivos novos automaticamente (idempotente, mesma lógica
//        do import-key-migration.mjs — pula o que já existe).
//   3. Pastas novas (não estão no CSV aprovado) → NÃO importa. Escreve em
//      import/key-migration-pendentes.csv para revisão manual depois.
//
// Para aprovar uma pasta nova: olhe import/key-migration-pendentes.csv,
// copie a linha para import/key-migration-map.csv ajustando cliente_proposto
// e acao=importar. Na próxima execução ela entra no fluxo automático.
//
// Uso:
//   node scripts/sync-key-migration.mjs "<pasta base>" [--dry-run] [--owner-email=email]
//
// Pensado para ser chamado por um agendador (launchd no Mac, cron no Linux)
// sem interação — não lê nada do stdin, não assume TTY, só imprime um
// relatório em texto simples (redirecione para um arquivo de log se quiser
// histórico).

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");
const OWNER_EMAIL =
  process.argv.find((a) => a.startsWith("--owner-email="))?.split("=")[1] ??
  "keila.peixoto@kmpconsulting.com.au";

const APPROVED_CSV = "import/key-migration-map.csv";
const PENDING_CSV = "import/key-migration-pendentes.csv";

if (!BASE) {
  console.error('Uso: node scripts/sync-key-migration.mjs "<pasta base>" [--dry-run]');
  process.exit(1);
}

// --- .env.local (sem dependência de dotenv) --------------------------------

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY não encontradas no .env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

// --- heurística de varredura (igual scan-key-migration.mjs) ----------------

const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db"]);

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

const FORCE_GROUPING = new Set(["485 PARA APLICAR/APLICADOS/408 VISA"]);

const FORCE_CLIENT = new Map([
  ["190 APPLICATION/AUGUSTO RENDA", "Augusto Renda"],
  ["PR'S/ANDRE PUCCI", "Andre Pucci"],
]);

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

function scanFolders(base) {
  const rows = [];
  const root = listDir(base);

  for (const top of root.dirs) {
    const topPath = join(base, top);
    const { dirs: level2, files: looseFiles } = listDir(topPath);
    const isReference = REFERENCE_FOLDERS.has(top.trim());

    if (level2.length === 0) {
      const total = looseFiles.length;
      rows.push({
        caminho: top,
        tipo: "",
        cliente: isReference ? "" : titleCase(top),
        acao: isReference || total === 0 ? "pular" : "importar",
      });
      continue;
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
        rows.push({ caminho: relPath, tipo: top.trim(), cliente: forceClientName, acao: total === 0 ? "pular" : "importar" });
        continue;
      }
      if (forceSkip) {
        rows.push({ caminho: relPath, tipo: top.trim(), cliente: "", acao: "pular" });
        continue;
      }

      const looksLikeGrouping =
        level3.length > 0 && /^[A-Z0-9\s'()&-]+$/.test(second) && total > 0 && level3.length >= 2;

      if (looksLikeGrouping) {
        for (const third of level3) {
          const thirdPath = join(secondPath, third);
          const thirdRel = `${relPath}/${third}`;
          const thirdIsGrouping =
            FORCE_GROUPING.has(thirdRel) || FORCE_GROUPING.has(`${relTrimmed}/${third.trim()}`);

          if (thirdIsGrouping) {
            const { dirs: level4 } = listDir(thirdPath);
            for (const fourth of level4) {
              const fourthTotal = countFilesRecursive(join(thirdPath, fourth));
              rows.push({
                caminho: `${thirdRel}/${fourth}`,
                tipo: `${top.trim()} / ${third.trim()}`,
                cliente: titleCase(fourth),
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
            acao: isReference || thirdTotal === 0 ? "pular" : "importar",
          });
        }
      } else {
        rows.push({
          caminho: relPath,
          tipo: top.trim(),
          cliente: isReference ? "" : titleCase(second),
          acao: isReference || total === 0 ? "pular" : "importar",
        });
      }
    }
  }
  return rows;
}

function readCsv(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [caminho, tipo, cliente, qtd, acao] = line.split(";");
      return { caminho, tipo, cliente, qtd: Number(qtd), acao };
    });
}

function writeCsv(path, rows) {
  const header = "caminho;tipo_processo;cliente_proposto;qtd_arquivos;acao";
  const csv = [header, ...rows.map((r) => [r.caminho, r.tipo, r.cliente, r.qtd ?? "", r.acao].join(";"))].join("\n");
  writeFileSync(path, csv);
}

// --- upload (igual import-key-migration.mjs) --------------------------------

const BUCKET = "documents";
const MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  zip: "application/zip",
};

function walkFiles(dir, rel = "") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const relPath = rel ? `${rel}/${entry}` : entry;
    try {
      if (statSync(full).isDirectory()) out.push(...walkFiles(full, relPath));
      else out.push({ full, rel: relPath });
    } catch {
      // links quebrados — ignora
    }
  }
  return out;
}

function sanitizeSegment(segment) {
  return segment
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.\-_ ]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const index = i++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// --- carga inicial ------------------------------------------------------------

console.log(`Base: ${BASE}`);
console.log(`Hora: ${new Date().toISOString()}${DRY_RUN ? " (DRY RUN — nada será gravado)" : ""}`);

let ownerId = null;
{
  let page = 1;
  while (!ownerId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    ownerId = data.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase())?.id ?? null;
    if (data.users.length < 200) break;
    page++;
  }
}
if (!ownerId) {
  console.error(`Usuário ${OWNER_EMAIL} não encontrado no auth — use --owner-email=...`);
  process.exit(1);
}

const clientByName = new Map();
{
  const { data, error } = await supabase.from("clients").select("id, nome");
  if (error) throw error;
  for (const c of data) clientByName.set(c.nome.trim().toLowerCase(), c.id);
}

const existingPaths = new Set();
{
  const { data, error } = await supabase.from("documents").select("storage_path");
  if (error) throw error;
  for (const d of data) existingPaths.add(d.storage_path);
}

// --- diff: aprovado vs. novo -------------------------------------------------

const approved = readCsv(APPROVED_CSV);
const approvedByCaminho = new Map(approved.map((r) => [r.caminho, r]));

const freshRows = scanFolders(BASE);

const toImport = [];
const pending = [];

for (const row of freshRows) {
  const known = approvedByCaminho.get(row.caminho);
  if (known) {
    if (known.acao === "importar" && known.cliente) {
      // Usa o nome de cliente já aprovado (pode ter sido corrigido manualmente),
      // não o palpite da heurística.
      toImport.push({ ...row, cliente: known.cliente, tipo: known.tipo || row.tipo });
    }
    // acao=pular aprovado → ignora silenciosamente, não é novidade.
    continue;
  }
  if (row.acao === "importar") pending.push(row);
}

writeCsv(PENDING_CSV, pending);

console.log(
  `${freshRows.length} pastas varridas · ${toImport.length} já aprovadas (sincroniza automático) · ${pending.length} novas (precisam de revisão em ${PENDING_CSV})\n`,
);

// --- importação das pastas já aprovadas --------------------------------------

const report = { clientesCriados: 0, arquivosEnviados: 0, pulados: 0, erros: [] };

for (const [rowIndex, row] of toImport.entries()) {
  const folder = join(BASE, row.caminho);
  const clientKey = row.cliente.trim().toLowerCase();

  let files;
  try {
    files = walkFiles(folder);
  } catch (e) {
    report.erros.push(`${row.caminho}: pasta inacessível (${e.message})`);
    continue;
  }
  if (files.length === 0) continue;

  let clientId = clientByName.get(clientKey);
  if (!clientId) {
    if (DRY_RUN) {
      clientId = `dry-${clientKey}`;
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({ nome: row.cliente.trim(), consultor_id: ownerId })
        .select("id")
        .single();
      if (error) {
        report.erros.push(`${row.cliente}: falha ao criar cliente (${error.message})`);
        continue;
      }
      clientId = data.id;
      report.clientesCriados++;
    }
    clientByName.set(clientKey, clientId);
  }

  const results = await mapLimit(files, 5, async (file) => {
    const relSanitized = file.rel.split("/").map(sanitizeSegment).join("/");
    const storagePath = `${clientId}/importado/${relSanitized}`;

    if (existingPaths.has(storagePath)) return "pulado";
    if (DRY_RUN) return "enviado";

    let body;
    try {
      body = readFileSync(file.full);
    } catch (e) {
      return `erro: ${file.rel} ilegível (${e.message})`;
    }

    const ext = file.rel.split(".").pop()?.toLowerCase() ?? "";
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, body, { contentType: MIME[ext] ?? "application/octet-stream", upsert: true });
    if (upError) return `erro: ${file.rel} upload (${upError.message})`;

    const { error: insError } = await supabase.from("documents").insert({
      client_id: clientId,
      categoria: row.tipo || null,
      storage_path: storagePath,
      enviado_por: ownerId,
    });
    if (insError) return `erro: ${file.rel} registro (${insError.message})`;

    existingPaths.add(storagePath);
    return "enviado";
  });

  const enviados = results.filter((r) => r === "enviado").length;
  const pulados = results.filter((r) => r === "pulado").length;
  const erros = results.filter((r) => typeof r === "string" && r.startsWith("erro:"));

  report.arquivosEnviados += enviados;
  report.pulados += pulados;
  report.erros.push(...erros.map((e) => `${row.caminho} → ${e.slice(6)}`));

  if (enviados > 0 || erros.length > 0) {
    console.log(
      `[${rowIndex + 1}/${toImport.length}] ${row.cliente} — ${enviados} enviados${erros.length ? `, ${erros.length} ERROS` : ""}`,
    );
  }
}

console.log(`\n===== RELATÓRIO =====`);
console.log(`Clientes criados:      ${report.clientesCriados}`);
console.log(`Arquivos novos enviados: ${report.arquivosEnviados}`);
console.log(`Já existiam (pulados):  ${report.pulados}`);
console.log(`Erros:                  ${report.erros.length}`);
for (const e of report.erros.slice(0, 40)) console.log(`  - ${e}`);
if (report.erros.length > 40) console.log(`  ... e mais ${report.erros.length - 40}`);
if (pending.length > 0) {
  console.log(`\n${pending.length} pasta(s) nova(s) aguardando revisão em ${PENDING_CSV}:`);
  for (const p of pending.slice(0, 20)) console.log(`  - ${p.caminho} (cliente proposto: ${p.cliente || "?"})`);
  if (pending.length > 20) console.log(`  ... e mais ${pending.length - 20}`);
}
