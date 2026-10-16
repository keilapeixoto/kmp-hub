// KMP Hub · Etapas padrão para todos os vistos (out/2026, pedido da Keila:
// "as pipelines precisam ser padrões"). As mesmas 8 etapas do fluxo do 485:
//   1 Análise de documentos   2 Lodgement do visto   3 Skill Assessment aplicado
//   4 Visto aplicado          5 Aguardando aprovação do Skill Assessment
//   6 Aguardando agendamento do exame médico   7 Request recebido da imigração
//   8 Visto aprovado
// Etapa que só um visto tem (Nomination, GTE, entrevista, audiência do AAT)
// continua, no mesmo lado do Lodgement em que estava. Police Check vira
// Análise de documentos; etapa "teste" vazia sai. Os processos ficam na etapa
// equivalente. Não mostra clientes.
//
// Simulação: node --env-file=.env.local scripts/pipeline-padrao.mjs
// Gravar:    ... --apply

import { createClient } from "@supabase/supabase-js";

const aplicar = process.argv.includes("--apply");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

export const PADRAO = [
  { nome: "Análise de documentos", de: /^(documenta|an[aá]lise de doc)/i },
  { nome: "Lodgement do visto", de: /^lodgement|preenchimento da aplica|submiss[aã]o do recurso/i },
  { nome: "Skill Assessment aplicado", de: /^skill assessment aplicado/i },
  { nome: "Visto aplicado", de: /p[oó]s-submiss|^visto aplicado/i },
  { nome: "Aguardando aprovação do Skill Assessment", de: /^aguardando aprova[cç][aã]o do skill/i },
  { nome: "Aguardando agendamento do exame médico", de: /exame m[eé]dico/i },
  { nome: "Request recebido da imigração", de: /^request recebido/i },
  { nome: "Visto aprovado", de: /^decis[aã]o$|^visto aprovado/i },
];
const POLICE = /police check/i;
const LIXO = /^teste$/i;

const { data: tipos } = await s.from("service_types").select("id, nome").eq("arquivado", false).order("nome");
for (const t of tipos) {
  const { data: etapas } = await s.from("case_stages").select("id, nome, ordem").eq("service_type_id", t.id).order("ordem");
  const { data: casos } = await s.from("cases").select("id, etapa_id").eq("service_type_id", t.id);
  const conta = (id) => casos.filter((c) => c.etapa_id === id).length;
  const usadas = new Set();
  const plano = PADRAO.map((p) => {
    const velha = etapas.find((e) => p.de.test(e.nome) && !usadas.has(e.id));
    if (velha) usadas.add(velha.id);
    return { ...p, velha };
  });
  const police = etapas.filter((e) => POLICE.test(e.nome) && !usadas.has(e.id));
  const lixo = etapas.filter((e) => LIXO.test(e.nome) && !usadas.has(e.id) && conta(e.id) === 0);
  const extras = etapas.filter((e) => !usadas.has(e.id) && !police.includes(e) && !lixo.includes(e));
  const ordemLodgement = plano[1].velha?.ordem ?? Infinity;
  const antes = extras.filter((e) => e.ordem < ordemLodgement);
  const depois = extras.filter((e) => e.ordem >= ordemLodgement);

  // Ordem final: Análise, [extras de antes], Lodgement, Skill, Visto aplicado, [extras de depois], resto.
  const final = [
    { nome: plano[0].nome, velha: plano[0].velha },
    ...antes.map((e) => ({ nome: e.nome, velha: e, extra: true })),
    ...plano.slice(1, 4).map((p) => ({ nome: p.nome, velha: p.velha })),
    ...depois.map((e) => ({ nome: e.nome, velha: e, extra: true })),
    ...plano.slice(4).map((p) => ({ nome: p.nome, velha: p.velha })),
  ];

  console.log(`\n${t.nome}`);
  final.forEach((f, i) =>
    console.log(
      `  ${i + 1}. ${f.nome}${f.extra ? "  (só deste visto)" : ""}${f.velha ? (f.velha.nome !== f.nome ? `  (era "${f.velha.nome}", ${conta(f.velha.id)} proc.)` : `  (${conta(f.velha.id)} proc.)`) : "  (nova)"}`,
    ),
  );
  for (const pc of police) console.log(`  sai "${pc.nome}": ${conta(pc.id)} proc. vão para Análise de documentos`);
  if (lixo.length) console.log(`  saem ${lixo.length} etapas "teste" vazias`);
  if (!aplicar) continue;

  const doc = plano[0].velha;
  for (const pc of police) {
    if (doc) await s.from("cases").update({ etapa_id: doc.id }).eq("etapa_id", pc.id);
    const { error } = await s.from("case_stages").delete().eq("id", pc.id);
    if (error) throw new Error(`apagar ${pc.nome}: ${error.message}`);
  }
  for (const l of lixo) {
    const { error } = await s.from("case_stages").delete().eq("id", l.id);
    if (error) throw new Error(`apagar teste: ${error.message}`);
  }
  // (service_type_id, ordem) é único: passa tudo por ordens temporárias.
  for (const [i, f] of final.filter((x) => x.velha).entries()) {
    const { error } = await s.from("case_stages").update({ ordem: -100 - i }).eq("id", f.velha.id);
    if (error) throw new Error(`ordem temporária: ${error.message}`);
  }
  for (const [i, f] of final.entries()) {
    const r = f.velha
      ? await s.from("case_stages").update({ nome: f.nome, ordem: i + 1 }).eq("id", f.velha.id)
      : await s.from("case_stages").insert({ service_type_id: t.id, nome: f.nome, ordem: i + 1 });
    if (r.error) throw new Error(`${f.nome}: ${r.error.message}`);
  }
  console.log("  gravado.");
}
if (!aplicar) console.log("\nSimulação. Rode com --apply para gravar.");
