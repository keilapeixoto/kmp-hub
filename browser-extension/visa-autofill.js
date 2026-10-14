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

// ---------------------------------------------------------------------------
// Acha o campo pela label em inglês (normalizada) — ver comentário no topo.
// ---------------------------------------------------------------------------

function acharControlePorLabel(labelEn) {
  const alvo = normalize(labelEn);
  const labels = document.querySelectorAll(
    "label.wc-label[for], span.wc-label[data-wc-for]",
  );
  for (const lab of labels) {
    if (normalize(lab.textContent) !== alvo) continue;
    const forId = lab.getAttribute("for") || lab.getAttribute("data-wc-for");
    const controle = forId && document.getElementById(forId);
    if (controle && isVisivel(controle)) return controle;
  }
  // Perguntas de escolha (Sim/Não etc.): o texto da pergunta fica na
  // <legend> do grupo de opções.
  for (const grupo of document.querySelectorAll("fieldset")) {
    const legenda = grupo.querySelector(":scope > legend");
    if (legenda && normalize(legenda.textContent) === alvo && isVisivel(grupo)) return grupo;
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
    let opcao;
    if (opcoes.tipo === "estado") {
      opcao = acharOpcaoEstado(controle, valorBruto, opcoes.paisCliente);
    } else {
      const alvo =
        opcoes.tipo === "pais" ? translateCountry(valorBruto) : normalize(opcoes.valueMap ? opcoes.valueMap[valorBruto] ?? valorBruto : valorBruto);
      opcao = acharOpcao(Array.from(controle.options), alvo);
    }
    if (!opcao) return false;
    preencherTexto(controle, opcao.value);
    return true;
  }

  if (opcoes.tipo === "data" || controle.closest(".wc-datefield")) {
    preencherTexto(controle, dataIsoParaBr(valorBruto));
    return true;
  }

  // Texto simples
  const texto = formatarTexto(valorBruto, opcoes);
  if (!texto) return false;
  if (!cabeNoCampo(controle, texto)) {
    // Endereço maior que a linha: quebra entre "Address" e "Address 2".
    const segunda = opcoes.en2 && acharControlePorLabel(opcoes.en2);
    const partes = segunda && quebrarEmDuasLinhas(texto, controle.maxLength);
    if (!partes || !cabeNoCampo(segunda, partes[1])) return false;
    preencherTexto(controle, partes[0]);
    preencherTexto(segunda, partes[1]);
    return true;
  }
  preencherTexto(controle, texto);
  return true;
}

// "Enter numbers only with no spaces" (ImmiAccount): telefone vai só com
// dígitos e sem o +55 (a Keila digita DDD + número). CEP só perde o traço
// quando o endereço é no Brasil — em outros países pode ter letra/traço
// que fazem parte do código (UK, Portugal).
function formatarTexto(valorBruto, opcoes) {
  const bruto = String(valorBruto).trim();
  if (opcoes.tipo === "telefone") {
    const digitos = bruto.replace(/\D/g, "");
    return /^(\+|00)\s*55/.test(bruto) && digitos.length > 11 ? digitos.replace(/^(00)?55/, "") : digitos;
  }
  if (opcoes.tipo === "cep") {
    return translateCountry(opcoes.paisCliente || "Brasil") === "brazil" ? bruto.replace(/\D/g, "") : bruto;
  }
  return bruto;
}

// Os dropdowns do ImmiAccount começam com uma opção em branco e têm nomes
// parecidos ("NIGER"/"NIGERIA"), então só vale texto idêntico — ou, na falta
// dele, quando uma única opção contém o valor. Na dúvida, não preenche.
function acharOpcao(opcoesSelect, alvo) {
  if (!alvo) return null;
  const comTexto = opcoesSelect.filter((o) => normalize(o.textContent));
  const iguais = comTexto.filter((o) => normalize(o.textContent) === alvo);
  if (iguais.length > 0) return iguais.length === 1 ? iguais[0] : null;
  const contem = comTexto.filter((o) => normalize(o.textContent).includes(alvo));
  return contem.length === 1 ? contem[0] : null;
}

// "State or Province" é um dropdown único com os estados de todos os países
// (o value é o código do país + o do estado, ex. "BRSP"), e há nomes
// repetidos entre países ("AMAZONAS" existe em 4). Pra cliente no Brasil,
// procura só entre os estados brasileiros, aceitando a sigla ("SP") ou o
// nome ("São Paulo").
function acharOpcaoEstado(select, valorBruto, paisCliente) {
  const todas = Array.from(select.options);
  const alvo = normalize(valorBruto);
  if (translateCountry(paisCliente || "Brasil") !== "brazil") return acharOpcao(todas, alvo);
  const brasileiras = todas.filter((o) => /^BR[A-Z]{2}$/.test(o.value));
  if (/^[a-z]{2}$/.test(alvo)) {
    return brasileiras.find((o) => o.value === `BR${alvo.toUpperCase()}`) || null;
  }
  return acharOpcao(brasileiras, alvo);
}

function cabeNoCampo(input, texto) {
  return !(input.maxLength > 0) || texto.length <= input.maxLength;
}

function quebrarEmDuasLinhas(texto, max) {
  if (!(max > 0)) return null;
  const corte = texto.lastIndexOf(" ", max);
  if (corte <= 0) return null;
  return [texto.slice(0, corte).trim(), texto.slice(corte + 1).trim()];
}

// ---------------------------------------------------------------------------
// Dicionário de campos — rótulo do formulário do Hub (PT) -> rótulo do
// ImmiAccount (EN) + tipo de preenchimento. Construído página a página
// conforme a Keila manda o HTML real; cobre por enquanto as páginas
// 2-6/20 (Application context, Applicant, Critical data confirmation,
// Travelling companions, Contact details). Página 1 (Terms and Conditions) não precisa
// de mapeamento — é só o checkbox de aceite, deixado manual de
// propósito.
//
// Cada campo vale só na página indicada em `pagina`: as mesmas labels
// ("Family name", "Given names", "Email address"...) se repetem em páginas
// diferentes com outro significado — na 7/20 (Authorised recipient), por
// exemplo, "Email address" é o e-mail que recebe a correspondência do
// departamento, não o do cliente.
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

// O ImmiAccount só oferece 3 faixas; o Hub tem 5. Cada faixa do Hub cabe
// inteira dentro de uma do ImmiAccount.
const PERMANENCIA = {
  "Até 2 semanas": "Up to 3 months",
  "2 a 4 semanas": "Up to 3 months",
  "1 a 3 meses": "Up to 3 months",
  "3 a 6 meses": "Up to 6 months",
  "6 a 12 meses": "Up to 12 months",
};

// "Empresário(a)" entra como Self employed (dono do próprio negócio); "Do
// lar" não tem opção própria no ImmiAccount, cai em Other (que pede
// detalhes — fica pra Keila escrever).
const SITUACAO_PROFISSIONAL = {
  "Empregado(a)": "Employed",
  "Autônomo(a)": "Self employed",
  "Empresário(a)": "Self employed",
  "Aposentado(a)": "Retired",
  Estudante: "Student",
  "Do lar": "Other",
  "Desempregado(a)": "Unemployed",
};

const CUSTEIO = {
  "Eu mesmo(a)": "Self funded",
  "Cônjuge/parceiro(a)": "Supported by other person",
  Pais: "Supported by other person",
};

// Só a resposta "Não" é transferida; qualquer outra não casa com opção e
// fica sem marcar.
const SO_NAO = { Não: "No" };

const DENTRO_FORA_AUSTRALIA = { Austrália: "No", "Fora da Austrália": "Yes" };

const FIELD_MAP = [
  // Página 2/20 — Application context
  {
    pagina: 2,
    pt: "Localização atual",
    en: "Is the applicant currently outside Australia?",
    valueMap: DENTRO_FORA_AUSTRALIA,
  },

  // Página 3/20 — Applicant (nome, sexo, nascimento, passaporte)
  { pagina: 3, pt: "Nome", en: "Given names" },
  { pagina: 3, pt: "Sobrenome", en: "Family name" },
  { pagina: 3, pt: "Gênero", en: "Sex", valueMap: SEXO },
  { pagina: 3, pt: "Data de nascimento", en: "Date of birth" },
  { pagina: 3, pt: "Cidade de nascimento", en: "Town / City" },
  { pagina: 3, pt: "País de nascimento", en: "Country of birth", tipo: "pais" },
  { pagina: 3, pt: "Estado civil", en: "Relationship status", valueMap: ESTADO_CIVIL },
  {
    pagina: 3,
    pt: "Possui, ou já possuiu, outra nacionalidade ou cidadania?",
    en: "Is this applicant a citizen of any other country?",
    valueMap: SIM_NAO,
  },
  { pagina: 3, pt: "Número do passaporte", en: "Passport number" },
  { pagina: 3, pt: "País de emissão", en: "Country of passport", tipo: "pais" },
  { pagina: 3, pt: "Nacionalidade conforme passaporte", en: "Nationality of passport holder", tipo: "pais" },
  { pagina: 3, pt: "Data de emissão", en: "Date of issue" },
  { pagina: 3, pt: "Data de validade", en: "Date of expiry" },
  { pagina: 3, pt: "Local de emissão", en: "Place of issue / issuing authority" },

  // Página 4/20 — Critical data confirmation (só os dados de novo, maioria
  // somente-leitura — o único campo editável de verdade é o e-mail). A
  // pergunta "Is the above information correct?" fica de propósito sem
  // preenchimento automático: é a confirmação da Keila, não da extensão.
  { pagina: 4, pt: "E-mail", en: "Email address" },

  // Página 5/20 — Travelling companions. A pergunta sobre viajar com pai/mãe
  // ou responsável só aparece pra menores de 18 — sem campo correspondente
  // no formulário do Hub (público adulto), fica de fora por enquanto.
  {
    pagina: 5,
    pt: "Alguém está te acompanhando nesta viagem?",
    en: "Are there any other persons travelling with the applicant to Australia?",
    valueMap: SIM_NAO,
  },

  // Página 6/20 — Contact details. "Office" (escritório mais próximo), a
  // pergunta do endereço postal e o "Email address" ficam manuais — o
  // e-mail de contato da aplicação é o da KMP, não o do cliente.
  { pagina: 6, pt: "País", en: "Usual country of residence", tipo: "pais" },
  { pagina: 6, pt: "País", en: "Country", tipo: "pais" },
  { pagina: 6, pt: "Endereço residencial completo", en: "Address", en2: "Address 2" },
  { pagina: 6, pt: "Cidade", en: "Suburb / Town" },
  { pagina: 6, pt: "Estado", en: "State or Province", tipo: "estado" },
  { pagina: 6, pt: "CEP", en: "Postal code", tipo: "cep" },
  { pagina: 6, pt: "Telefone residencial", en: "Home phone", tipo: "telefone" },
  { pagina: 6, pt: "Telefone comercial", en: "Business phone", tipo: "telefone" },
  { pagina: 6, pt: "Celular", en: "Mobile / Cell phone", tipo: "telefone" },

  // Página 9/20 — Entry to Australia. Só campos com resposta direta no
  // formulário do Hub (estadia, chegada, saída, mais de uma entrada); estudo
  // e visita a parentes/amigos ficam manuais (declarações ao governo).
  {
    pagina: 9,
    pt: "Tempo de permanência pretendido",
    en: "Length of stay in Australia",
    valueMap: PERMANENCIA,
  },
  { pagina: 9, pt: "Data prevista de chegada na Austrália", en: "Planned arrival date", tipo: "data" },
  {
    pagina: 9,
    pt: "Pretende entrar na Austrália mais de uma vez durante a estadia?",
    en: "Does the applicant intend to enter Australia on more than one occasion?",
    valueMap: SIM_NAO,
  },
  { pagina: 9, pt: "Data prevista de saída da Austrália", en: "Planned final departure date", tipo: "data" },

  // Página 11/20 — Current overseas employment. As seções mudam conforme o
  // status (Employed mostra cargo/empresa, Student mostra curso/instituição),
  // então os campos dependentes só são preenchidos nas tentativas seguintes,
  // depois que o ImmiAccount os revela. "Occupation grouping", datas, curso,
  // endereço e telefone da empresa ficam manuais (sem equivalente direto no
  // Hub). A 10/20 não aparece sempre — o ImmiAccount pula direto pra 11.
  {
    pagina: 11,
    pt: "Situação profissional atual",
    en: "Employment status",
    valueMap: SITUACAO_PROFISSIONAL,
  },
  { pagina: 11, pt: "Cargo/função", en: "Occupation" },
  { pagina: 11, pt: "Nome da empresa/instituição", en: "Organisation" },
  { pagina: 11, pt: "Nome da empresa/instituição", en: "Institution name" },

  // Página 12/20 — Financial support. Só "quem custeia" quando a resposta é
  // inequívoca (próprio cliente, cônjuge ou pais); empresa, patrocinador e
  // "outro" abrem blocos de organização/relacionamento que a Keila preenche.
  {
    pagina: 12,
    pt: "Quem custeará sua viagem?",
    en: "Give details of how the applicant's stay in Australia will be funded",
    valueMap: CUSTEIO,
  },
  {
    pagina: 12,
    pt: "Valor estimado em fundos disponíveis para a viagem",
    en: "What funds will the applicant have available to support their stay in Australia?",
  },

  // Página 17/20 — Character declarations. Declarações ao governo: só marca
  // "No" quando o cliente respondeu "Não" no Hub; um "Sim" nunca é marcado
  // (pede detalhes — a Keila trata). As outras 16 perguntas da página não
  // existem no formulário do Hub e ficam manuais. A 16/20 (saúde) também
  // fica toda manual, e a 13–15 só aparecem conforme as respostas.
  {
    pagina: 17,
    pt: "Já foi condenado por crime em qualquer país?",
    en: "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?",
    valueMap: SO_NAO,
  },
  {
    pagina: 17,
    pt: "Possui acusação criminal pendente?",
    en: "Has any applicant ever been charged with any offence that is currently awaiting legal action?",
    valueMap: SO_NAO,
  },
  {
    pagina: 17,
    pt: "Já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?",
    en: "Has any applicant ever overstayed a visa in any country (including Australia)?",
    valueMap: SO_NAO,
  },

  // Página 18/20 — Visa history. Mesma regra da 17: só "No". "Já teve visto
  // pra Austrália ou outro país" fica manual (o Hub só descreve em texto
  // livre os vistos anteriores).
  {
    pagina: 18,
    pt: "Já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?",
    en: "Has the applicant ever been in Australia or any other country and not complied with visa conditions or departed outside their authorised period of stay?",
    valueMap: SO_NAO,
  },
  {
    pagina: 18,
    pt: "Já teve pedido de visto recusado ou cancelado em qualquer país?",
    en: "Has the applicant ever had a visa for Australia or any other country refused or cancelled?",
    valueMap: SO_NAO,
  },

  // Página 7/20 — Authorised recipient. Sem mapeamento de propósito: a
  // página é sobre quem recebe a correspondência do departamento (dados da
  // KMP/agente, não do cliente), nada aqui vem do formulário do Hub.
];

// Número da página atual do formulário, lido da barra de progresso
// (<progress class="wc-progressbar" value="7" max="20">). Null se não achar.
function paginaAtual() {
  const valor = Number(document.querySelector("progress.wc-progressbar")?.getAttribute("value"));
  return Number.isInteger(valor) && valor > 0 ? valor : null;
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

  // Sem saber em que página está, não preenche nada — melhor deixar em
  // branco do que colocar dado do cliente num campo de outra página.
  const pagina = paginaAtual();
  if (!pagina) {
    atualizarSelo(selo, "não identifiquei a página do formulário — nada preenchido.");
    setTimeout(() => selo.remove(), 8000);
    return;
  }

  const respostas = montarRespostas(kmpVisaData);
  const feitos = new Set();

  // Alguns campos só aparecem depois que outro é preenchido (o dropdown de
  // estado depende do país), então tenta de novo algumas vezes. Nas
  // repetições não mexe em campo que já tem valor.
  const passada = (repeticao) => {
    for (const campo of FIELD_MAP) {
      if (campo.pagina !== pagina || feitos.has(campo)) continue;
      const valor = respostas[campo.pt];
      if (!valor) continue;
      const controle = acharControlePorLabel(campo.en);
      if (!controle) continue;
      if (repeticao && controle.tagName !== "FIELDSET" && controle.value) continue;
      const ok = preencherControle(controle, valor, {
        valueMap: campo.valueMap,
        tipo: campo.tipo,
        en2: campo.en2,
        paisCliente: respostas["País"],
      });
      if (ok) feitos.add(campo);
    }
    if (feitos.size > 0) {
      atualizarSelo(
        selo,
        `${feitos.size} campo(s) preenchido(s) — confira antes de avançar. Nunca envia sozinha.`,
      );
    } else {
      atualizarSelo(selo, "nenhum campo conhecido nesta página ainda.");
    }
  };

  passada(false);
  setTimeout(() => passada(true), 1500);
  setTimeout(() => passada(true), 4000);
  setTimeout(() => selo.remove(), 12000);
}

rodar();
