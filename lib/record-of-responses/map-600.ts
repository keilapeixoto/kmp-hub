// KMP Hub · Converte o "Record of Responses" de uma aplicação de Visitor Visa
// (Subclass 600) já enviada nos campos do "Formulário Visto de Turista
// (Subclass 600) — Coleta de Dados" do Hub. É o caminho inverso da extensão
// (browser-extension/visa-autofill.js): lá o Hub preenche o ImmiAccount, aqui
// o ImmiAccount preenche o Hub.
//
// Só converte o que tem equivalente claro. Declarações de saúde e caráter
// NÃO são trazidas — cada aplicação responde de novo. Chave do resultado =
// rótulo do campo no Hub (exatamente como em scripts/import-case-forms.mjs).

import { parseRecord, pega, simNao, type ParsedRecord } from "./parse.ts";

export type Mapeamento = {
  campos: Record<string, string>;
  avisos: string[];
};

const PAISES_EN_PT: Record<string, string> = {
  BRAZIL: "Brasil",
  AUSTRALIA: "Austrália",
  PORTUGAL: "Portugal",
  ARGENTINA: "Argentina",
  "UNITED STATES OF AMERICA": "Estados Unidos",
  "UNITED STATES": "Estados Unidos",
  URUGUAY: "Uruguai",
  PARAGUAY: "Paraguai",
  CHILE: "Chile",
  "UNITED KINGDOM": "Reino Unido",
  FRANCE: "França",
  GERMANY: "Alemanha",
  ITALY: "Itália",
  SPAIN: "Espanha",
  JAPAN: "Japão",
  CHINA: "China",
  CANADA: "Canadá",
  MEXICO: "México",
  COLOMBIA: "Colômbia",
  PERU: "Peru",
  BOLIVIA: "Bolívia",
};

function tituloCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s/-])([a-zà-ú])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

/** "BRAZIL - BRA" -> "Brasil". Países fora da lista voltam em Title Case (inglês). */
export function paisParaPt(valor: string): string {
  const nome = valor.replace(/\s+-\s+[A-Z]{2,3}$/, "").trim().toUpperCase();
  return PAISES_EN_PT[nome] ?? tituloCase(nome);
}

const MESES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "13 Jul 1970" ou "13/07/1970" -> "1970-07-13". Outro formato: null. */
export function dataParaIso(valor: string): string | null {
  let m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(valor.trim());
  if (m && MESES[m[2].toLowerCase()]) {
    return `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor.trim());
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

const SEXO: Record<string, string> = { Male: "Masculino", Female: "Feminino", Other: "Outro" };

const ESTADO_CIVIL: Record<string, string> = {
  "Never Married": "Solteiro(a)",
  Married: "Casado(a)",
  Divorced: "Divorciado(a)",
  Widowed: "Viúvo(a)",
  Separated: "Separado(a)",
  "De Facto": "União Estável",
  Engaged: "Noivo(a)",
};

const SITUACAO_LEGAL: Record<string, string> = {
  Citizen: "Cidadão",
  "Permanent Resident": "Residente permanente",
  Visitor: "Visitante",
  Student: "Estudante",
  "Work Visa": "Visto de trabalho",
  "No Legal Status": "Sem situação legal",
  Other: "Outro",
};

const SITUACAO: Record<string, string> = {
  Employed: "Empregado(a)",
  "Self employed": "Autônomo(a)",
  Retired: "Aposentado(a)",
  Student: "Estudante",
  Unemployed: "Desempregado(a)",
};

// O ImmiAccount tem 3 faixas; o Hub tem 5. Só dá pra voltar pra uma faixa
// do Hub escolhendo uma — a mais comum de cada faixa maior.
const PERMANENCIA: Record<string, string> = {
  "Up to 3 months": "1 a 3 meses",
  "Up to 6 months": "3 a 6 meses",
  "Up to 12 months": "6 a 12 meses",
};

const sim = (v: "Yes" | "No" | null): string | null => (v === "Yes" ? "Sim" : v === "No" ? "Não" : null);

export function mapRecordTo600(textoDoPdf: string): Mapeamento {
  const rec: ParsedRecord = parseRecord(textoDoPdf);
  const campos: Record<string, string> = {};
  const avisos: string[] = [];

  const poe = (rotuloHub: string, valor: string | null | undefined) => {
    if (valor && valor.trim()) campos[rotuloHub] = valor.trim();
  };
  const poeData = (rotuloHub: string, valor: string | null) => {
    if (!valor) return;
    const iso = dataParaIso(valor);
    if (iso) campos[rotuloHub] = iso;
    else avisos.push(`${rotuloHub}: data em formato não reconhecido, não importada.`);
  };
  const poeLista = (rotuloHub: string, valor: string | null, tabela: Record<string, string>) => {
    if (!valor) return;
    const v = tabela[valor];
    if (v) campos[rotuloHub] = v;
    else avisos.push(`${rotuloHub}: valor "${valor}" sem equivalente no Hub, não importado.`);
  };

  // ---- Dados pessoais e passaporte
  const P = { secao: "Passport details" };
  poe("Nome", pega(rec, "Given names", P));
  poe("Sobrenome", pega(rec, "Family name", P));
  poeLista("Gênero", pega(rec, "Sex", P), SEXO);
  poeData("Data de nascimento", pega(rec, "Date of birth", P));
  poe("Número do passaporte", pega(rec, "Passport number", P));
  const paisPassaporte = pega(rec, "Country of passport", P);
  if (paisPassaporte) poe("País de emissão", paisParaPt(paisPassaporte));
  const nacPassaporte = pega(rec, "Nationality of passport holder", P);
  if (nacPassaporte) {
    poe("Nacionalidade conforme passaporte", paisParaPt(nacPassaporte));
  }
  poeData("Data de emissão", pega(rec, "Date of issue", P));
  poeData("Data de validade", pega(rec, "Date of expiry", P));
  poe("Local de emissão", pega(rec, "Place of issue / issuing authority", P));

  const B = { secao: "Place of birth" };
  poe("Cidade de nascimento", pega(rec, "Town / City", B));
  poe("Estado de nascimento", pega(rec, "State / Province", B));
  const paisNasc = pega(rec, "Country of birth", B);
  if (paisNasc) poe("País de nascimento", paisParaPt(paisNasc));
  if (paisNasc && paisPassaporte && paisParaPt(paisNasc) !== paisParaPt(paisPassaporte)) {
    avisos.push(
      `País de nascimento (${paisParaPt(paisNasc)}) é diferente do país do passaporte (${paisParaPt(paisPassaporte)}). Confira se está certo — pode ser erro na aplicação original.`,
    );
  }

  poeLista("Estado civil", pega(rec, "Relationship status", { secao: "Relationship status" }), ESTADO_CIVIL);
  poe(
    "Possui, ou já possuiu, outra nacionalidade ou cidadania?",
    sim(simNao(rec, "Is this applicant a citizen of any other country")) ?? undefined,
  );
  poe(
    "Possui, ou já possuiu, outro passaporte?",
    sim(simNao(rec, "Does this applicant have any other passports or documents for travel")) ?? undefined,
  );
  poe("Já visitou a Austrália antes?", sim(simNao(rec, "Has this applicant previously travelled to Australia")) ?? undefined);
  poe(
    "Já solicitou visto para a Austrália antes?",
    sim(simNao(rec, "Has this applicant previously applied for a visa to Australia")) ?? undefined,
  );

  // ---- Contato e endereço (o e-mail do ImmiAccount é o da KMP, não do cliente)
  const R = { secao: "Residential address" };
  poe("Endereço residencial completo", pega(rec, "Address", R));
  poe("Cidade", pega(rec, "Suburb / Town", R));
  const estado = pega(rec, "State or Province", R);
  if (estado) poe("Estado", tituloCase(estado));
  poe("CEP", pega(rec, "Postal code", R));
  const pais = pega(rec, "Country", R);
  if (pais) poe("País", paisParaPt(pais));
  const T = { secao: "Contact telephone numbers" };
  poe("Telefone residencial", pega(rec, "Home phone", T));
  poe("Telefone comercial", pega(rec, "Business phone", T));
  poe("Celular", pega(rec, "Mobile / Cell phone", T));

  // ---- Viagem
  const motivo = pega(rec, "Australia", { secao: "Application context" });
  if (motivo === "Tourism") campos["Motivo da viagem à Austrália"] = "Turismo";
  poeData("Data prevista de chegada na Austrália", pega(rec, "Planned arrival date", { secao: "Proposed period of stay" }));
  poeData("Data prevista de saída da Austrália", pega(rec, "Planned final departure date", { secao: "Proposed period of stay" }));
  const estadia = pega(rec, "Length of stay in Australia", { secao: "Proposed period of stay" });
  poeLista("Tempo de permanência pretendido", estadia, PERMANENCIA);
  if (estadia && PERMANENCIA[estadia]) {
    avisos.push(
      `Tempo de permanência: o ImmiAccount só diz "${estadia}"; o Hub tem faixas menores e foi escolhida "${PERMANENCIA[estadia]}". Ajuste se for outra.`,
    );
  }
  poe(
    "Pretende entrar na Austrália mais de uma vez durante a estadia?",
    sim(simNao(rec, "Does the applicant intend to enter Australia on more than one occasion")) ?? undefined,
  );
  poe(
    "Alguém está te acompanhando nesta viagem?",
    sim(simNao(rec, "Are there any other persons travelling with the applicant to Australia")) ?? undefined,
  );

  // Endereço na Austrália = contato na Austrália (bloco "Contact in Australia").
  const AU = { contexto: "contact-au" as const, secao: "Residential address" };
  const endAu = [
    pega(rec, "Address", AU),
    pega(rec, "Suburb / Town", AU),
    pega(rec, "State / Territory", AU),
    pega(rec, "Postcode", AU),
  ].filter(Boolean);
  if (endAu.length > 0) poe("Endereço na Austrália onde pretende ficar", endAu.join(", "));

  // ---- Trabalho e finanças
  const situacao = pega(rec, "Employment status");
  if (situacao === "Other") {
    // "Other" não tem equivalente no Hub; se a explicação escrita fala em
    // aposentadoria/pensão, entra como Aposentado(a) — com aviso pra conferir.
    const detalhe = pega(rec, "Give details", { secao: "Current employment details" }) ?? "";
    if (/pension|pensioner|retire|aposent/i.test(detalhe)) {
      campos["Situação profissional atual"] = "Aposentado(a)";
      avisos.push(
        'Situação profissional: o ImmiAccount tinha "Other" com explicação de aposentadoria/pensão; entrou como Aposentado(a). Confira.',
      );
    } else {
      avisos.push('Situação profissional: o ImmiAccount tinha "Other", sem equivalente no Hub; escolha à mão.');
    }
  } else {
    poeLista("Situação profissional atual", situacao, SITUACAO);
  }
  const custeio = pega(rec, "Give details of how the applicant's stay in Australia will be funded");
  if (custeio === "Self funded") campos["Quem custeará sua viagem?"] = "Eu mesmo(a)";
  const fundos = /have available to support their stay in Australia\?\s*(.+?)\s*(?:Health declarations|$)/.exec(rec.corrido);
  if (fundos) poe("Valor estimado em fundos disponíveis para a viagem", fundos[1]);

  // ---- Perfil que vale para a nova aplicação (a viagem em si NÃO é trazida)
  poeLista("Qual é a sua situação legal no país onde mora?", pega(rec, "Legal status", { secao: "Application context" }), SITUACAO_LEGAL);
  poe("Já usou ou usa outros nomes (nome de solteira, apelido legal)?", sim(simNao(rec, "Is this applicant currently, or have they ever been known by any other names")) ?? undefined);
  poe("É cidadão do país do passaporte?", sim(simNao(rec, "Is this applicant a citizen of the selected country of passport")) ?? undefined);
  poe("Possui carteira de identidade nacional (RG)?", sim(simNao(rec, "Does this applicant have a national identity card")) ?? undefined);
  poe("Número do visto australiano anterior (se tiver)", pega(rec, "Australian visa grant number (if known)"));

  return { campos, avisos };
}
