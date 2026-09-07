import {
  login,
  logout,
  getValidSession,
  getConversations,
  getMessages,
  getTemplates,
  createTemplate,
  importConversations,
  updateConversationEtapa,
  recordIncomingMessage,
  recordOutgoingMessage,
} from "./lib/supabase-rest.js";

// Painel lateral abre ao clicar no ícone da extensão (em vez de um popup).
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

// Guarda o id da aba do WhatsApp Web mais recente que se anunciou — é pra
// lá que o painel lateral manda pedidos de "enviar mensagem".
let whatsappTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ ok: false, error: err.message ?? String(err) });
  });
  return true; // resposta assíncrona
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case "WA_READY": {
      whatsappTabId = sender.tab?.id ?? null;
      return { ok: true };
    }

    case "WA_INCOMING_MESSAGE": {
      // Relatado pelo content script — mensagem nova detectada na conversa
      // atualmente aberta no WhatsApp Web.
      await recordIncomingMessage({
        telefone: message.telefone,
        nomeContato: message.nomeContato,
        conteudo: message.conteudo,
        tipo: message.tipo ?? "texto",
      });
      return { ok: true };
    }

    case "LOGIN": {
      await login(message.email, message.password);
      return { ok: true };
    }

    case "LOGOUT": {
      await logout();
      return { ok: true };
    }

    case "GET_SESSION": {
      const session = await getValidSession();
      return { ok: true, session: session ? { email: session.email } : null };
    }

    case "GET_CONVERSATIONS": {
      const conversations = await getConversations();
      return { ok: true, conversations };
    }

    case "GET_MESSAGES": {
      const messages = await getMessages(message.conversationId);
      return { ok: true, messages };
    }

    case "GET_TEMPLATES": {
      const templates = await getTemplates();
      return { ok: true, templates };
    }

    case "CREATE_TEMPLATE": {
      const template = await createTemplate({
        nome: message.nome,
        tipo: message.tipo,
        conteudo: message.conteudo,
      });
      return { ok: true, template };
    }

    case "IMPORT_CONVERSATIONS": {
      const result = await importConversations(message.nomes ?? []);
      return { ok: true, ...result };
    }

    case "UPDATE_ETAPA": {
      await updateConversationEtapa(message.conversationId, message.etapa);
      return { ok: true };
    }

    case "SEND_MESSAGE": {
      if (!whatsappTabId) {
        throw new Error(
          "Nenhuma aba do WhatsApp Web encontrada — abra web.whatsapp.com numa aba antes de enviar.",
        );
      }
      const result = await chrome.tabs.sendMessage(whatsappTabId, {
        type: "WA_SEND",
        telefone: message.telefone,
        conteudo: message.conteudo,
      });
      if (!result?.ok) {
        throw new Error(result?.error ?? "Falha ao enviar pelo WhatsApp Web.");
      }
      await recordOutgoingMessage({
        conversationId: message.conversationId,
        conteudo: message.conteudo,
        tipo: "texto",
      });
      return { ok: true };
    }

    default:
      throw new Error(`Mensagem desconhecida: ${message.type}`);
  }
}
