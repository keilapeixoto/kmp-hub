// Cliente REST mínimo pro Supabase — sem SDK, mesmo padrão do resto do Hub
// (lib/storage-admin/email.ts, lib/documents/classification.ts): fetch
// direto, porque uma extensão MV3 sem bundler não importa facilmente o
// pacote @supabase/supabase-js do npm.
//
// Config (URL + chave publicável) fica em chrome.storage.local, preenchida
// pela página de opções — ver options.html/options.js. As duas são públicas
// (mesmas expostas no navegador do Hub via NEXT_PUBLIC_*), não são segredo.

const STORAGE_KEYS = {
  config: "kmp_wa_config", // { supabaseUrl, supabaseAnonKey }
  session: "kmp_wa_session", // { access_token, refresh_token, expires_at }
};

export async function getConfig() {
  const { [STORAGE_KEYS.config]: config } = await chrome.storage.local.get(
    STORAGE_KEYS.config,
  );
  return config ?? null;
}

export async function setConfig(config) {
  await chrome.storage.local.set({ [STORAGE_KEYS.config]: config });
}

async function getSession() {
  const { [STORAGE_KEYS.session]: session } = await chrome.storage.local.get(
    STORAGE_KEYS.session,
  );
  return session ?? null;
}

async function setSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEYS.session]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(STORAGE_KEYS.session);
}

export async function login(email, password) {
  const config = await getConfig();
  if (!config) throw new Error("Configure a URL e a chave do Supabase na página de opções primeiro.");

  const res = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error_description ?? body.msg ?? `Login falhou (${res.status})`);
  }

  const data = await res.json();
  await setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    email,
  });
  return true;
}

async function refreshSession() {
  const config = await getConfig();
  const session = await getSession();
  if (!config || !session?.refresh_token) return null;

  const res = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!res.ok) {
    await clearSession();
    return null;
  }

  const data = await res.json();
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    email: session.email,
  };
  await setSession(next);
  return next;
}

/** Sessão válida (renova sozinha se estiver perto de expirar) ou null se precisa logar de novo. */
export async function getValidSession() {
  const session = await getSession();
  if (!session) return null;
  if (session.expires_at - Date.now() < 60_000) {
    return refreshSession();
  }
  return session;
}

export async function logout() {
  await clearSession();
}

async function authedFetch(path, options = {}) {
  const config = await getConfig();
  const session = await getValidSession();
  if (!config) throw new Error("Configuração do Supabase ausente.");
  if (!session) throw new Error("Não autenticado — faça login novamente.");

  const res = await fetch(`${config.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase respondeu ${res.status}: ${body}`);
  }

  if (res.status === 204) return null;
  // POST com "Prefer: return=minimal" volta 201 com corpo vazio — .json()
  // direto quebraria nesse caso.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getConversations() {
  return authedFetch(
    "/rest/v1/whatsapp_conversations?select=*&order=ultima_mensagem_em.desc.nullslast",
  );
}

export async function getMessages(conversationId) {
  return authedFetch(
    `/rest/v1/whatsapp_messages?conversation_id=eq.${conversationId}&order=created_at.asc`,
  );
}

export async function findConversationByPhone(telefone) {
  const rows = await authedFetch(
    `/rest/v1/whatsapp_conversations?telefone=eq.${encodeURIComponent(telefone)}&limit=1`,
  );
  return rows?.[0] ?? null;
}

export async function createConversation({ telefone, nomeContato }) {
  const rows = await authedFetch("/rest/v1/whatsapp_conversations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      telefone,
      nome_contato: nomeContato,
      etapa: "novo_contato",
    }),
  });
  return rows[0];
}

export async function touchConversation(conversationId, { preview, naoLida }) {
  await authedFetch(`/rest/v1/whatsapp_conversations?id=eq.${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({
      ultima_mensagem_em: new Date().toISOString(),
      ultima_mensagem_preview: preview,
      nao_lida: naoLida,
    }),
  });
}

export async function updateConversationEtapa(conversationId, etapa) {
  await authedFetch(`/rest/v1/whatsapp_conversations?id=eq.${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ etapa }),
  });
}

export async function insertMessage({ conversationId, direcao, tipo, conteudo }) {
  const rows = await authedFetch("/rest/v1/whatsapp_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      conversation_id: conversationId,
      direcao,
      tipo: tipo ?? "texto",
      conteudo,
    }),
  });
  return rows[0];
}

export async function getTemplates() {
  return authedFetch("/rest/v1/whatsapp_templates?select=*&order=nome");
}

export async function createTemplate({ nome, tipo, conteudo }) {
  const rows = await authedFetch("/rest/v1/whatsapp_templates", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ nome, tipo: tipo ?? "texto", conteudo }),
  });
  return rows[0];
}

/**
 * Cria uma conversa por nome de contato pra cada um que ainda não existe
 * (comparando pelo campo telefone, que hoje guarda o nome de exibição do
 * WhatsApp — ver limitação conhecida no README). Usado pelo botão "Importar
 * conversas" do Kanban injetado, pra trazer de uma vez os contatos que já
 * existem no WhatsApp Web em vez de esperar mensagem por mensagem.
 */
export async function importConversations(nomes) {
  const existing = await getConversations();
  const existingSet = new Set(existing.map((c) => c.telefone));
  const novos = [...new Set(nomes)].filter((n) => n && !existingSet.has(n));
  if (novos.length === 0) return { imported: 0 };

  await authedFetch("/rest/v1/whatsapp_conversations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      novos.map((nome) => ({ telefone: nome, nome_contato: nome, etapa: "novo_contato" })),
    ),
  });
  return { imported: novos.length };
}

/**
 * Garante que existe uma conversa pro telefone e registra a mensagem
 * recebida, atualizando o resumo/badge de não lida. Usada pelo
 * background quando o content script relata uma mensagem nova.
 */
export async function recordIncomingMessage({ telefone, nomeContato, conteudo, tipo }) {
  let conversation = await findConversationByPhone(telefone);
  if (!conversation) {
    conversation = await createConversation({ telefone, nomeContato });
  }
  await insertMessage({ conversationId: conversation.id, direcao: "recebida", tipo, conteudo });
  await touchConversation(conversation.id, { preview: conteudo, naoLida: true });
  return conversation;
}

export async function recordOutgoingMessage({ conversationId, conteudo, tipo }) {
  await insertMessage({ conversationId, direcao: "enviada", tipo, conteudo });
  await touchConversation(conversationId, { preview: conteudo, naoLida: false });
}
