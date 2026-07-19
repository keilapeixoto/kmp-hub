// Etapa 2 da importação de documentos: lê o CSV de mapeamento revisado
// (etapa 1, scan-key-migration.mjs), cria os clientes que não existem e sobe
// os arquivos para o bucket privado "documents", registrando cada um na
// tabela documents (categoria = tipo de processo da pasta de origem).
//
// Usa a SUPABASE_SECRET_KEY do .env.local (somente servidor — este script
// roda localmente, nunca no navegador). Idempotente: pula arquivos cujo
// storage_path já existe em documents, então pode rodar de novo sem duplicar.
//
// Uso:
//   node scripts/import-key-migration.mjs "<pasta base>" [mapa.csv] [--dry-run] [--owner-email=email]
//
// O "dono" (enviado_por + consultor_id dos clientes criados) é o usuário de
// auth com o e-mail informado (padrão: keila.peixoto@kmpconsulting.com.au).

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2];
const CSV = process.argv.find((a, i) => i >= 3 && !a.startsWith("--")) ?? "import/key-migration-map.csv";
const DRY_RUN = process.argv.includes("--dry-run");
const OWNER_EMAIL =
  process.argv.find((a) => a.startsWith("--owner-email="))?.split("=")[1] ??
  "keila.peixoto@kmpconsulting.com.au";

if (!BASE) {
  console.error('Uso: node scripts/import-key-migration.mjs "<pasta base>" [mapa.csv] [--dry-run]');
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

// --- helpers ----------------------------------------------------------------

const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db"]);
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

// --- carga inicial ----------------------------------------------------------

console.log(`Base: ${BASE}`);
console.log(`Mapa: ${CSV}${DRY_RUN ? " (DRY RUN — nada será gravado)" : ""}`);

// Dono: usuário de auth pelo e-mail
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
console.log(`Dono da importação: ${OWNER_EMAIL}`);

// Clientes existentes (cache por nome, case-insensitive)
const clientByName = new Map();
{
  const { data, error } = await supabase.from("clients").select("id, nome");
  if (error) throw error;
  for (const c of data) clientByName.set(c.nome.trim().toLowerCase(), c.id);
}

// Documentos já importados (idempotência)
const existingPaths = new Set();
{
  const { data, error } = await supabase.from("documents").select("storage_path");
  if (error) throw error;
  for (const d of data) existingPaths.add(d.storage_path);
}

// CSV
const rows = readFileSync(CSV, "utf8")
  .split("\n")
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const [caminho, tipo, cliente, qtd, acao] = line.split(";");
    return { caminho, tipo, cliente, qtd: Number(qtd), acao };
  })
  .filter((r) => r.acao === "importar" && r.cliente);

console.log(`${rows.length} pastas para importar · ${clientByName.size} clientes já no banco · ${existingPaths.size} documentos já importados\n`);

// --- importação ---------------------------------------------------------------

const report = { clientesCriados: 0, arquivosEnviados: 0, pulados: 0, erros: [] };

for (const [rowIndex, row] of rows.entries()) {
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

  // cliente: acha ou cria
  let clientId = clientByName.get(clientKey);
  if (!clientId) {
    if (DRY_RUN) {
      console.log(`[dry] criaria cliente: ${row.cliente}`);
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

  console.log(
    `[${rowIndex + 1}/${rows.length}] ${row.cliente} — ${enviados} enviados${pulados ? `, ${pulados} pulados` : ""}${erros.length ? `, ${erros.length} ERROS` : ""}`,
  );
}

console.log(`\n===== RELATÓRIO =====`);
console.log(`Clientes criados:  ${report.clientesCriados}`);
console.log(`Arquivos enviados: ${report.arquivosEnviados}`);
console.log(`Pulados (já existiam): ${report.pulados}`);
console.log(`Erros: ${report.erros.length}`);
for (const e of report.erros.slice(0, 40)) console.log(`  - ${e}`);
if (report.erros.length > 40) console.log(`  ... e mais ${report.erros.length - 40}`);
