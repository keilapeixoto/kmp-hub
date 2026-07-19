// KMP Hub · Etapas padrão de pipeline para os tipos de serviço reais (não
// demo). Idempotente: só cria se o tipo de serviço ainda não tiver etapas —
// não sobrescreve customizações feitas depois pela equipe.
//
// Uso: node scripts/seed-case-stages.mjs

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

const STAGES = {
  "Subclass 485 — Single": ["Documentação", "Police Check (AFP)", "Lodgement", "Pós-Submissão (BVA)", "Decisão"],
  "Subclass 485 — Couple": ["Documentação", "Police Check (AFP)", "Lodgement", "Pós-Submissão (BVA)", "Decisão"],
  "Subclass 485 Post-Higher Education — Single": ["Documentação", "Police Check (AFP)", "Lodgement", "Pós-Submissão (BVA)", "Decisão"],
  "Subclass 485 Post-Higher Education — Couple": ["Documentação", "Police Check (AFP)", "Lodgement", "Pós-Submissão (BVA)", "Decisão"],
  "Subclass 482 — Subsequent Entrant": ["Documentação", "Lodgement", "Decisão"],
  "Tourist Visa — Subclass 600": ["Documentação", "Lodgement", "Decisão"],
  "US Visa B1/B2": ["Documentação e Formulário", "Preenchimento da Aplicação", "Agendamento de Entrevista", "Decisão"],
};

for (const [nome, etapas] of Object.entries(STAGES)) {
  const { data: st } = await s.from("service_types").select("id").eq("nome", nome).maybeSingle();
  if (!st) {
    console.log(`service_type não encontrado: ${nome}`);
    continue;
  }

  const { count } = await s
    .from("case_stages")
    .select("*", { count: "exact", head: true })
    .eq("service_type_id", st.id);
  if (count && count > 0) {
    console.log(`${nome}: já tem ${count} etapas, pulando`);
    continue;
  }

  const rows = etapas.map((nomeEtapa, i) => ({
    service_type_id: st.id,
    ordem: i + 1,
    nome: nomeEtapa,
  }));
  const { error } = await s.from("case_stages").insert(rows);
  console.log(error ? `${nome}: ERRO — ${error.message}` : `${nome}: ${rows.length} etapas criadas`);
}
