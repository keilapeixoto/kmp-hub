// KMP Hub · Sprint 8 (Parte 1) · Remoção dos dados de demonstração.
//
// Remove APENAS registros com is_demo = true. Tabelas-filhas (lead_events,
// checklists, dependentes, client_relations etc.) caem em cascata pelas FKs.
// Imprime a contagem de dados reais antes e depois para provar que nada real
// foi tocado (Critério 17 da seção 32).
//
// Uso: node scripts/clean-demo.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// Ordem respeita as FKs sem cascata (clients.lead_id → leads;
// cases.service_type_id → service_types).
const TABLES = [
  "appointments",
  "tasks",
  "cases",
  "clients",
  "leads",
  "service_types",
  "guides",
  "message_templates",
];

async function realCounts() {
  const counts = {};
  for (const t of TABLES) {
    const { count } = await s
      .from(t)
      .select("*", { count: "exact", head: true })
      .eq("is_demo", false);
    counts[t] = count ?? 0;
  }
  return counts;
}

const before = await realCounts();
console.log("Dados reais ANTES:", JSON.stringify(before));

for (const t of TABLES) {
  const { count, error } = await s
    .from(t)
    .delete({ count: "exact" })
    .eq("is_demo", true);
  if (error) {
    console.error(`${t}: ERRO — ${error.message}`);
    process.exit(1);
  }
  console.log(`${t}: ${count ?? 0} registros demo removidos`);
}

const after = await realCounts();
console.log("Dados reais DEPOIS:", JSON.stringify(after));

const intact = TABLES.every((t) => before[t] === after[t]);
console.log(
  intact
    ? "OK — contagem de dados reais idêntica antes e depois."
    : "ATENÇÃO — contagens divergiram! Verifique antes de qualquer outra ação.",
);
process.exit(intact ? 0 : 1);
