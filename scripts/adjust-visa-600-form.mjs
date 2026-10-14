// Ajustes incrementais do formulário do 600 (nunca recria o modelo):
//  - RG, CPF e nome do pai/da mãe deixam de ser obrigatórios (o ImmiAccount não pede);
//  - "Nacionalidade atual" sai (repete "Nacionalidade conforme passaporte");
//  - textos de ajuda onde o cliente costuma errar.
// Uso: node scripts/adjust-visa-600-form.mjs [--apply] [--remover]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const apply = process.argv.includes("--apply");
const remover = process.argv.includes("--remover");
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const TEMPLATE = "Formulário Visto de Turista (Subclass 600) — Coleta de Dados";
const OPCIONAIS = ["RG / Documento de identidade", "CPF", "Nome da mãe", "Nome do pai"];
const REMOVER = ["Nacionalidade atual"];
const AJUDA = {
  Nome: "Escreva exatamente como está no passaporte.",
  Sobrenome: "Escreva exatamente como está no passaporte.",
  "Número do passaporte": "Confira letra por letra no passaporte.",
  "Local de emissão": "Como aparece no passaporte (ex.: SR/DPF/SP).",
};

const { data: tpl } = await s.from("case_form_templates").select("id").eq("nome", TEMPLATE).single();
const { data: steps } = await s.from("case_form_steps").select("id").eq("template_id", tpl.id);
const { data: campos } = await s
  .from("case_form_fields")
  .select("id,label,obrigatorio,ajuda")
  .in("step_id", steps.map((x) => x.id));

for (const c of campos) {
  if (OPCIONAIS.includes(c.label) && c.obrigatorio) {
    console.log(`${apply ? "tornando" : "tornaria"} opcional: ${c.label}`);
    if (apply) await s.from("case_form_fields").update({ obrigatorio: false }).eq("id", c.id);
  }
  if (AJUDA[c.label] && !c.ajuda) {
    console.log(`${apply ? "gravando" : "gravaria"} ajuda em: ${c.label}`);
    if (apply) await s.from("case_form_fields").update({ ajuda: AJUDA[c.label] }).eq("id", c.id);
  }
  // Exclusão (apaga as respostas do campo junto): só com --remover, de propósito.
  if (REMOVER.includes(c.label) && !remover) {
    console.log(`(mantido por enquanto: ${c.label} — rode com --apply --remover para excluir)`);
  } else if (REMOVER.includes(c.label)) {
    const { count } = await s.from("case_form_responses").select("id", { count: "exact", head: true }).eq("field_id", c.id);
    console.log(`${apply ? "removendo" : "removeria"}: ${c.label} (${count ?? 0} resposta(s) que serão apagadas junto)`);
    if (apply) await s.from("case_form_fields").delete().eq("id", c.id);
  }
}
console.log(apply ? "\nConcluído." : "\nSimulação — nada foi gravado. Rode com --apply.");
