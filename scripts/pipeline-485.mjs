// KMP Hub · Etapas do 485 no fluxo da Keila (out/2026):
//   1 Análise de documentos        (era Documentação; Police Check entra aqui)
//   2 Lodgement do visto           (era Lodgement)
//   3 Skill Assessment aplicado
//   4 Visto aplicado               (era Pós-Submissão (BVA))
//   5 Aguardando aprovação do Skill Assessment
//   6 Aguardando agendamento do exame médico   (abre prazo de 28 dias)
//   7 Request recebido da imigração            (pode não acontecer; abre prazo)
//   8 Visto aprovado               (era Decisão)
// Etapas antigas são renomeadas (os processos ficam nelas); Police Check tem
// os processos movidos para Análise de documentos e sai. Não mostra clientes.
//
// Simulação: node --env-file=.env.local scripts/pipeline-485.mjs
// Gravar:    ... --apply

import { createClient } from "@supabase/supabase-js";

const aplicar = process.argv.includes("--apply");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const NOVAS = [
  { nome: "Análise de documentos", de: /^documenta/i },
  { nome: "Lodgement do visto", de: /^lodgement/i },
  { nome: "Skill Assessment aplicado", de: null },
  { nome: "Visto aplicado", de: /p[oó]s-submiss|^visto aplicado/i },
  { nome: "Aguardando aprovação do Skill Assessment", de: null },
  { nome: "Aguardando agendamento do exame médico", de: null },
  { nome: "Request recebido da imigração", de: null },
  { nome: "Visto aprovado", de: /^decis|^visto aprovado/i },
];
const POLICE = /police check/i;

const { data: tipos } = await s.from("service_types").select("id, nome").ilike("nome", "%485%");
for (const t of tipos) {
  const { data: etapas } = await s.from("case_stages").select("id, nome, ordem").eq("service_type_id", t.id).order("ordem");
  const { data: casos } = await s.from("cases").select("id, etapa_id").eq("service_type_id", t.id);
  const conta = (id) => casos.filter((c) => c.etapa_id === id).length;
  const usadas = new Set();
  const plano = NOVAS.map((n, i) => {
    const velha = n.de ? etapas.find((e) => n.de.test(e.nome) && !usadas.has(e.id)) : etapas.find((e) => e.nome === n.nome);
    if (velha) usadas.add(velha.id);
    return { ...n, ordem: i + 1, velha };
  });
  const police = etapas.filter((e) => POLICE.test(e.nome));
  const sobram = etapas.filter((e) => !usadas.has(e.id) && !POLICE.test(e.nome));

  console.log(`\n${t.nome}`);
  for (const p of plano) {
    console.log(`  ${p.ordem}. ${p.nome}${p.velha ? (p.velha.nome !== p.nome ? `  (era "${p.velha.nome}", ${conta(p.velha.id)} processos)` : `  (${conta(p.velha.id)} processos)`) : "  (nova)"}`);
  }
  for (const pc of police) console.log(`  sai "${pc.nome}": ${conta(pc.id)} processos vão para Análise de documentos`);
  for (const x of sobram) console.log(`  ATENÇÃO: etapa "${x.nome}" não tem par (${conta(x.id)} processos) — fica no fim`);
  if (!aplicar) continue;

  const doc = plano[0].velha;
  for (const pc of police) {
    if (doc) await s.from("cases").update({ etapa_id: doc.id }).eq("etapa_id", pc.id);
    const { error } = await s.from("case_stages").delete().eq("id", pc.id);
    if (error) throw new Error(`apagar police check: ${error.message}`);
  }
  // (service_type_id, ordem) é único: passa tudo por ordens temporárias.
  for (const [i, e] of [...plano.filter((p) => p.velha).map((p) => p.velha), ...sobram].entries()) {
    const { error } = await s.from("case_stages").update({ ordem: -100 - i }).eq("id", e.id);
    if (error) throw new Error(`ordem temporária: ${error.message}`);
  }
  for (const p of plano) {
    const r = p.velha
      ? await s.from("case_stages").update({ nome: p.nome, ordem: p.ordem }).eq("id", p.velha.id)
      : await s.from("case_stages").insert({ service_type_id: t.id, nome: p.nome, ordem: p.ordem });
    if (r.error) throw new Error(`${p.nome}: ${r.error.message}`);
  }
  for (const [i, x] of sobram.entries()) await s.from("case_stages").update({ ordem: NOVAS.length + 1 + i }).eq("id", x.id);
  console.log("  gravado.");
}
if (!aplicar) console.log("\nSimulação. Rode com --apply para gravar.");
