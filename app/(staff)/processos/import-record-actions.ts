"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { mapRecordTo600 } from "@/lib/record-of-responses/map-600";
import { salvarRespostasEmBlocos } from "@/lib/case-forms/save";
import {
  getCaseFormTemplateForCase,
  getCaseFormSteps,
  getCaseFormFields,
} from "@/lib/case-forms/data";

const MAX_BYTES = 10 * 1024 * 1024;

function voltar(caseId: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/processos/${caseId}?${qs}`);
}

/**
 * Preenche o formulário de dados do processo a partir do "Record of
 * Responses" (PDF do ImmiAccount) de uma aplicação anterior do cliente.
 *
 * - Só roda o PDF no servidor; o arquivo NÃO é guardado, só as respostas.
 * - Só preenche campos que ainda estão vazios — nunca sobrescreve o que o
 *   cliente ou a equipe já respondeu.
 * - As permissões são as do próprio formulário (RLS em case_forms e
 *   case_form_responses): quem não pode editar este processo não grava nada.
 */
export async function importPreviousApplication(caseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) voltar(caseId, { importErro: "Sessão expirada. Entre de novo." });

  const arquivo = formData.get("pdf");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    voltar(caseId, { importErro: "Escolha o arquivo PDF da aplicação anterior." });
  }
  if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
    voltar(caseId, { importErro: "O arquivo precisa ser um PDF." });
  }
  if (arquivo.size > MAX_BYTES) {
    voltar(caseId, { importErro: "O PDF passa de 10 MB." });
  }

  let texto: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await arquivo.arrayBuffer()));
    const extraido = await extractText(pdf, { mergePages: false });
    texto = extraido.text.join("\n");
  } catch {
    voltar(caseId, { importErro: "Não consegui ler esse PDF." });
  }
  if (!texto.includes("Record of") || !texto.includes("Responses")) {
    voltar(caseId, {
      importErro: 'Esse PDF não parece ser o "Record of Responses" do ImmiAccount.',
    });
  }

  const template = await getCaseFormTemplateForCase(caseId);
  if (!template) voltar(caseId, { importErro: "Este processo não tem formulário de dados." });

  // rótulo do campo no Hub -> id do campo, só dos campos que o modelo tem
  const steps = await getCaseFormSteps(template.id);
  const porRotulo = new Map<string, string>();
  for (const step of steps) {
    for (const field of await getCaseFormFields(step.id)) porRotulo.set(field.label, field.id);
  }

  const { campos, avisos } = mapRecordTo600(texto);

  // formulário do processo (cria se o cliente ainda não abriu)
  let caseFormId: string | null = null;
  const { data: existente } = await supabase
    .from("case_forms")
    .select("id")
    .eq("case_id", caseId)
    .eq("template_id", template.id)
    .maybeSingle();
  if (existente) {
    caseFormId = existente.id as string;
  } else {
    const { data: criado, error } = await supabase
      .from("case_forms")
      .insert({ case_id: caseId, template_id: template.id, status: "em_preenchimento" })
      .select("id")
      .single();
    if (error || !criado) {
      voltar(caseId, { importErro: "Sem permissão para preencher o formulário deste processo." });
    }
    caseFormId = criado.id as string;
  }

  const { data: jaRespondidos } = await supabase
    .from("case_form_responses")
    .select("field_id, valor")
    .eq("case_form_id", caseFormId);
  const preenchidos = new Set(
    (jaRespondidos ?? []).filter((r) => r.valor && String(r.valor).trim()).map((r) => r.field_id),
  );

  const linhas: { case_form_id: string; field_id: string; valor: string }[] = [];
  let mantidos = 0;
  for (const [rotulo, valor] of Object.entries(campos)) {
    const fieldId = porRotulo.get(rotulo);
    if (!fieldId) continue;
    if (preenchidos.has(fieldId)) {
      mantidos++;
      continue;
    }
    linhas.push({ case_form_id: caseFormId, field_id: fieldId, valor });
  }

  const r = await salvarRespostasEmBlocos(supabase, linhas);
  const gravados = r.gravados;
  if (r.erro) {
    // só código e mensagem — "details" pode trazer valores digitados
    console.error("[importPreviousApplication] upsert falhou:", r.erro.code, r.erro.message);
    const tempo = r.erro.code === "57014";
    const rede = /fetch failed|ECONN|ENOTFOUND/i.test(r.erro.message);
    revalidatePath(`/processos/${caseId}`);
    voltar(caseId, {
      importados: String(gravados),
      mantidos: String(mantidos),
      importErro: `${
        tempo
          ? "O banco demorou demais para responder"
          : rede
            ? "A conexão com o banco falhou"
            : "Não consegui gravar as respostas"
      }. ${gravados} de ${linhas.length} campos foram gravados — clique em Importar de novo para completar (o que já está gravado é mantido).`,
    });
  }

  revalidatePath(`/processos/${caseId}`);
  voltar(caseId, {
    importados: String(gravados),
    mantidos: String(mantidos),
    ...(avisos.length > 0 ? { avisos: avisos.join(" | ") } : {}),
  });
}
