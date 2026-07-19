// KMP Hub · Sprint 8 (Parte 1) · Seed de dados de demonstração.
//
// Idempotente: se já existir qualquer lead com is_demo = true, o script para
// sem criar nada (rode scripts/clean-demo.mjs antes para recriar do zero).
// Todos os nomes/e-mails/telefones são fictícios (domínios .example, números
// reservados). Remoção: node scripts/clean-demo.mjs
//
// Uso: node scripts/seed-demo.mjs

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

const OWNER_EMAIL = "keila.peixoto@kmpconsulting.com.au";

// --- guarda de idempotência -------------------------------------------------

{
  const { count } = await s
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("is_demo", true);
  if ((count ?? 0) > 0) {
    console.log(
      "Dados de demonstração já existem — nada a fazer. Rode scripts/clean-demo.mjs para recriar.",
    );
    process.exit(0);
  }
}

// --- dono -------------------------------------------------------------------

let ownerId = null;
{
  const { data } = await s.auth.admin.listUsers({ page: 1, perPage: 200 });
  ownerId =
    data.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL)?.id ?? null;
}
if (!ownerId) {
  console.error(`Usuário ${OWNER_EMAIL} não encontrado.`);
  process.exit(1);
}

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};
const dateOnly = (offsetDays) =>
  new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);

// --- tipos de serviço de demonstração ---------------------------------------

async function demoServiceType(nome, descricao) {
  const { data, error } = await s
    .from("service_types")
    .insert({ nome, descricao, is_demo: true })
    .select("id")
    .single();
  if (error) throw new Error(`service_type ${nome}: ${error.message}`);
  return data.id;
}

const st500 = await demoServiceType(
  "[DEMO] Subclass 500 — Student",
  "Visto de estudante (dados de demonstração)",
);
const st485 = await demoServiceType(
  "[DEMO] Subclass 485 — Graduate",
  "Temporary Graduate (dados de demonstração)",
);
const st482 = await demoServiceType(
  "[DEMO] Subclass 482 — Skills in Demand",
  "Visto de trabalho (dados de demonstração)",
);

for (const [stId, etapas] of [
  [st500, ["Documentação", "GTE / Genuine Student", "Lodgement", "Decisão"]],
  [st485, ["Documentação", "Police Check", "Lodgement", "Decisão"]],
  [st482, ["Nomination", "Documentação", "Lodgement", "Decisão"]],
]) {
  await s.from("case_stages").insert(
    etapas.map((nome, i) => ({ service_type_id: stId, ordem: i + 1, nome })),
  );
}
console.log("3 tipos de serviço demo + etapas");

// --- 15 leads ---------------------------------------------------------------

const LEADS = [
  ["Júlia Fontes Demo", "novo", "julia.demo@aluno.faculdade.example", "+55 11 91234-0001", "Brasil", "Instagram", 0],
  ["Conceição Almeida Demo", "novo", "conceicao.demo@mail.example", "+55 21 99876-0002", "Brasil", "Indicação", 0],
  ["Otávio Ramos Demo", "novo", "otavio.demo@empresa.example", "+61 400 000 003", "Austrália", "Site", 0],
  ["Beatriz Nunes Demo", "contato_iniciado", "bia.demo@mail.example", "+55 31 98765-0004", "Brasil", "Instagram", -2],
  ["Henrique Sato Demo", "contato_iniciado", "henrique.demo@corp.tecnologia.example", "+61 411 000 005", "Austrália", "Indicação", -20],
  ["Larissa Prado Demo", "qualificacao", "larissa.demo@mail.example", "+55 47 99111-0006", "Brasil", "Site", -1],
  ["Marina Duarte Demo", "consulta_agendada", "marina.demo@mail.example", "+61 422 000 007", "Austrália", "Instagram", -3],
  ["Rafael Teixeira Demo", "consulta_agendada", "rafael.demo@mail.example", "+55 11 97777-0008", "Brasil", "Evento", -1],
  ["Sofia Lemos Demo", "consulta_realizada", "sofia.demo@mail.example", "+61 433 000 009", "Austrália", "Site", -4],
  ["Tiago Barreto Demo", "proposta_enviada", "tiago.demo@mail.example", "+55 19 96666-0010", "Brasil", "Indicação", -5],
  ["Vanessa Rocha Demo", "negociacao", "vanessa.demo@mail.example", "+61 444 000 011", "Austrália", "Instagram", -2],
  ["William Costa Demo", "aguardando_decisao", "will.demo@mail.example", "+55 62 95555-0012", "Brasil", "Site", -16],
  ["Amanda Vieira Demo", "perdido", "amanda.demo@mail.example", "+61 455 000 013", "Austrália", "Evento", -30],
  ["Bruno Farias Demo", "convertido", "bruno.demo@mail.example", "+55 85 94444-0014", "Brasil", "Indicação", -10],
  ["Carolina Mota Demo", "convertido", "carol.demo@familia.mota.example", "+61 466 000 015", "Austrália", "Instagram", -8],
];

const leadIds = {};
for (const [nome, status, email, telefone, pais, origem, contatoOffset] of LEADS) {
  const { data, error } = await s
    .from("leads")
    .insert({
      nome,
      status,
      email,
      telefone,
      pais,
      origem,
      servico_interesse: "[DEMO] Subclass 500 — Student",
      consultor_id: ownerId,
      ultimo_contato: contatoOffset === 0 ? null : iso(contatoOffset),
      is_demo: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`lead ${nome}: ${error.message}`);
  leadIds[nome] = data.id;
}
console.log("15 leads (1 inativo há 20d, 1 há 16d — alerta de inatividade)");

// --- 6 clientes (2 com dependentes, 1 com doc vencendo) ---------------------

const CLIENTS = [
  ["Bruno Farias Demo", "bruno.demo@mail.example", "+55 85 94444-0014", "Brasil", "Bruno Farias Demo"],
  ["Carolina Mota Demo", "carol.demo@familia.mota.example", "+61 466 000 015", "Austrália", "Carolina Mota Demo"],
  ["Júlia Andrade Demo", "julia.andrade.demo@mail.example", "+55 11 93333-0016", "Brasil", null],
  ["Conceição Ferreira Demo", "conceicao.f.demo@escritorio.advocacia.example", "+55 71 92222-0017", "Brasil", null],
  ["Patrick O'Neill Demo", "patrick.demo@mail.example", "+61 477 000 018", "Austrália", null],
  ["Helena Vasconcelos Demo", "helena.demo@mail.example", "+61 488 000 019", "Austrália", null],
];

const clientIds = {};
for (const [nome, email, telefone, pais, leadNome] of CLIENTS) {
  const { data, error } = await s
    .from("clients")
    .insert({
      nome,
      email,
      telefone,
      pais,
      consultor_id: ownerId,
      lead_id: leadNome ? leadIds[leadNome] : null,
      is_demo: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`client ${nome}: ${error.message}`);
  clientIds[nome] = data.id;
}

// dependentes (o dependente também é um client demo)
for (const [titular, depNome, tipo] of [
  ["Carolina Mota Demo", "Miguel Mota Demo", "filho"],
  ["Conceição Ferreira Demo", "Antônio Ferreira Demo", "conjuge"],
]) {
  const { data: dep } = await s
    .from("clients")
    .insert({ nome: depNome, consultor_id: ownerId, is_demo: true })
    .select("id")
    .single();
  await s.from("client_relations").insert({
    client_id: clientIds[titular],
    related_client_id: dep.id,
    tipo,
  });
}

// documentos de identidade: 1 vencendo em 20 dias (alerta), 1 saudável
await s.from("identity_documents").insert([
  {
    client_id: clientIds["Júlia Andrade Demo"],
    tipo: "Passaporte",
    numero: "FD123456",
    validade: dateOnly(20),
  },
  {
    client_id: clientIds["Bruno Farias Demo"],
    tipo: "Passaporte",
    numero: "FD654321",
    validade: dateOnly(700),
  },
]);
console.log("6 clientes + 2 dependentes + doc vencendo em 20d");

// --- 8 processos ------------------------------------------------------------

const caseIds = [];
const CASES = [
  ["Bruno Farias Demo", st500, "ativo", "alta"],
  ["Carolina Mota Demo", st485, "ativo", "media"],
  ["Júlia Andrade Demo", st482, "ativo", "alta"],
  ["Conceição Ferreira Demo", st500, "ativo", "media"],
  ["Patrick O'Neill Demo", st485, "pausado", "baixa"],
  ["Helena Vasconcelos Demo", st482, "ativo", "media"],
  ["Júlia Andrade Demo", st500, "concluido", "media"],
  ["Bruno Farias Demo", st485, "ativo", "baixa"],
];
for (const [cliente, stId, status, prioridade] of CASES) {
  const { data: stages } = await s
    .from("case_stages")
    .select("id")
    .eq("service_type_id", stId)
    .order("ordem")
    .limit(2);
  const { data, error } = await s
    .from("cases")
    .insert({
      client_id: clientIds[cliente],
      service_type_id: stId,
      consultor_id: ownerId,
      status,
      prioridade,
      etapa_id: stages?.[Math.min(1, (stages?.length ?? 1) - 1)]?.id ?? null,
      is_demo: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`case ${cliente}: ${error.message}`);
  caseIds.push(data.id);
}
console.log("8 processos (500/485/482, etapas variadas)");

// --- 10 tarefas -------------------------------------------------------------

const TASKS = [
  ["Revisar police check do Bruno (demo)", -5, "pendente", "alta"],
  ["Conferir tradução juramentada (demo)", -2, "em_andamento", "alta"],
  ["Enviar checklist para Carolina (demo)", 0, "pendente", "media"],
  ["Agendar follow-up com Júlia (demo)", 0, "pendente", "media"],
  ["Preparar lodgement 482 (demo)", 2, "pendente", "alta"],
  ["Cobrar OSHC da Conceição (demo)", 3, "pendente", "media"],
  ["Revisar statement do Patrick (demo)", 5, "pendente", "baixa"],
  ["Atualizar CoE da Helena (demo)", 7, "pendente", "media"],
  ["Arquivar processo concluído (demo)", 10, "pendente", "baixa"],
  ["Auditoria mensal de prazos (demo)", -1, "concluida", "media"],
];
for (const [titulo, prazoOffset, status, prioridade] of TASKS) {
  await s.from("tasks").insert({
    titulo,
    responsavel: ownerId,
    criado_por: ownerId,
    prazo: dateOnly(prazoOffset),
    status,
    prioridade,
    client_id: clientIds["Bruno Farias Demo"],
    is_demo: true,
  });
}
console.log("10 tarefas (2 vencidas, 2 de hoje, futuras, 1 concluída)");

// --- 6 compromissos na semana corrente --------------------------------------

const APPOINTMENTS = [
  ["Consulta inicial — Marina (demo)", "consulta", -1, 22],
  ["Follow-up Bruno 500 (demo)", "follow-up", 0, 23],
  ["Revisão de documentos — Carolina (demo)", "revisão", 0, 4],
  ["Consulta 482 — Júlia (demo)", "consulta", 1, 0],
  ["Alinhamento Conceição (demo)", "follow-up", 2, 5],
  ["Consulta inicial — Rafael (demo)", "consulta", 3, 23],
];
for (const [titulo, tipo, dayOffset, hourUtc] of APPOINTMENTS) {
  await s.from("appointments").insert({
    titulo,
    tipo,
    responsavel: ownerId,
    client_id: clientIds["Bruno Farias Demo"],
    inicio: iso(dayOffset, hourUtc),
    fim: iso(dayOffset, hourUtc + 1),
    is_demo: true,
  });
}
console.log("6 compromissos na semana (inclui horários perto da virada do dia em Sydney)");

// --- 3 guias + 5 templates --------------------------------------------------

for (const [titulo, conteudo] of [
  ["[DEMO] Procedimento Subclass 500", "1. Coletar documentos.\n2. Preparar GTE.\n3. Lodgement."],
  ["[DEMO] Police Check AFP", "Passo a passo do AFP National Police Check para 485."],
  ["[DEMO] Checklist de lodgement", "Conferência final antes de submeter qualquer processo."],
]) {
  await s.from("guides").insert({ titulo, conteudo, is_demo: true });
}

for (const [nome, canal, idioma, corpo] of [
  ["[DEMO] Boas-vindas", "email", "pt", "Olá {{nome_cliente}}, bem-vindo(a) à KMP! Sua consultora é {{consultor}}."],
  ["[DEMO] Welcome", "email", "en", "Hi {{nome_cliente}}, welcome to KMP! Your consultant is {{consultor}}."],
  ["[DEMO] Lembrete de documentos", "whatsapp", "pt", "Oi {{nome_cliente}}! Faltam {{qtd_documentos}} documentos no seu checklist."],
  ["[DEMO] Confirmação de consulta", "whatsapp", "pt", "{{nome_cliente}}, sua consulta é {{data_consulta}} ({{fuso}})."],
  ["[DEMO] Visa granted", "email", "en", "Congratulations {{nome_cliente}}! Your {{subclasse}} visa has been granted."],
]) {
  await s.from("message_templates").insert({ nome, canal, idioma, corpo, is_demo: true });
}
console.log("3 guias + 5 templates");

console.log("\nSeed de demonstração concluído. Remoção: node scripts/clean-demo.mjs");
