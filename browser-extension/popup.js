const API_BASE = "https://kmp-hub.vercel.app";

const tokenInput = document.getElementById("tokenInput");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

const buscaInput = document.getElementById("buscaInput");
const buscarBtn = document.getElementById("buscarBtn");
const resultadosEl = document.getElementById("resultados");
const visaStatusEl = document.getElementById("visaStatus");
const limparBtn = document.getElementById("limparBtn");

const STATUS_LABELS = {
  em_preenchimento: "em preenchimento",
  enviado: "enviado",
  em_analise: "em análise",
  aprovado: "aprovado",
};

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = `status ${ok ? "ok" : "off"}`;
}

function setVisaStatus(text, kind) {
  visaStatusEl.textContent = text;
  visaStatusEl.className = `status ${kind}`;
}

function atualizarVisaStatus() {
  chrome.storage.local.get(["kmpVisaClienteNome"], ({ kmpVisaClienteNome }) => {
    if (kmpVisaClienteNome) {
      setVisaStatus(`Dados carregados: ${kmpVisaClienteNome}.`, "ok");
    } else {
      setVisaStatus("Nenhum cliente carregado.", "off");
    }
  });
}

chrome.storage.local.get(["kmpToken"], ({ kmpToken }) => {
  if (kmpToken) {
    tokenInput.value = kmpToken;
    setStatus("Token salvo — pronto pra usar.", true);
  } else {
    setStatus("Nenhum token salvo ainda.", false);
  }
});
atualizarVisaStatus();

saveBtn.addEventListener("click", () => {
  const value = tokenInput.value.trim();
  if (!value) {
    setStatus("Cole o token antes de salvar.", false);
    return;
  }
  chrome.storage.local.set({ kmpToken: value }, () => {
    setStatus("Token salvo — pronto pra usar.", true);
  });
});

async function buscarCases(token, q) {
  const url = `${API_BASE}/api/extension/visa-cases?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = await res.json();
  return data.resultados ?? [];
}

function renderResultados(resultados, token) {
  resultadosEl.innerHTML = "";
  if (resultados.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum processo encontrado.";
    resultadosEl.appendChild(li);
    return;
  }

  for (const r of resultados) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${r.clienteNome} (${STATUS_LABELS[r.statusFormulario] ?? r.statusFormulario})`;
    const usarBtn = document.createElement("button");
    usarBtn.textContent = "Usar";
    usarBtn.addEventListener("click", () => carregarDados(token, r.caseId, r.clienteNome));
    li.appendChild(label);
    li.appendChild(usarBtn);
    resultadosEl.appendChild(li);
  }
}

async function carregarDados(token, caseId, clienteNome) {
  setVisaStatus("Carregando dados...", "off");
  try {
    const url = `${API_BASE}/api/extension/visa-form-data?caseId=${encodeURIComponent(caseId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`API respondeu ${res.status}`);
    const dados = await res.json();
    await chrome.storage.local.set({
      kmpVisaCaseId: caseId,
      kmpVisaClienteNome: clienteNome,
      kmpVisaData: dados,
    });
    resultadosEl.innerHTML = "";
    buscaInput.value = "";
    setVisaStatus(`Dados carregados: ${clienteNome}.`, "ok");
  } catch {
    setVisaStatus("Falha ao carregar os dados — tente de novo.", "erro");
  }
}

buscarBtn.addEventListener("click", () => {
  chrome.storage.local.get(["kmpToken"], async ({ kmpToken }) => {
    if (!kmpToken) {
      setVisaStatus("Salve o token do Hub primeiro.", "erro");
      return;
    }
    const q = buscaInput.value.trim();
    setVisaStatus("Buscando...", "off");
    try {
      const resultados = await buscarCases(kmpToken, q);
      renderResultados(resultados, kmpToken);
      atualizarVisaStatus();
    } catch {
      setVisaStatus("Falha ao buscar — tente de novo.", "erro");
    }
  });
});

limparBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["kmpVisaCaseId", "kmpVisaClienteNome", "kmpVisaData"], () => {
    resultadosEl.innerHTML = "";
    setVisaStatus("Nenhum cliente carregado.", "off");
  });
});
