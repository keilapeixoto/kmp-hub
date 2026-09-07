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
  // Cada linha da lista de conversas na barra lateral do WhatsApp Web.
  chatListItem: "[data-testid='cell-frame-container'], div[role='listitem']",
  // Nome do contato/grupo dentro de uma linha da lista.
  chatListItemTitle: "[data-testid='cell-frame-title'], span[dir='auto']",
};

// Precisa bater com CONVERSATION_STAGES em lib/whatsapp/constants.ts — duplicado
// aqui porque o content script não é um módulo ES (não dá pra importar direto).
const KANBAN_STAGES = [
  { slug: "novo_contato", label: "Novo contato" },
  { slug: "aguardando_resposta_cliente", label: "Aguardando cliente" },
  { slug: "aguardando_resposta_equipe", label: "Aguardando equipe" },
  { slug: "pendencia_documento", label: "Pendência doc." },
  { slug: "agendamento", label: "Agendamento" },
  { slug: "resolvido", label: "Resolvido" },
];
const KANBAN_BAR_HEIGHT = 122;

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

// ---------------------------------------------------------------------------
// Kanban injetado no topo da página do WhatsApp Web (pedido da Keila depois
// de ver como o waTidy faz isso). Usa Shadow DOM pra não vazar estilo nosso
// pra página nem sofrer com o CSS do WhatsApp — mais seguro que tentar
// encaixar dentro da estrutura de layout deles, que muda com frequência.
// Empurra o app do WhatsApp pra baixo com uma margem no topo do body.
// ---------------------------------------------------------------------------

function requestFromBackground(message) {
  return chrome.runtime.sendMessage(message).then((res) => {
    if (!res?.ok) throw new Error(res?.error ?? "Erro desconhecido");
    return res;
  });
}

/** Lê os nomes de todas as conversas visíveis na lista lateral do WhatsApp Web. */
function scanChatList() {
  const names = [];
  document.querySelectorAll(SELECTORS.chatListItem).forEach((item) => {
    const titleEl = item.querySelector(SELECTORS.chatListItemTitle);
    const nome = titleEl?.getAttribute("title") ?? titleEl?.textContent?.trim();
    if (nome) names.push(nome);
  });
  return names;
}

let kanbanShadow = null;

function buildKanbanBar() {
  if (document.getElementById("kmp-hub-kanban-host")) return;

  const host = document.createElement("div");
  host.id = "kmp-hub-kanban-host";
  host.style.cssText = `position:fixed;top:0;left:0;right:0;height:${KANBAN_BAR_HEIGHT}px;z-index:999999;`;
  document.body.prepend(host);
  document.body.style.marginTop = `${KANBAN_BAR_HEIGHT}px`;

  kanbanShadow = host.attachShadow({ mode: "open" });
  kanbanShadow.innerHTML = `
    <style>
      :host { all: initial; }
      .bar {
        display: flex;
        flex-direction: column;
        height: ${KANBAN_BAR_HEIGHT}px;
        padding: 8px 10px;
        background: #f8f7f5;
        border-bottom: 2px solid #f27b20;
        font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
        box-sizing: border-box;
      }
      .col {
        flex: 1;
        min-width: 130px;
        background: white;
        border-radius: 6px;
        padding: 6px 8px;
        box-sizing: border-box;
        overflow-y: auto;
      }
      .col.dragover {
        outline: 2px dashed #f27b20;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 2px 6px;
      }
      .import-btn {
        background: #f27b20;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
      }
      .import-btn:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .import-status {
        font-size: 10px;
        color: rgba(44, 44, 44, 0.6);
      }
      .col h4 {
        margin: 0 0 4px;
        font-size: 11px;
        color: #2c2c2c;
        display: flex;
        justify-content: space-between;
      }
      .card {
        font-size: 11px;
        background: #f8f7f5;
        border-radius: 4px;
        padding: 4px 6px;
        margin-bottom: 4px;
        cursor: grab;
        color: #2c2c2c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card:active { cursor: grabbing; }
      .template-btn {
        background: white;
        color: #f27b20;
        border: 1px solid #f27b20;
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
      }
      .modal {
        background: white;
        border-radius: 8px;
        padding: 16px;
        width: 320px;
        font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      }
      .modal h3 {
        margin: 0 0 10px;
        font-size: 14px;
        color: #2c2c2c;
      }
      .modal input,
      .modal textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 12px;
        font-family: inherit;
        margin-bottom: 8px;
      }
      .modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .modal-actions button {
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
      }
      .modal-save {
        background: #f27b20;
        color: white;
      }
      .modal-cancel {
        background: rgba(0, 0, 0, 0.08);
        color: #2c2c2c;
      }
    </style>
    <div class="bar">
      <div class="toolbar">
        <button class="import-btn" id="import-btn">Importar conversas</button>
        <button class="template-btn" id="template-btn">+ Template</button>
        <span class="import-status" id="import-status"></span>
      </div>
      <div class="cols-row" style="display:flex;gap:8px;flex:1;overflow-x:auto;">
        ${KANBAN_STAGES.map(
          (s) => `
          <div class="col" data-etapa="${s.slug}">
            <h4>${s.label} <span class="count"></span></h4>
            <div class="cards"></div>
          </div>`,
        ).join("")}
      </div>
    </div>
  `;

  kanbanShadow.querySelector("#import-btn").addEventListener("click", async () => {
    const btn = kanbanShadow.querySelector("#import-btn");
    const status = kanbanShadow.querySelector("#import-status");
    btn.disabled = true;
    status.textContent = "Importando…";
    try {
      const nomes = scanChatList();
      const { imported } = await requestFromBackground({
        type: "IMPORT_CONVERSATIONS",
        nomes,
      });
      status.textContent = `${imported} nova(s) conversa(s) importada(s) de ${nomes.length} encontradas.`;
      await refreshKanbanBar();
    } catch (err) {
      console.error("Falha ao importar conversas:", err);
      status.textContent = `Erro: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  });

  kanbanShadow.querySelector("#template-btn").addEventListener("click", () => {
    openTemplateModal();
  });

  for (const col of kanbanShadow.querySelectorAll(".col")) {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("dragover");
    });
    col.addEventListener("dragleave", () => col.classList.remove("dragover"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("dragover");
      const conversationId = e.dataTransfer.getData("text/kmp-conversation-id");
      const etapa = col.dataset.etapa;
      if (!conversationId) return;
      requestFromBackground({ type: "UPDATE_ETAPA", conversationId, etapa })
        .then(refreshKanbanBar)
        .catch((err) => console.error("Falha ao mover conversa de etapa:", err));
    });
  }

  refreshKanbanBar();
}

/** Formulário rápido pra salvar um template de texto sem precisar abrir o painel lateral. */
function openTemplateModal() {
  if (!kanbanShadow) return;
  if (kanbanShadow.querySelector(".modal-backdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3>Novo template</h3>
      <input id="tpl-nome" placeholder="Nome (ex.: Confirmação de consulta)" />
      <textarea id="tpl-conteudo" rows="5" placeholder="Texto da mensagem…"></textarea>
      <div class="modal-actions">
        <button class="modal-cancel" id="tpl-cancel">Cancelar</button>
        <button class="modal-save" id="tpl-save">Salvar</button>
      </div>
    </div>
  `;
  kanbanShadow.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector("#tpl-cancel").addEventListener("click", close);
  backdrop.querySelector("#tpl-save").addEventListener("click", async () => {
    const nome = backdrop.querySelector("#tpl-nome").value.trim();
    const conteudo = backdrop.querySelector("#tpl-conteudo").value.trim();
    if (!nome || !conteudo) return;
    const saveBtn = backdrop.querySelector("#tpl-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando…";
    try {
      await requestFromBackground({ type: "CREATE_TEMPLATE", nome, tipo: "texto", conteudo });
      close();
    } catch (err) {
      console.error("Falha ao salvar template:", err);
      saveBtn.disabled = false;
      saveBtn.textContent = "Salvar";
      alert(`Não foi possível salvar: ${err.message}`);
    }
  });
}

async function refreshKanbanBar() {
  if (!kanbanShadow) return;
  let conversations;
  try {
    ({ conversations } = await requestFromBackground({ type: "GET_CONVERSATIONS" }));
  } catch (err) {
    console.error("Kanban: falha ao carregar conversas:", err);
    return;
  }

  for (const stage of KANBAN_STAGES) {
    const col = kanbanShadow.querySelector(`.col[data-etapa="${stage.slug}"]`);
    if (!col) continue;
    const rows = conversations.filter((c) => c.etapa === stage.slug);
    col.querySelector(".count").textContent = `(${rows.length})`;
    const cardsEl = col.querySelector(".cards");
    cardsEl.innerHTML = "";
    for (const c of rows) {
      const card = document.createElement("div");
      card.className = "card";
      card.title = `${c.nome_contato} — ${c.ultima_mensagem_preview ?? ""}`;
      card.textContent = c.nome_contato;
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/kmp-conversation-id", c.id);
      });
      card.addEventListener("click", () => {
        const digits = onlyDigits(c.telefone);
        if (digits) {
          window.location.href = `https://web.whatsapp.com/send?phone=${digits}`;
        }
      });
      cardsEl.appendChild(card);
    }
  }
}

buildKanbanBar();
setInterval(refreshKanbanBar, 15_000);
