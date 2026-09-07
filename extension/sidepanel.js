const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

const listPane = document.getElementById("list-pane");
const threadPane = document.getElementById("thread-pane");
const conversationList = document.getElementById("conversation-list");
const messageList = document.getElementById("message-list");
const threadTitle = document.getElementById("thread-title");
const backBtn = document.getElementById("back-btn");
const composeForm = document.getElementById("compose-form");
const composeText = document.getElementById("compose-text");
const templateSelect = document.getElementById("template-select");
const sendError = document.getElementById("send-error");

let activeConversation = null;

function send(message) {
  return chrome.runtime.sendMessage(message).then((res) => {
    if (!res?.ok) throw new Error(res?.error ?? "Erro desconhecido");
    return res;
  });
}

async function checkSession() {
  const res = await send({ type: "GET_SESSION" }).catch(() => ({ session: null }));
  if (res.session) {
    userEmailEl.textContent = res.session.email;
    loginView.hidden = true;
    appView.hidden = false;
    await loadConversations();
    await loadTemplates();
  } else {
    loginView.hidden = false;
    appView.hidden = true;
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await send({ type: "LOGIN", email, password });
    await checkSession();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  await send({ type: "LOGOUT" });
  await checkSession();
});

function formatWhen(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadConversations() {
  const { conversations } = await send({ type: "GET_CONVERSATIONS" });
  conversationList.innerHTML = "";
  for (const c of conversations) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="nome">${c.nome_contato}${c.nao_lida ? '<span class="unread-dot"></span>' : ""}</div>
      <div class="preview">${c.ultima_mensagem_preview ?? "Sem mensagens"} · ${formatWhen(c.ultima_mensagem_em)}</div>
    `;
    li.addEventListener("click", () => openThread(c));
    conversationList.appendChild(li);
  }
}

async function loadTemplates() {
  const { templates } = await send({ type: "GET_TEMPLATES" }).catch(() => ({ templates: [] }));
  templateSelect.innerHTML = '<option value="">Template…</option>';
  for (const t of templates.filter((t) => t.tipo === "texto")) {
    const opt = document.createElement("option");
    opt.value = t.conteudo ?? "";
    opt.textContent = t.nome;
    templateSelect.appendChild(opt);
  }
}

templateSelect.addEventListener("change", () => {
  if (templateSelect.value) {
    composeText.value = templateSelect.value;
    templateSelect.value = "";
  }
});

async function openThread(conversation) {
  activeConversation = conversation;
  threadTitle.textContent = conversation.nome_contato;
  listPane.hidden = true;
  threadPane.hidden = false;
  await loadMessages();
}

backBtn.addEventListener("click", () => {
  activeConversation = null;
  threadPane.hidden = true;
  listPane.hidden = false;
  loadConversations();
});

async function loadMessages() {
  const { messages } = await send({
    type: "GET_MESSAGES",
    conversationId: activeConversation.id,
  });
  messageList.innerHTML = "";
  for (const m of messages) {
    const li = document.createElement("li");
    li.className = m.direcao;
    li.textContent = m.conteudo ?? `[${m.tipo}]`;
    messageList.appendChild(li);
  }
  messageList.scrollTop = messageList.scrollHeight;
}

composeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  sendError.hidden = true;
  const conteudo = composeText.value.trim();
  if (!conteudo || !activeConversation) return;

  try {
    await send({
      type: "SEND_MESSAGE",
      conversationId: activeConversation.id,
      telefone: activeConversation.telefone,
      conteudo,
    });
    composeText.value = "";
    await loadMessages();
  } catch (err) {
    sendError.textContent = err.message;
    sendError.hidden = false;
  }
});

checkSession();

// Atualiza a lista periodicamente pra pegar mensagens novas relatadas pelo
// content script enquanto o painel está aberto.
setInterval(() => {
  if (!loginView.hidden) return;
  if (activeConversation) {
    loadMessages().catch(() => {});
  } else {
    loadConversations().catch(() => {});
  }
}, 15_000);
