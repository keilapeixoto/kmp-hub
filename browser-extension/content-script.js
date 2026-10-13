// Roda só em online.immi.gov.au/lusc/* (ver manifest.json). Detecta a tela
// de código de autenticação do ImmiAccount, busca o código mais recente
// no Gmail (via API do Hub) e preenche + envia sozinho.

const API_BASE = "https://kmp-hub.vercel.app";
const MAX_TENTATIVAS = 15;
const INTERVALO_MS = 3000;

function criarSelo() {
  const selo = document.createElement("div");
  selo.id = "kmp-hub-selo";
  selo.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:999999",
    "background:#2c2c2c",
    "color:#fff",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "font-size:12px",
    "padding:8px 12px",
    "border-radius:8px",
    "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
  ].join(";");
  selo.textContent = "KMP Hub: verificando código...";
  document.body.appendChild(selo);
  return selo;
}

function atualizarSelo(selo, texto) {
  if (selo) selo.textContent = `KMP Hub: ${texto}`;
}

function preencherCampo(campo, valor) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(campo, valor);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.dispatchEvent(new Event("change", { bubbles: true }));
}

async function buscarCodigo(token) {
  const res = await fetch(`${API_BASE}/api/extension/immiaccount-code`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = await res.json();
  return data.code;
}

async function rodar() {
  const campo = document.getElementById("authenticationCode");
  if (!campo) return;

  const { kmpToken } = await chrome.storage.local.get(["kmpToken"]);
  if (!kmpToken) return;

  const selo = criarSelo();

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const codigo = await buscarCodigo(kmpToken);
      if (codigo) {
        atualizarSelo(selo, "código encontrado, preenchendo...");
        preencherCampo(campo, codigo);

        await new Promise((r) => setTimeout(r, 300));
        const botao = document.querySelector('button[name="submit"]');
        if (botao) {
          atualizarSelo(selo, "enviando...");
          botao.click();
        } else {
          atualizarSelo(selo, "código preenchido — confirme manualmente.");
        }
        setTimeout(() => selo.remove(), 4000);
        return;
      }
    } catch {
      // tenta de novo na próxima volta
    }
    atualizarSelo(
      selo,
      `aguardando e-mail do código (${tentativa}/${MAX_TENTATIVAS})...`,
    );
    await new Promise((r) => setTimeout(r, INTERVALO_MS));
  }

  atualizarSelo(selo, "não encontrei o código — digite manualmente.");
  setTimeout(() => selo.remove(), 6000);
}

rodar();
