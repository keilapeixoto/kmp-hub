// KMP Hub · Leitura do "Record of Responses" — o PDF que o ImmiAccount gera
// depois que uma aplicação é enviada. Texto simples, mesmos rótulos do
// formulário. Este arquivo só transforma texto em dados estruturados; não
// grava nada e não tem dependências (roda em Server Action e em script).

export type RecordEntry = {
  /** Bloco do PDF: "applicant" ou "contact-au" (contato na Austrália). */
  contexto: "applicant" | "contact-au";
  secao: string;
  rotulo: string;
  valor: string;
};

export type ParsedRecord = {
  entradas: RecordEntry[];
  /** Texto inteiro numa linha só, sem cabeçalho/rodapé — pra perguntas Sim/Não. */
  corrido: string;
};

// Cabeçalho e rodapé que se repetem em cada página do PDF.
const RUIDO = [
  /^OFFICIAL/,
  /^Personal Privacy$/,
  /^Generated:/,
  /^This form submitted by/,
  /^Role\(s\)/,
  /^Submitted on/,
  /^Reference Number/,
  /^=====PAGINA/,
  /^Application for a Visitor Short Stay Visa/,
];

const SECOES = new Set([
  "Terms and Conditions",
  "Application context",
  "Passport details",
  "National identity card",
  "Place of birth",
  "Relationship status",
  "Other names / spellings",
  "Citizenship",
  "Previous travel to Australia",
  "Other passports or documents for travel",
  "Other identity documents",
  "Health examination",
  "Critical data confirmation",
  "Travelling companions",
  "Contact details",
  "Country of residence",
  "Department office",
  "Residential address",
  "Contact telephone numbers",
  "Postal address",
  "Email address",
  "Authorised recipient",
  "Electronic communication",
  "Non-accompanying members of the family unit",
  "Entry to Australia",
  "Proposed period of stay",
  "Study while in Australia",
  "Relatives, friends or contacts in Australia",
  "Contact in Australia",
  "Contact's details",
  "Visa applicant's current overseas employment",
  "Current employment details",
  "Financial support",
  "Funding details",
  "Health declarations",
  "Character declarations",
  "Visa history",
  "Declarations",
]);

// Seções que encerram o bloco "Contact in Australia".
const FIM_CONTATO_AU = new Set([
  "Visa applicant's current overseas employment",
  "Financial support",
  "Health declarations",
]);

const ROTULO = /^([A-Z][^:?]{1,70}):\s*(.*)$/;
const NAO_E_ROTULO = new Set(["Note", "Warning", "Information", "Office"]);

function normalizaLinha(l: string): string {
  return l.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

export function parseRecord(textoBruto: string): ParsedRecord {
  // O rótulo "Place of issue / issuing authority" quebra em 3 linhas, e o
  // valor vem antes ou depois de "authority:" conforme o leitor de PDF.
  const texto = textoBruto
    .replace(/Place of issue \/ issuing\s*\n([^\n]+)\n\s*authority:/, "Place of issue / issuing authority: $1")
    .replace(/Place of issue \/ issuing\s*\n\s*authority:\s*\n([^\n]+)/, "Place of issue / issuing authority: $1");

  const linhas = texto
    .split("\n")
    .map(normalizaLinha)
    .filter((l) => l && !RUIDO.some((r) => r.test(l)));

  const entradas: RecordEntry[] = [];
  let secao = "";
  let contexto: RecordEntry["contexto"] = "applicant";

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    if (SECOES.has(linha)) {
      secao = linha;
      if (linha === "Contact in Australia") contexto = "contact-au";
      else if (FIM_CONTATO_AU.has(linha)) contexto = "applicant";
      continue;
    }

    const m = ROTULO.exec(linha);
    if (!m || NAO_E_ROTULO.has(m[1])) continue;

    let valor = m[2].trim();
    // Valor vazio na linha do rótulo: pega a(s) linha(s) seguinte(s) que
    // não sejam outro rótulo nem título de seção. Endereço também continua
    // na linha seguinte ("Address: Rua X" / "Bairro Y").
    let j = i + 1;
    while (j < linhas.length && j <= i + 2) {
      const prox = linhas[j];
      if (SECOES.has(prox) || ROTULO.test(prox) || /\?$/.test(prox)) break;
      if (valor && m[1] !== "Address" && m[1] !== "Give details") break;
      valor = valor ? `${valor}, ${prox}` : prox;
      j++;
    }
    entradas.push({ contexto, secao, rotulo: m[1], valor });
  }

  return { entradas, corrido: linhas.join(" ") };
}

/** Primeiro valor de um rótulo, opcionalmente restrito a seção e contexto. */
export function pega(
  rec: ParsedRecord,
  rotulo: string,
  filtro: { secao?: string; contexto?: RecordEntry["contexto"] } = {},
): string | null {
  const contexto = filtro.contexto ?? "applicant";
  const e = rec.entradas.find(
    (x) =>
      x.rotulo === rotulo &&
      x.contexto === contexto &&
      (!filtro.secao || x.secao === filtro.secao) &&
      x.valor,
  );
  return e ? e.valor : null;
}

/**
 * Resposta Sim/Não logo depois de uma pergunta (a pergunta pode quebrar em
 * várias linhas no PDF, por isso a busca é no texto corrido).
 */
export function simNao(rec: ParsedRecord, trechoDaPergunta: string): "Yes" | "No" | null {
  const i = rec.corrido.indexOf(trechoDaPergunta);
  if (i < 0) return null;
  const depois = rec.corrido.slice(i + trechoDaPergunta.length, i + trechoDaPergunta.length + 80);
  // até o "?" da própria pergunta (ex.: "...passaporte (BRAZIL)?"), sem pular para a próxima
  const m = /^[^?]{0,40}\?\s*(Yes|No)\b/.exec(depois);
  return m ? (m[1] as "Yes" | "No") : null;
}
