"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { camposParaAtualizar } from "@/lib/clients/update-fields";
import { portalUrl } from "@/lib/dominios";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId, getCurrentUserProfile, getCurrentUserRole } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/google/connections";
import { sendGmailRaw } from "@/lib/google/gmail";
import { htmlDaAssinatura } from "@/lib/email/assinatura";
import { getMinhaAssinatura } from "@/lib/email/dados";
import { montarMensagem, type AnexoDoEmail } from "@/lib/email/mime";
import { textoParaHtml } from "@/lib/email/variaveis";
import { conferirArquivosEnviados } from "@/lib/documents/conferir-envio";
import type { ArquivoEnviado, RegistroState } from "@/lib/portal/arquivos";

export type ClientFormState = {
  error: string | null;
};

const TEXT_FIELDS = [
  "nome",
  "data_nascimento",
  "nacionalidade",
  "telefone",
  "email",
  "rede_social",
  "pais",
  "cidade",
  "fuso_horario",
  "idioma_preferencial",
  "situacao",
  "objetivos",
  "consultor_id",
  "visto_atual_subclasse",
  "visto_atual_validade",
  "visto_alerta_limite_dias",
] as const;

function readClientFields(formData: FormData) {
  const fields: Record<string, string | null> = {};

  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    fields[key] =
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }

  return fields;
}

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const fields = readClientFields(formData);

  if (!fields.nome) {
    return { error: "Informe o nome do cliente." };
  }

  const insertData: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) insertData[key] = value;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        "Não foi possível cadastrar o cliente. Confira os campos e tente de novo.",
    };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateClientRecord(
  id: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const fields = readClientFields(formData);

  if (!fields.nome) {
    return { error: "Informe o nome do cliente." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sua sessão expirou. Entre de novo." };

  const { error } = await supabase
    .from("clients")
    .update(
      camposParaAtualizar(fields, {
        usuarioId: auth.user.id,
        consultorNoFormulario: formData.has("consultor_id"),
      }),
    )
    .eq("id", id);

  if (error) {
    console.error("[updateClientRecord] falhou:", error.code, error.message);
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function addDependent(clientId: string, formData: FormData) {
  const nome = formData.get("nome");
  const tipo = formData.get("tipo");

  if (typeof nome !== "string" || !nome.trim()) return;
  if (typeof tipo !== "string" || !tipo.trim()) return;

  const supabase = await createClient();
  await supabase.rpc("add_client_dependent", {
    p_client_id: clientId,
    p_nome: nome.trim(),
    p_tipo: tipo,
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function removeDependent(clientId: string, relationId: string) {
  const supabase = await createClient();
  await supabase.from("client_relations").delete().eq("id", relationId);
  revalidatePath(`/clientes/${clientId}`);
}

export async function addIdentityDocument(clientId: string, formData: FormData) {
  const tipo = formData.get("tipo");
  const numero = formData.get("numero");
  const validade = formData.get("validade");

  if (typeof tipo !== "string" || !tipo.trim()) return;

  const supabase = await createClient();
  await supabase.from("identity_documents").insert({
    client_id: clientId,
    tipo: tipo.trim(),
    numero: typeof numero === "string" && numero.trim() ? numero.trim() : null,
    validade:
      typeof validade === "string" && validade.trim() ? validade.trim() : null,
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function archiveIdentityDocument(
  clientId: string,
  documentId: string,
) {
  const supabase = await createClient();
  await supabase
    .from("identity_documents")
    .update({ arquivado: true })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}

export type InvitePortalState = { error: string | null; success: boolean };

/**
 * Convida o cliente para o portal (Fase 2 antecipada): cria/recupera o
 * usuário no Auth via API admin (secret key, só aqui) e vincula em
 * client_access. O login em si é sempre por magic link — nunca criamos
 * senha para cliente.
 */
export async function inviteClientToPortal(
  clientId: string,
  _prevState: InvitePortalState,
): Promise<InvitePortalState> {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    return { error: "Só admin ou diretor pode convidar clientes.", success: false };
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, email, nome")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.email) {
    return {
      error: "Cadastre um e-mail para o cliente antes de convidar.",
      success: false,
    };
  }

  const { data: existingAccess } = await supabase
    .from("client_access")
    .select("id")
    .eq("client_id", clientId)
    .not("client_user_id", "is", null)
    .maybeSingle();

  if (existingAccess) {
    return { error: "Este cliente já tem acesso ao portal.", success: false };
  }

  const admin = createAdminClient();
  const redirectTo = `${portalUrl()}/auth/confirm?next=/portal`;

  let userId: string | null = null;
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(client.email, {
      data: { nome: client.nome },
      redirectTo,
    });

  if (invited?.user) {
    userId = invited.user.id;
  } else if (inviteError) {
    const { data: existing } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    const match = existing?.users.find(
      (u) => u.email?.toLowerCase() === client.email!.toLowerCase(),
    );
    if (!match) {
      return {
        error: "Não foi possível convidar este e-mail. Confira e tente de novo.",
        success: false,
      };
    }
    userId = match.id;
  }

  if (!userId) {
    return { error: "Não foi possível convidar este cliente.", success: false };
  }

  const { error: accessError } = await supabase
    .from("client_access")
    .insert({ client_id: clientId, client_user_id: userId });

  if (accessError) {
    return {
      error: "Convite enviado, mas o acesso não pôde ser vinculado.",
      success: false,
    };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { error: null, success: true };
}

/** Tira o acesso de uma conta ao portal deste cliente (a conta continua existindo). */
export async function removerAcessoAoPortal(clientId: string, accessId: string): Promise<{ error: string | null }> {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") return { error: "Só admin ou diretor pode mudar o acesso ao portal." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_access")
    .delete()
    .eq("id", accessId)
    .eq("client_id", clientId)
    .select("id");
  if (error || !data?.length) {
    console.error("[removerAcessoAoPortal]", error?.code, error?.message);
    return { error: "Não foi possível remover o acesso." };
  }
  revalidatePath(`/clientes/${clientId}`);
  return { error: null };
}

export async function renameClientFile(
  clientId: string,
  documentId: string,
  formData: FormData,
) {
  const nome = formData.get("nome");
  if (typeof nome !== "string" || !nome.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ nome: nome.trim() })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}

export async function archiveClientFile(clientId: string, documentId: string) {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ arquivado: true })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}

export async function updateClientFilePasta(
  clientId: string,
  documentId: string,
  formData: FormData,
) {
  const pasta = formData.get("pasta");
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ pasta: typeof pasta === "string" && pasta.trim() ? pasta.trim() : null })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}

export async function updateClientFileStatusRevisao(
  clientId: string,
  documentId: string,
  formData: FormData,
) {
  const status = formData.get("status_revisao");
  if (typeof status !== "string" || !status.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ status_revisao: status })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}

export type SendEmailState = {
  error: string | null;
  sent: boolean;
};

/** Limite do total de anexos (o Gmail aceita até 25 MB por e-mail). */
const LIMITE_ANEXOS_BYTES = 20 * 1024 * 1024;

/**
 * Manda e-mail ao cliente pelo Gmail de quem está logado (conta Google
 * conectada em /configuracoes/integracoes): texto do template ou digitado,
 * anexos fixos do template e/ou documentos do cliente, e a assinatura da
 * pessoa no fim. Diferente do Resend (avisos automáticos do sistema,
 * lib/storage-admin/email.ts).
 *
 * Os anexos são conferidos com a sessão (o RLS decide se a pessoa enxerga o
 * documento e o anexo do template); só depois o arquivo é baixado pelo
 * cliente admin, porque os buckets são privados.
 */
export async function enviarEmailAoCliente(
  clientId: string,
  _prevState: SendEmailState,
  formData: FormData,
): Promise<SendEmailState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const anexosTemplate = formData.getAll("anexo_template").map(String).filter(Boolean);
  const anexosCliente = formData.getAll("anexo_documento").map(String).filter(Boolean);
  const comAssinatura = formData.get("assinatura") === "on";

  if (!subject) return { error: "Escreva o assunto.", sent: false };
  if (!body) return { error: "Escreva a mensagem.", sent: false };

  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clients").select("id, email").eq("id", clientId).maybeSingle();
  if (!cliente) return { error: "Cliente não encontrado.", sent: false };
  if (!cliente.email) return { error: "Sem e-mail do cliente cadastrado.", sent: false };

  const userId = await getCurrentUserId();
  if (!userId) return { error: "Sessão expirada — entre de novo.", sent: false };
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { error: "Conecte sua conta Google em Configurações → Integrações primeiro.", sent: false };
  }

  // Anexos: só o que a sessão enxerga.
  const [{ data: doTemplate }, { data: doCliente }] = await Promise.all([
    anexosTemplate.length
      ? supabase.from("message_template_attachments").select("nome, storage_path, content_type, tamanho").in("id", anexosTemplate)
      : Promise.resolve({ data: [] as { nome: string; storage_path: string; content_type: string | null; tamanho: number }[] }),
    anexosCliente.length
      ? supabase
          .from("documents")
          .select("nome, storage_path, formato, tamanho_bytes")
          .eq("client_id", clientId)
          .eq("arquivado", false)
          .in("id", anexosCliente)
      : Promise.resolve({ data: [] as { nome: string | null; storage_path: string; formato: string | null; tamanho_bytes: number | null }[] }),
  ]);
  const lista = [
    ...(doTemplate ?? []).map((a) => ({ bucket: "email-anexos", caminho: a.storage_path as string, nome: a.nome as string, tipo: (a.content_type as string | null) ?? "", tamanho: Number(a.tamanho ?? 0) })),
    ...(doCliente ?? []).map((d) => ({ bucket: "documents", caminho: d.storage_path as string, nome: ((d.nome as string | null) ?? (d.storage_path as string).split("/").pop()) as string, tipo: (d.formato as string | null) ?? "", tamanho: Number(d.tamanho_bytes ?? 0) })),
  ];
  if (lista.length !== anexosTemplate.length + anexosCliente.length) {
    return { error: "Algum anexo não está mais disponível. Recarregue a página.", sent: false };
  }
  if (lista.reduce((t, a) => t + a.tamanho, 0) > LIMITE_ANEXOS_BYTES) {
    return { error: "Os anexos passam de 20 MB juntos. Tire algum e envie em outro e-mail.", sent: false };
  }

  const admin = createAdminClient();
  const anexos: AnexoDoEmail[] = [];
  for (const a of lista) {
    const { data: arquivo, error } = await admin.storage.from(a.bucket).download(a.caminho);
    if (error || !arquivo) return { error: `Não foi possível ler o anexo "${a.nome}".`, sent: false };
    anexos.push({ nome: a.nome, contentType: a.tipo || arquivo.type || "application/octet-stream", conteudo: Buffer.from(await arquivo.arrayBuffer()) });
  }
  if (anexos.reduce((t, a) => t + a.conteudo.length, 0) > LIMITE_ANEXOS_BYTES) {
    return { error: "Os anexos passam de 20 MB juntos. Tire algum e envie em outro e-mail.", sent: false };
  }

  const perfil = await getCurrentUserProfile();
  const assinatura = comAssinatura ? htmlDaAssinatura(await getMinhaAssinatura(userId, perfil?.nome ?? "")) : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#161814;">${textoParaHtml(body)}${assinatura}</div>`;

  const result = await sendGmailRaw(accessToken, montarMensagem({ to: cliente.email, subject, html, anexos }));
  if (!result.ok) return { error: result.error ?? "Não foi possível enviar.", sent: false };

  // Registro na linha do tempo do cliente (falhar aqui não desfaz o envio).
  const { error: erroLinha } = await supabase.from("timeline_events").insert({
    entidade: "client",
    entidade_id: clientId,
    tipo: "email_enviado",
    descricao: `E-mail enviado: ${subject}${anexos.length ? ` (${anexos.length} ${anexos.length === 1 ? "anexo" : "anexos"})` : ""}`,
  });
  if (erroLinha) console.error("[enviarEmailAoCliente] linha do tempo:", erroLinha.code, erroLinha.message);

  revalidatePath(`/clientes/${clientId}`);
  return { error: null, sent: true };
}

/**
 * Registra arquivos que o navegador já subiu direto para a pasta do cliente
 * no Storage (vários de uma vez, sem o limite do Server Action). A gravação
 * em `documents` usa a sessão de quem está logado — o RLS decide se pode.
 */
export async function registrarArquivosDoCliente(
  clientId: string,
  caseId: string | null,
  arquivos: ArquivoEnviado[],
  categoriaId: string | null,
  descricao: string | null = null,
): Promise<RegistroState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo.", enviados: 0 };

  const conferencia = await conferirArquivosEnviados(clientId, caseId ?? "geral", arquivos, descricao);
  if (!conferencia.ok) return { error: conferencia.error, enviados: 0 };

  const { error } = await supabase.from("documents").insert(
    conferencia.arquivos.map((a) => ({
      ...a,
      client_id: clientId,
      case_id: caseId,
      enviado_por: user.id,
      categoria_id: categoriaId || null,
    })),
  );
  if (error) {
    console.error("[registrarArquivosDoCliente] falhou:", error.code, error.message);
    return { error: "Os arquivos subiram, mas não conseguimos registrá-los. Tente de novo.", enviados: 0 };
  }
  revalidatePath(`/clientes/${clientId}`);
  return { error: null, enviados: conferencia.arquivos.length };
}

/** Tira o documento de "Arquivados" (só admin enxerga arquivados — RLS). */
export async function restoreClientFile(clientId: string, documentId: string) {
  const supabase = await createClient();
  await supabase.from("documents").update({ arquivado: false }).eq("id", documentId);
  revalidatePath(`/clientes/${clientId}`);
}

/**
 * Exclusão definitiva (pedido da Keila, out/2026): só admin e só de um
 * documento que já está em Arquivados. Apaga o arquivo do Storage e a linha
 * de `documents` (o trigger de auditoria guarda o registro da exclusão).
 */
export async function deleteClientFilePermanently(clientId: string, documentId: string) {
  const role = await getCurrentUserRole();
  if (role !== "admin") return;

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path, arquivado")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc || !doc.arquivado) return;

  const admin = createAdminClient();
  // versões antigas também têm arquivo próprio no Storage
  const { data: versoes } = await admin.from("document_versions").select("storage_path").eq("document_id", documentId);
  const caminhos = [...new Set([doc.storage_path, ...(versoes ?? []).map((v) => v.storage_path as string)])];
  const { error: storageError } = await admin.storage.from("documents").remove(caminhos);
  if (storageError) {
    console.error("[deleteClientFilePermanently] storage falhou:", storageError.message);
    return;
  }
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) console.error("[deleteClientFilePermanently] registro falhou:", error.code, error.message);
  revalidatePath(`/clientes/${clientId}`);
}

// ---------------------------------------------------------------------------
// Notas internas da equipe (client_notes) — nunca aparecem no portal. Tudo
// com a sessão de quem está logado: o RLS decide quem lê, escreve e exclui.
// ---------------------------------------------------------------------------

export type ClientNoteState = { error: string | null; ok: boolean };

export async function addClientNote(
  clientId: string,
  _prev: ClientNoteState,
  formData: FormData,
): Promise<ClientNoteState> {
  const texto = formData.get("texto");
  if (typeof texto !== "string" || !texto.trim()) {
    return { error: "Escreva a nota antes de salvar.", ok: false };
  }
  if (texto.trim().length > 4000) {
    return { error: "A nota passou de 4.000 caracteres.", ok: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, texto: texto.trim() });
  if (error) {
    console.error("[addClientNote]", error.code, error.message);
    return {
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? "As notas ainda não foram ativadas no banco (migração 20261016140000)."
          : "Não foi possível salvar a nota.",
      ok: false,
    };
  }
  revalidatePath(`/clientes/${clientId}`);
  return { error: null, ok: true };
}

export async function deleteClientNote(clientId: string, noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) console.error("[deleteClientNote]", error.code, error.message);
  revalidatePath(`/clientes/${clientId}`);
}
