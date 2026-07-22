// KMP Hub · Controle de armazenamento · Backfill de metadados (tamanho,
// formato, hash) dos documentos enviados antes dessa migração.
//
// Só LEITURA do Storage (baixa cada arquivo uma vez pra calcular o hash —
// nenhum conteúdo é impresso ou logado, só o hash resultante) + UPDATE dos
// campos novos em documents. Nunca apaga nem sobrescreve storage_path.
//
// Uso:
//   node scripts/backfill-document-metadata.mjs           (dry-run — só mostra o que faria)
//   node scripts/backfill-document-metadata.mjs --write   (grava de verdade)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const WRITE = process.argv.includes("--write");

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

function formatoDe(path) {
  const parts = path.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

async function fetchPending(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await s
      .from(table)
      .select("id, storage_path")
      .is("tamanho_bytes", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

async function hashAndSize(path, tentativa = 1) {
  try {
    const { data, error } = await s.storage.from("documents").download(path);
    if (error) return null;
    const buffer = Buffer.from(await data.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    return { size: buffer.length, hash };
  } catch (err) {
    if (tentativa < 3) return hashAndSize(path, tentativa + 1);
    console.error(`  falha ao baixar ${path}:`, err.message ?? err);
    return null;
  }
}

async function processTable(table) {
  const pending = await fetchPending(table);
  console.log(`\n${table}: ${pending.length} linha(s) sem tamanho_bytes ainda`);

  const updates = [];
  let bytesTotais = 0;
  let falhas = 0;
  let processados = 0;

  const CONCURRENCY = 10;
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= pending.length) return;
      const row = pending[i];
      const result = await hashAndSize(row.storage_path);
      if (!result) {
        falhas++;
      } else {
        updates.push({
          id: row.id,
          tamanho_bytes: result.size,
          formato: formatoDe(row.storage_path),
          hash_sha256: result.hash,
        });
        bytesTotais += result.size;
      }
      processados++;
      if (processados % 200 === 0) {
        console.log(`  ${table}: ${processados}/${pending.length} processados…`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(
    `${table}: ${updates.length} prontos pra gravar (${(bytesTotais / 1e9).toFixed(2)} GB) · ${falhas} falha(s) ao baixar`,
  );

  if (!WRITE) {
    console.log(`${table}: dry-run, nada gravado. Rode com --write pra aplicar.`);
    return;
  }

  const chunkSize = 500;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const { error } = await s.from(table).upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`${table}: erro ao gravar lote ${i}-${i + chunk.length}:`, error.message);
    }
  }
  console.log(`${table}: gravação concluída.`);
}

async function main() {
  console.log(WRITE ? "MODO: gravação real (--write)" : "MODO: dry-run (nenhuma escrita)");
  await processTable("documents");
  await processTable("document_versions");
}

main().then(() => process.exit(0));
