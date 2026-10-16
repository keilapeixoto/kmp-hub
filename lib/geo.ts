// Listas para os campos de país, nacionalidade, fuso horário e endereço do
// cadastro do cliente. Nomes de país vêm do próprio navegador/Node
// (Intl.DisplayNames), então não há tabela de tradução para manter. Sem
// dependências: testado em tests/unit/geo.test.mjs.

/** ISO 3166-1 alfa-2 (países e territórios habitados). */
const CODIGOS =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  );

export type Pais = { codigo: string; nome: string };

/** Países em português, com Brasil e Austrália no topo (os mais usados). */
export function listaDePaises(): Pais[] {
  const nomes = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const todos = CODIGOS.map((codigo) => ({ codigo, nome: nomes.of(codigo) ?? codigo })).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
  const topo = ["BR", "AU"];
  return [...topo.map((c) => todos.find((p) => p.codigo === c)!), ...todos.filter((p) => !topo.includes(p.codigo))];
}

export const ESTADOS: Record<string, { sigla: string; nome: string }[]> = {
  AU: [
    { sigla: "NSW", nome: "New South Wales" },
    { sigla: "VIC", nome: "Victoria" },
    { sigla: "QLD", nome: "Queensland" },
    { sigla: "WA", nome: "Western Australia" },
    { sigla: "SA", nome: "South Australia" },
    { sigla: "TAS", nome: "Tasmania" },
    { sigla: "ACT", nome: "Australian Capital Territory" },
    { sigla: "NT", nome: "Northern Territory" },
  ],
  BR: [
    ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
    ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
    ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
    ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
    ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
    ["SE", "Sergipe"], ["TO", "Tocantins"],
  ].map(([sigla, nome]) => ({ sigla, nome })),
};

/** Código do país a partir do nome gravado (aceita "Brasil", "BRAZIL", "Australia"...). */
export function codigoDoPais(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const n = nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  const pt = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const en = new Intl.DisplayNames(["en"], { type: "region" });
  const sem = (t: string | undefined) => (t ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return CODIGOS.find((c) => sem(pt.of(c)) === n || sem(en.of(c)) === n || c.toLowerCase() === n) ?? null;
}

export type Fuso = { id: string; rotulo: string; regiao: string };

/** Todos os fusos do mundo, agrupados por região, com o deslocamento de hoje (ex.: GMT-3). */
export function listaDeFusos(agora = new Date()): Fuso[] {
  return Intl.supportedValuesOf("timeZone").map((id) => {
    const offset =
      new Intl.DateTimeFormat("en", { timeZone: id, timeZoneName: "shortOffset" })
        .formatToParts(agora)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    const [regiao, ...resto] = id.split("/");
    return { id, regiao, rotulo: `${(resto.join(" / ") || id).replace(/_/g, " ")} (${offset})` };
  });
}

/** Endereço estruturado, guardado como JSON nas colunas endereco_origem / endereco_australia. */
export type Endereco = {
  pais: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
};

export const ENDERECO_VAZIO: Endereco = {
  pais: null, estado: null, cidade: null, bairro: null, rua: null, numero: null, complemento: null, cep: null,
};

/** Lê o que está na coluna: JSON novo ou texto livre antigo (vai inteiro para "rua"). */
export function lerEndereco(valor: string | null | undefined, paisPadrao: string | null = null): Endereco {
  if (!valor) return { ...ENDERECO_VAZIO, pais: paisPadrao };
  try {
    const obj = JSON.parse(valor);
    if (obj && typeof obj === "object") return { ...ENDERECO_VAZIO, ...obj };
  } catch {
    // texto livre de antes
  }
  return { ...ENDERECO_VAZIO, pais: paisPadrao, rua: valor };
}

/** Uma linha legível ("Rua X, 10, ap 2 — Centro, Campinas/SP, 13000-000, Brasil"). */
export function enderecoEmTexto(e: Endereco): string {
  const linha1 = [e.rua, e.numero, e.complemento].filter(Boolean).join(", ");
  const local = [e.bairro, [e.cidade, e.estado].filter(Boolean).join("/"), e.cep].filter(Boolean).join(", ");
  return [linha1, local, e.pais].filter(Boolean).join(" — ");
}
