// Roda dentro da aba do WhatsApp Web (web.whatsapp.com). Lê mensagens novas
// da conversa aberta e manda pro background; recebe pedidos de envio.
//
// AVISO: os seletores abaixo são a melhor aproximação que eu consigo montar
// sem conseguir abrir o WhatsApp Web ao vivo neste ambiente — o WhatsApp muda
// a estrutura da página com frequência. Centralizados aqui em SELECTORS de
// propósito, pra ajustar rápido testando com o DevTools (botão direito →
// Inspecionar num elemento) se algo não funcionar de primeira.
const SELECTORS = {
  // Painel com as mensagens da conversa aberta.
  messagePane: "[data-testid='conversation-panel-messages'], #main .copyable-area",
  // Uma "bolha" de mensagem individual dentro do painel.
  messageBubble: "[data-testid='msg-container'], .message-in, .message-out",
  // Diferencia mensagem recebida de enviada (classe costuma indicar isso).
  outgoingHint: "message-out",
  incomingHint: "message-in",
  // Texto da mensagem dentro da bolha.
  messageText: ".selectable-text.copyable-text, [data-testid='conversation-panel-messages'] span.selectable-text",
  // Nome do contato no cabeçalho da conversa aberta.
  chatHeaderTitle: "header [data-testid='conversation-info-header'] span[title], header ._21S-L span",
  // Caixa de digitar mensagem.
  composeBox: "[data-testid='compose-box-input'], div[contenteditable='true'][data-tab='10']",
  // Botão de enviar.
  sendButton: "[data-testid='send'], button[aria-label='Enviar'], span[data-icon='send']",
};

const seenMessages = new WeakSet();
let currentObserver = null;

function announceReady() {
  chrome.runtime.sendMessage({ type: "WA_READY" }).catch(() => {});
}

function getOpenChatTitle() {
  const el = document.querySelector(SELECTORS.chatHeaderTitle);
  return el?.getAttribute("title") ?? el?.textContent ?? null;
}

function extractMessageText(bubble) {
  const el = bubble.querySelector(SELECTORS.messageText);
  return el?.textContent?.trim() ?? null;
}

function isOutgoing(bubble) {
  return bubble.className?.includes?.(SELECTORS.outgoingHint) ?? false;
}

function handleNewBubble(bubble) {
  if (seenMessages.has(bubble)) return;
  seenMessages.add(bubble);

  // Só relata mensagens recebidas — as enviadas pelo próprio painel da
  // extensão já são registradas no background na hora do envio. Mensagens
  // enviadas direto pelo WhatsApp Web (sem passar pela extensão) não caem
  // aqui ainda — limitação conhecida da primeira versão.
  if (isOutgoing(bubble)) return;

  const conteudo = extractMessageText(bubble);
  if (!conteudo) return;

  const nomeContato = getOpenChatTitle() ?? "Contato desconhecido";
  chrome.runtime
    .sendMessage({
      type: "WA_INCOMING_MESSAGE",
      telefone: nomeContato, // WhatsApp Web nem sempre expõe o número puro no DOM — ver docs/spec-whatsapp.md
      nomeContato,
      conteudo,
      tipo: "texto",
    })
    .catch(() => {});
}

function observeMessagePane() {
  const pane = document.querySelector(SELECTORS.messagePane);
  if (!pane) return;
  if (currentObserver) currentObserver.disconnect();

  // Marca bolhas já existentes como "vistas" pra não relatar histórico
  // antigo como mensagem nova ao abrir a conversa.
  pane.querySelectorAll(SELECTORS.messageBubble).forEach((b) => seenMessages.add(b));

  currentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches?.(SELECTORS.messageBubble)) {
          handleNewBubble(node);
        } else {
          node.querySelectorAll?.(SELECTORS.messageBubble).forEach(handleNewBubble);
        }
      }
    }
  });
  currentObserver.observe(pane, { childList: true, subtree: true });
}

// WhatsApp Web é uma SPA — o painel de mensagens é recriado ao trocar de
// conversa, então observa o corpo da página esperando o painel aparecer/mudar.
const rootObserver = new MutationObserver(() => observeMessagePane());
rootObserver.observe(document.body, { childList: true, subtree: true });
observeMessagePane();
announceReady();

// ---------------------------------------------------------------------------
// Envio — pedido pelo painel lateral via background.
// ---------------------------------------------------------------------------

function onlyDigits(phone) {
  return phone.replace(/\D/g, "");
}

async function waitFor(selector, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

async function sendViaComposeBox(text) {
  const box = await waitFor(SELECTORS.composeBox);
  if (!box) return { ok: false, error: "Caixa de mensagem não encontrada." };

  box.focus();
  // execCommand insertText dispara os eventos que o React do WhatsApp Web
  // espera pra atualizar o estado interno — setar .textContent direto não
  // funciona em campos contenteditable controlados por React.
  document.execCommand("insertText", false, text);

  const sendBtn = await waitFor(SELECTORS.sendButton, 3000);
  if (sendBtn) {
    sendBtn.click();
    return { ok: true };
  }
  // Fallback: Enter no campo de digitação.
  box.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }),
  );
  return { ok: true };
}

async function sendMessage(telefone, conteudo) {
  const digits = onlyDigits(telefone);
  if (digits) {
    // Deep link oficial do WhatsApp pra abrir/criar a conversa com esse
    // número já com o texto preenchido — mais confiável que buscar na UI.
    const url = `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(conteudo)}`;
    if (!window.location.href.startsWith(url.split("&text=")[0])) {
      window.location.href = url;
      // A navegação recarrega o content script — o envio de fato precisa
      // ser retomado depois que a página assentar. Ver README da extensão.
      await new Promise((r) => setTimeout(r, 4000));
    }
    const sendBtn = await waitFor(SELECTORS.sendButton, 8000);
    if (sendBtn) {
      sendBtn.click();
      return { ok: true };
    }
    return { ok: false, error: "Chat abriu mas o botão de enviar não apareceu a tempo." };
  }
  return sendViaComposeBox(conteudo);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "WA_SEND") {
    sendMessage(message.telefone, message.conteudo)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message ?? String(err) }));
    return true;
  }
});
