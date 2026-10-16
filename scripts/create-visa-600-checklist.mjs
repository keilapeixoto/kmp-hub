// KMP Hub · Checklist de documentos do Visto de Turista (Subclass 600).
// O tipo de serviço 600 tinha formulário de coleta mas nenhum checklist, então
// o cliente não tinha onde enviar cada documento pelo portal. Itens tirados do
// formulário avulso (HTML + Web3Forms) que a Keila mandava antes.
//
// Simulação (não grava nada):  node --env-file=.env.local scripts/create-visa-600-checklist.mjs
// Gravar:                      node --env-file=.env.local scripts/create-visa-600-checklist.mjs --apply
//
// Idempotente: se o tipo 600 já tiver checklist, não faz nada.

import { createClient } from "@supabase/supabase-js";

const NOME = "Checklist Visto de Turista (Subclass 600)";

const ITENS = [
  { nome: "Passaporte (página de dados)", descricao: "Cópia legível da página com foto e dados." },
  {
    nome: "Comprovante de renda ou holerite",
    descricao: "Do solicitante ou do sponsor (parente de primeiro grau).",
  },
  {
    nome: "Extrato bancário dos últimos 3 meses",
    descricao: "Do solicitante ou do sponsor (parente de primeiro grau). Holerite também é aceito.",
  },
  { nome: "Comprovante de vínculo (trabalho ou estudo)", descricao: "Declaração da empresa, contrato, matrícula." },
  { nome: "Comprovante de endereço", descricao: "Conta recente em nome do solicitante ou da família." },
  {
    nome: "Certidão de casamento",
    descricao: "Só se o nome mudou por casamento ou divórcio.",
    obrigatorio: false,
    condicional: true,
  },
  {
    nome: "Certidão de divórcio",
    descricao: "Só se o nome mudou por casamento ou divórcio.",
    obrigatorio: false,
    condicional: true,
  },
  {
    nome: "Comprovação de abertura da empresa",
    descricao: "Para autônomo ou empresário: CNPJ, contrato social ou MEI.",
    obrigatorio: false,
    condicional: true,
  },
  {
    nome: "Passaporte e visto de quem convida na Austrália",
    descricao: "Só se houver carta convite.",
    obrigatorio: false,
    condicional: true,
  },
  { nome: "Itinerário de viagem", descricao: "Se já houver.", obrigatorio: false },
];

const aplicar = process.argv.includes("--apply");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: tipos, error } = await supabase
  .from("service_types")
  .select("id, nome, checklist_template_id")
  .ilike("nome", "%600%");
if (error) throw error;
if (!tipos?.length) {
  console.error("Nenhum tipo de serviço com 600 no nome.");
  process.exit(1);
}
if (tipos.length > 1) {
  console.error("Mais de um tipo de serviço com 600 no nome:", tipos.map((t) => t.nome));
  process.exit(1);
}
const tipo = tipos[0];
if (tipo.checklist_template_id) {
  console.log(`"${tipo.nome}" já tem checklist. Nada a fazer.`);
  process.exit(0);
}

console.log(`Tipo de serviço: ${tipo.nome}`);
console.log(`Checklist novo: ${NOME} (${ITENS.length} itens)`);
for (const [i, item] of ITENS.entries()) {
  console.log(`  ${i + 1}. ${item.nome}${item.obrigatorio === false ? " (opcional)" : ""}`);
}
if (!aplicar) {
  console.log("\nSimulação. Rode com --apply para gravar.");
  process.exit(0);
}

const { data: modelo, error: e1 } = await supabase
  .from("checklist_templates")
  .insert({ service_type_id: tipo.id, nome: NOME })
  .select("id")
  .single();
if (e1) throw e1;

const { error: e2 } = await supabase.from("checklist_template_items").insert(
  ITENS.map((item, i) => ({
    checklist_template_id: modelo.id,
    ordem: i + 1,
    nome: item.nome,
    descricao: item.descricao,
    obrigatorio: item.obrigatorio ?? true,
    condicional: item.condicional ?? false,
  })),
);
if (e2) throw e2;

const { error: e3 } = await supabase
  .from("service_types")
  .update({ checklist_template_id: modelo.id })
  .eq("id", tipo.id);
if (e3) throw e3;

console.log("\nGravado. Processos 600 novos já nascem com este checklist.");
