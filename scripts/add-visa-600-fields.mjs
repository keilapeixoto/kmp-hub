// KMP Hub · Acrescenta campos novos ao modelo "Formulário Visto de Turista
// (Subclass 600) — Coleta de Dados" SEM recriar o modelo. Diferente de
// import-case-forms.mjs (que apaga e recria o modelo, perdendo respostas já
// preenchidas), este só insere o que ainda não existe e é seguro rodar de
// novo. Os campos entram no fim da etapa, com ordem seguinte à última.
//
// Uso: node scripts/add-visa-600-fields.mjs          (mostra o que faria)
//      node scripts/add-visa-600-fields.mjs --apply  (grava no Supabase)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const apply = process.argv.includes("--apply");

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const TEMPLATE = "Formulário Visto de Turista (Subclass 600) — Coleta de Dados";

// Labels em português iguais aos do FIELD_MAP da extensão
// (browser-extension/visa-autofill.js) — é por eles que a extensão acha a resposta.
const NOVOS = [
  {
    etapa: "Dados Pessoais",
    label: "Estado de nascimento",
    ajuda: "Estado ou província onde nasceu (o ImmiAccount exige).",
    tipo: "text",
    opcoes: null,
    obrigatorio: false,
  },
  {
    etapa: "Detalhes da Viagem",
    label: "Pretende entrar na Austrália mais de uma vez durante a estadia?",
    ajuda: "Marque Sim se pretende sair e voltar à Austrália durante o período do visto.",
    tipo: "radio",
    opcoes: ["Sim", "Não"],
    obrigatorio: false,
  },
  {
    etapa: "Detalhes da Viagem",
    label: "Data prevista de saída da Austrália",
    ajuda: "Data em que pretende deixar a Austrália definitivamente.",
    tipo: "date",
    opcoes: null,
    obrigatorio: false,
  },
];

const { data: tpl, error: tplErr } = await s
  .from("case_form_templates")
  .select("id")
  .eq("nome", TEMPLATE)
  .maybeSingle();
if (tplErr) throw new Error(tplErr.message);
if (!tpl) throw new Error(`Modelo "${TEMPLATE}" não encontrado.`);

const { count: emUso } = await s
  .from("case_forms")
  .select("id", { count: "exact", head: true })
  .eq("template_id", tpl.id);
console.log(`Modelo encontrado (${emUso ?? 0} formulário(s) já em uso — nenhum será alterado).`);

for (const novo of NOVOS) {
  const { data: etapa, error: etapaErr } = await s
    .from("case_form_steps")
    .select("id")
    .eq("template_id", tpl.id)
    .eq("titulo", novo.etapa)
    .maybeSingle();
  if (etapaErr) throw new Error(etapaErr.message);
  if (!etapa) throw new Error(`Etapa "${novo.etapa}" não encontrada.`);

  const { data: campos, error: camposErr } = await s
    .from("case_form_fields")
    .select("label, ordem")
    .eq("step_id", etapa.id);
  if (camposErr) throw new Error(camposErr.message);

  if (campos.some((c) => c.label === novo.label)) {
    console.log(`  já existe: "${novo.label}" — nada a fazer`);
    continue;
  }
  const ordem = Math.max(0, ...campos.map((c) => c.ordem)) + 1;
  console.log(`  ${apply ? "inserindo" : "inseriria"}: "${novo.label}" em "${novo.etapa}" (ordem ${ordem})`);
  if (!apply) continue;

  const { error } = await s.from("case_form_fields").insert({
    step_id: etapa.id,
    ordem,
    label: novo.label,
    ajuda: novo.ajuda,
    tipo: novo.tipo,
    opcoes: novo.opcoes,
    obrigatorio: novo.obrigatorio,
  });
  if (error) throw new Error(error.message);
}

console.log(apply ? "\nConcluído." : "\nSimulação — nada foi gravado. Rode com --apply para gravar.");
