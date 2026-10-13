// KMP Hub · Preenchimento automático do formulário de visto (Subclass 600)
// no ImmiAccount. Roda só em online.immi.gov.au/elp/* (ver manifest.json).
//
// Os campos desse formulário usam id/name GERADOS automaticamente a cada
// sessão (tipo "_2a0b0a0a0e0a0a2a6b1a1a0_input") — não são estáveis entre
// aplicações. Por isso a extensão acha os campos pelo TEXTO DA LABEL em
// inglês ("Family name", "Date of birth" etc.), que é sempre o mesmo.
//
// Princípio de segurança (pedido da Keila): a extensão só PREENCHE campos.
// Nunca clica em Previous/Next/Save/Submit — toda navegação e envio da
// aplicação continua manual, pra Keila revisar cada tela antes de avançar.

const KMP_API_BASE = "https://kmp-hub.vercel.app";

// ---------------------------------------------------------------------------
// Tradução PT -> EN pros países mais comuns da base de clientes (maioria
// brasileira). Os dropdowns do ImmiAccount só têm o nome em inglês; os dados
// do Hub vêm como o cliente escreveu, normalmente em português. Chave sem
// acento, minúscula.
// ---------------------------------------------------------------------------
const COUNTRY_PT_EN = {
  brasil: "brazil",
  australia: "australia",
  portugal: "portugal",
  argentina: "argentina",
  "estados unidos": "united states",
  eua: "united states",
  uruguai: "uruguay",
  paraguai: "paraguay",
  chile: "chile",
  "reino unido": "united kingdom",
  franca: "france",
  alemanha: "germany",
  italia: "italy",
  espanha: "spain",
  japao: "japan",
  china: "china",
  canada: "canada",
  mexico: "mexico",
  colombia: "colombia",
  peru: "peru",
  bolivia: "bolivia",
};

function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(s) {
  return stripAccents(String(s || ""))
    .replace(/\*/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function translateCountry(ptValue) {
  const key = normalize(ptValue);
  return COUNTRY_PT_EN[key] || key;
}

// ---------------------------------------------------------------------------
// Selo de status (mesmo padrão visual do content-script.js da tela de login)
// ---------------------------------------------------------------------------

function criarSelo() {
  const selo = document.createElement("div");
  selo.id = "kmp-hub-selo-visto";
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
    "max-width:280px",
  ].join(";");
  document.body.appendChild(selo);
  return selo;
}

function atualizarSelo(selo, texto) {
  if (selo) selo.textContent = `KMP Hub (visto): ${texto}`;
}

// ---------------------------------------------------------------------------
// Preenchimento de campo nativo (setter + eventos, pra frameworks reagirem)
// ---------------------------------------------------------------------------

function preencherTexto(input, valor) {
  const proto =
    input.tagName === "SELECT"
      ? window.HTMLSelectElement.prototype
      : input.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(input, valor);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function marcarRadio(radio) {
  radio.checked = true;
  radio.dispatchEvent(new Event("click", { bubbles: true }));
  radio.dispatchEvent(new Event("change", { bubbles: true }));
}

function isVisivel(el) {
  if (!el) return false;
  if (el.hasAttribute("hidden")) return false;
  if (el.closest("[hidden]")) return false;
  return true;
}

/**
 * Já tem valor? Protege defaults que o próprio ImmiAccount já preenche
 * (ex. "Email address" vem com vistos@kmpconsulting.com.au) — a extensão
 * nunca sobrescreve, só preenche campo vazio.
 */
function jaPreenchido(controle) {
  if (controle.tagName === "FIELDSET") {
    return !!controle.querySelector('input[type="radio"]:checked');
  }
  return !!String(controle.value || "").trim();
}

// ---------------------------------------------------------------------------
// Acha o campo pela label em inglês (normalizada) — ver comentário no topo.
//
// Algumas labels se repetem na mesma página (ex. "Address", "Suburb / Town",
// "Postcode" aparecem tanto no formato de endereço australiano quanto no
// internacional, e de novo no endereço de correspondência). Como só um dos
// grupos fica visível por vez (o outro fica dentro de um ancestral
// `hidden`), o filtro isVisivel() já resolve a maioria dos casos — mas
// quando a seção toda (ex. "Residential address" vs "Postal address")
// pode estar visível ao mesmo tempo, o parâmetro `scopeHeadingEn` restringe
// a busca ao trecho da página sob aquele título.
// ---------------------------------------------------------------------------

function acharEscopo(scopeHeadingEn) {
  if (!scopeHeadingEn) return document;
  const alvo = normalize(scopeHeadingEn);
  const titulos = document.querySelectorAll(
    "h2 .wc-labelbody, h3 .wc-labelbody, legend .wc-labelbody",
  );
  for (const titulo of titulos) {
    if (normalize(titulo.textContent) !== alvo) continue;
    const container =
      titulo.closest('[class*="ELP-"]') ||
      titulo.closest(".wc-panel") ||
      titulo.closest("fieldset") ||
      titulo.parentElement;
    if (container) return container;
  }
  return document;
}

function acharControlePorLabel(labelEn, scopeHeadingEn) {
  const alvo = normalize(labelEn);
  const raiz = acharEscopo(scopeHeadingEn);
  const labels = raiz.querySelectorAll(
    "label.wc-label[for], span.wc-label[data-wc-for]",
  );
  for (const lab of labels) {
    if (normalize(lab.textContent) !== alvo) continue;
    const forId = lab.getAttribute("for") || lab.getAttribute("data-wc-for");
    const controle = forId && document.getElementById(forId);
    if (controle && isVisivel(controle)) return controle;
  }
  return null;
}

/**
 * Acha o campo "Give details" (textarea) que vem logo depois de um grupo de
 * radio Sim/Não já preenchido — usado nas páginas em que a mesma label
 * "Give details" se repete várias vezes (ex. página 18/20, Visa history, com
 * três perguntas Sim/Não cada uma com seu próprio "Give details"). Como
 * várias dessas perguntas podem ficar visíveis ao mesmo tempo se o cliente
 * respondeu "Sim" a mais de uma, não dá pra confiar só na primeira
 * ocorrência visível da label no documento inteiro — em vez disso, anda
 * pelos irmãos seguintes ao próprio grupo de radio já respondido.
 */
function acharDetalhesApos(controlePrincipal, labelDetalhesEn) {
  const alvo = normalize(labelDetalhesEn);
  let container = controlePrincipal.closest(".wc-panel") || controlePrincipal.parentElement;
  let proximo = container?.nextElementSibling;
  let tentativas = 0;
  while (proximo && tentativas < 6) {
    if (isVisivel(proximo)) {
      const labels = proximo.querySelectorAll(
        "label.wc-label[for], span.wc-label[data-wc-for]",
      );
      for (const lab of labels) {
        if (normalize(lab.textContent) !== alvo) continue;
        const forId = lab.getAttribute("for") || lab.getAttribute("data-wc-for");
        const el = forId && document.getElementById(forId);
        if (el && isVisivel(el)) return el;
      }
    }
    proximo = proximo.nextElementSibling;
    tentativas++;
  }
  return null;
}

function dataIsoParaBr(valorIso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valorIso || ""));
  if (!m) return valorIso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Preenche um campo já localizado, de acordo com o tipo de controle.
 * Retorna true se conseguiu preencher.
 */
function preencherControle(controle, valorBruto, opcoes = {}) {
  if (!valorBruto) return false;

  if (controle.tagName === "FIELDSET") {
    // Grupo de radio (Sim/Não, Sexo, etc.)
    const alvo = normalize(opcoes.valueMap ? opcoes.valueMap[valorBruto] ?? valorBruto : valorBruto);
    const radios = controle.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
      const textoOpcao = r.closest("label.wc-option")?.querySelector(".wc-labeltext")?.textContent;
      if (normalize(textoOpcao) === alvo) {
        marcarRadio(r);
        return true;
      }
    }
    return false;
  }

  if (controle.tagName === "SELECT") {
    const alvo =
      opcoes.tipo === "pais" ? translateCountry(valorBruto) : normalize(opcoes.valueMap ? opcoes.valueMap[valorBruto] ?? valorBruto : valorBruto);
    for (const opt of controle.options) {
      if (normalize(opt.textContent).includes(alvo) || alvo.includes(normalize(opt.textContent))) {
        preencherTexto(controle, opt.value);
        return true;
      }
    }
    return false;
  }

  if (controle.closest(".wc-datefield")) {
    preencherTexto(controle, dataIsoParaBr(valorBruto));
    return true;
  }

  // Texto simples
  preencherTexto(controle, valorBruto);
  return true;
}

// ---------------------------------------------------------------------------
// Dicionário de campos — rótulo do formulário do Hub (PT) -> rótulo do
// ImmiAccount (EN) + tipo de preenchimento. Construído página a página
// conforme a Keila manda o HTML real; cobre por enquanto a página 6/20
// (Contact details), as páginas 2-5/20 (Application context, Applicant,
// Critical data confirmation, Travelling companions) e parte da página
// 18/20 (Visa history — 2 das 3 perguntas). Página 1 (Terms and
// Conditions) não precisa de mapeamento — é só o checkbox de aceite,
// deixado manual de propósito.
// ---------------------------------------------------------------------------

const SIM_NAO = { Sim: "Yes", Não: "No" };
const SEXO = { Masculino: "Male", Feminino: "Female", Outro: "Other" };
const ESTADO_CIVIL = {
  "Solteiro(a)": "Never Married",
  "Casado(a)": "Married",
  "Divorciado(a)": "Divorced",
  "Viúvo(a)": "Widowed",
  "Separado(a)": "Separated",
  "União Estável": "De Facto",
  "Noivo(a)": "Engaged",
};

const DENTRO_FORA_AUSTRALIA = { Austrália: "No", "Fora da Austrália": "Yes" };

const FIELD_MAP = [
  // Página 2/20 — Application context
  {
    pt: "Localização atual",
    en: "Is the applicant currently outside Australia?",
    valueMap: DENTRO_FORA_AUSTRALIA,
  },

  // Página 3/20 — Applicant (nome, sexo, nascimento, passaporte)
  { pt: "Nome", en: "Given names" },
  { pt: "Sobrenome", en: "Family name" },
  { pt: "Gênero", en: "Sex", valueMap: SEXO },
  { pt: "Data de nascimento", en: "Date of birth" },
  { pt: "Cidade de nascimento", en: "Town / City" },
  { pt: "País de nascimento", en: "Country of birth", tipo: "pais" },
  { pt: "Estado civil", en: "Relationship status", valueMap: ESTADO_CIVIL },
  {
    pt: "Possui, ou já possuiu, outra nacionalidade ou cidadania?",
    en: "Is this applicant a citizen of any other country?",
    valueMap: SIM_NAO,
  },
  { pt: "Número do passaporte", en: "Passport number" },
  { pt: "País de emissão", en: "Country of passport", tipo: "pais" },
  { pt: "Nacionalidade conforme passaporte", en: "Nationality of passport holder", tipo: "pais" },
  { pt: "Data de emissão", en: "Date of issue" },
  { pt: "Data de validade", en: "Date of expiry" },
  { pt: "Local de emissão", en: "Place of issue / issuing authority" },

  // Página 4/20 — Critical data confirmation (só os dados de novo, maioria
  // somente-leitura — o único campo editável de verdade é o e-mail). A
  // pergunta "Is the above information correct?" fica de propósito sem
  // preenchimento automático: é a confirmação da Keila, não da extensão.
  { pt: "E-mail", en: "Email address" },

  // Página 5/20 — Travelling companions. A pergunta sobre viajar com pai/mãe
  // ou responsável só aparece pra menores de 18 — sem campo correspondente
  // no formulário do Hub (público adulto), fica de fora por enquanto.
  {
    pt: "Alguém está te acompanhando nesta viagem?",
    en: "Are there any other persons travelling with the applicant to Australia?",
    valueMap: SIM_NAO,
  },

  // Página 6/20 — Contact details (endereço residencial, telefones).
  // "Cidade"/"Estado"/"CEP" mapeiam pro formato internacional de endereço
  // (Address International) — é o que aparece pra qualquer país diferente
  // de Austrália, caso de praticamente toda a base de clientes. O
  // scopeHeadingEn "Residential address" evita pegar os mesmos rótulos
  // repetidos dentro do bloco de "Postal address" (que só aparece quando
  // o cliente marca que o endereço de correspondência é diferente do
  // residencial — por padrão vem "Yes"/mesmo endereço, então esse bloco
  // fica escondido e nem entra no preenchimento). "País" preenche tanto o
  // país do endereço residencial quanto o campo "Usual country of
  // residence" do topo da página, que pede a mesma informação. O campo
  // "Endereço para correspondência" do Hub (texto livre, só quando
  // diferente do residencial) fica de fora — o ImmiAccount pede
  // Country/Address/Suburb/State/Postcode separados pra isso, não dá pra
  // quebrar um texto livre em campos estruturados com segurança.
  {
    pt: "Endereço residencial completo",
    en: "Address",
    scopeHeadingEn: "Residential address",
  },
  { pt: "Cidade", en: "Suburb / Town", scopeHeadingEn: "Residential address" },
  { pt: "Estado", en: "State or Province", scopeHeadingEn: "Residential address" },
  { pt: "CEP", en: "Postal code", scopeHeadingEn: "Residential address" },
  { pt: "País", en: "Country", scopeHeadingEn: "Residential address", tipo: "pais" },
  { pt: "País", en: "Usual country of residence", tipo: "pais" },
  { pt: "Telefone residencial", en: "Home phone" },
  { pt: "Telefone comercial", en: "Business phone" },
  { pt: "Celular", en: "Mobile / Cell phone" },

  // Página 18/20 — Visa history. Duas das três perguntas da página batem
  // com campos que já existem na etapa "Saúde e Caráter" do formulário do
  // Hub ("Formulário Visto de Turista (Subclass 600) — Coleta de Dados").
  // A terceira pergunta da página ("Has the applicant held or does the
  // applicant currently hold a visa to Australia or any other country?")
  // NÃO tem campo equivalente hoje — o Hub só pergunta se já *solicitou*
  // visto pra Austrália (campo "Já solicitou visto para a Austrália
  // antes?"), que é semanticamente diferente de "já teve/tem visto para
  // Austrália OU qualquer outro país" — fica de fora até a Keila decidir
  // se vale criar um campo novo pra isso.
  {
    pt: "Já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?",
    en: "Has the applicant ever been in Australia or any other country and not complied with visa conditions or departed outside their authorised period of stay?",
    valueMap: SIM_NAO,
    ptDetalhes: "Descreva o descumprimento/overstay",
    enDetalhes: "Give details",
  },
  {
    pt: "Já teve pedido de visto recusado ou cancelado em qualquer país?",
    en: "Has the applicant ever had a visa for Australia or any other country refused or cancelled?",
    valueMap: SIM_NAO,
    ptDetalhes: "Descreva a recusa/cancelamento",
    enDetalhes: "Give details",
  },

  // Página 20/20 — Declarations (última página) fica de propósito sem
  // mapeamento, igual à página 1 (Terms) e à pergunta de confirmação da
  // página 4: são nove declarações/consentimentos legais ("Have read and
  // understood...", "Give consent to the collection of their fingerprints
  // and facial image...", "Agree to leave Australia on or before the expiry
  // ..." etc.) sem campo correspondente no formulário de coleta de dados do
  // Hub — não é dado do cliente pra copiar, é atestação que a própria
  // Keila/o cliente precisa conferir e marcar conscientemente antes de
  // enviar.
];

// ---------------------------------------------------------------------------
// Endereço de correspondência — tratado à parte do FIELD_MAP porque não é
// um mapeamento direto de 1 label: primeiro marca "No" na pergunta "Is the
// postal address the same as the residential address?" (só quando o Hub
// tem texto preenchido nesse campo e a pergunta ainda não foi respondida —
// nunca mexe numa resposta que já existe), o que revela os campos de
// endereço de correspondência, e então cola o texto inteiro no campo
// "Address" daquela seção. Não tenta separar rua/bairro/cidade/estado/CEP
// do texto — o Hub coleta esse campo como texto livre, sem estrutura, então
// a Keila confere e completa Suburb/State/Postcode manualmente antes de
// avançar (igual já faz com todo o resto que a extensão preenche).
// ---------------------------------------------------------------------------
function preencherEnderecoCorrespondencia(respostas) {
  const texto = respostas["Endereço para correspondência"];
  if (!texto) return 0;

  const pergunta = acharControlePorLabel(
    "Is the postal address the same as the residential address?",
  );
  if (!pergunta || jaPreenchido(pergunta)) return 0;

  if (!preencherControle(pergunta, "No")) return 0;

  const campoEndereco = acharControlePorLabel("Address", "Postal address");
  if (campoEndereco && preencherControle(campoEndereco, texto)) return 2;
  return 1;
}

function montarRespostas(kmpVisaData) {
  const respostas = {};
  for (const etapa of kmpVisaData.etapas || []) {
    for (const campo of etapa.campos || []) {
      if (campo.valor) respostas[campo.label] = campo.valor;
    }
  }
  return respostas;
}

async function rodar() {
  const { kmpVisaData } = await chrome.storage.local.get(["kmpVisaData"]);
  if (!kmpVisaData) return;

  const selo = criarSelo();
  atualizarSelo(selo, "preenchendo esta página...");

  const respostas = montarRespostas(kmpVisaData);
  let preenchidos = 0;

  for (const campo of FIELD_MAP) {
    const valor = respostas[campo.pt];
    if (!valor) continue;
    const controle = acharControlePorLabel(campo.en, campo.scopeHeadingEn);
    if (!controle) continue;
    const ok = preencherControle(controle, valor, { valueMap: campo.valueMap, tipo: campo.tipo });
    if (ok) {
      preenchidos++;
      if (campo.enDetalhes) {
        const detalhes = campo.ptDetalhes && respostas[campo.ptDetalhes];
        if (detalhes) {
          const campoDetalhes = acharDetalhesApos(controle, campo.enDetalhes);
          if (campoDetalhes && preencherControle(campoDetalhes, detalhes, {})) preenchidos++;
        }
      }
    }
  }

  preenchidos += preencherEnderecoCorrespondencia(respostas);

  if (preenchidos > 0) {
    atualizarSelo(
      selo,
      `${preenchidos} campo(s) preenchido(s) — confira antes de avançar. Nunca envia sozinha.`,
    );
  } else {
    atualizarSelo(selo, "nenhum campo conhecido nesta página ainda.");
  }
  setTimeout(() => selo.remove(), 8000);
}

rodar();
