"use server";

import { portalUrl } from "@/lib/dominios";
import { mensagemErroLink } from "@/lib/portal/erro-link";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";
import { getStorageSettings } from "@/lib/storage-admin/validation";
import { caminhoDoProcesso, extensao, problemaDoArquivo } from "@/lib/portal/arquivos";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusDepoisDoEnvio } from "@/lib/portal/progresso";
import { notifyDocumentUploaded } from "@/lib/case-forms/notify-server";

export type PortalLoginState = { error: string | null; sent: boolean };

export async function requestPortalMagicLink(
  _prevState: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return { error: "Informe seu e-mail.", sent: false };
  }

  // Cliente sem cookies e com fluxo "implicit": o link sai com um token que
  // vale em qualquer aparelho (o fluxo PKCE do cliente com cookies gerava
  // "pkce_..." e só funcionava no mesmo navegador em que foi pedido).
  const supabase = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } },
  );
  const siteUrl = portalUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/portal` },
  });

  if (error) {
    // código e mensagem do Supabase (sem o e-mail digitado)
    console.error("[requestPortalMagicLink] falhou:", error.status, error.code, error.message);
    return { error: mensagemErroLink(error), sent: false };
  }

  return { error: null, sent: true };
}

export type ArquivoEnviado = { caminho: string; nome: string; hash: string | null };
export type RegistroState = { error: string | null; enviados: number };

/**
 * Registra arquivos que o navegador do cliente já subiu direto para o
 * Storage (sem passar pelo limite de 10 MB do Server Action — vários arquivos
 * de até 25 MB). O Storage só aceitou o arquivo porque o RLS dele confere a
 * pasta do cliente; aqui o servidor confere de novo a pasta do processo,
 * formato e tamanho reais (lidos do Storage, não do navegador) e grava em
 * `documents` com a sessão do cliente (RLS de documents_insert_client).
 */
export async function registrarDocumentosPortal(
  clientId: string,
  caseId: string,
  checklistItemId: string | null,
  arquivos: ArquivoEnviado[],
  categoriaId: string | null,
): Promise<RegistroState> {
  if (arquivos.length === 0) return { error: "Selecione um arquivo.", enviados: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo no portal.", enviados: 0 };

  const settings = await getStorageSettings();
  const regras = { extensoes: settings.allowed_extensions, maxBytes: settings.max_file_size_bytes };
  const admin = createAdminClient();

  const linhas = [];
  for (const a of arquivos) {
    if (!caminhoDoProcesso(a.caminho, clientId, caseId)) {
      return { error: "Arquivo fora da pasta do seu processo.", enviados: 0 };
    }
    const pasta = a.caminho.slice(0, a.caminho.lastIndexOf("/"));
    const arquivo = a.caminho.slice(a.caminho.lastIndexOf("/") + 1);
    const { data: lista } = await admin.storage.from(DOCUMENTS_BUCKET).list(pasta, { search: arquivo, limit: 1 });
    const obj = (lista ?? []).find((o) => o.name === arquivo);
    const tamanho = Number((obj?.metadata as { size?: number } | undefined)?.size ?? 0);
    if (!obj) return { error: `${a.nome}: o arquivo não chegou. Tente de novo.`, enviados: 0 };
    const problema = problemaDoArquivo({ nome: a.nome, tamanho }, regras);
    if (problema) {
      await admin.storage.from(DOCUMENTS_BUCKET).remove([a.caminho]);
      return { error: problema, enviados: 0 };
    }
    linhas.push({
      client_id: clientId,
      case_id: caseId,
      checklist_item_id: checklistItemId,
      storage_path: a.caminho,
      enviado_por: user.id,
      nome: a.nome,
      tamanho_bytes: tamanho,
      formato: extensao(a.nome),
      hash_sha256: a.hash,
      categoria_id: categoriaId || null,
    });
  }

  const { error: insertError } = await supabase.from("documents").insert(linhas);
  if (insertError) {
    console.error("[registrarDocumentosPortal] registro falhou:", insertError.code, insertError.message);
    return { error: "Os arquivos subiram, mas não conseguimos registrá-los. Tente de novo.", enviados: 0 };
  }

  // O item do checklist muda de status para a equipe ver que chegou — o
  // cliente não tem UPDATE em checklist_items, então vai pelo admin, só para
  // um item deste mesmo processo.
  const nomeItem = checklistItemId ? await marcarItemComoEnviado(caseId, checklistItemId) : null;
  const nomes = linhas.map((l) => l.nome).join(", ");
  await notifyDocumentUploaded(caseId, nomeItem ? `${nomeItem} (${nomes})` : nomes);

  revalidatePath("/portal/documentos");
  revalidatePath("/portal");
  return { error: null, enviados: linhas.length };
}

async function marcarItemComoEnviado(caseId: string, checklistItemId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: item } = await admin
    .from("checklist_items")
    .select("id, nome, status, checklists!inner(case_id)")
    .eq("id", checklistItemId)
    .eq("checklists.case_id", caseId)
    .maybeSingle();
  if (!item) return null;
  const novo = statusDepoisDoEnvio(item.status as string);
  if (novo) await admin.from("checklist_items").update({ status: novo }).eq("id", item.id);
  return item.nome as string;
}

export async function portalLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
