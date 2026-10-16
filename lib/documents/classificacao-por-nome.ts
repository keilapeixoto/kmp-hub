// Identifica o documento pelo NOME do arquivo, sem IA: palavras-chave por
// tipo e as palavras que só um item do checklist tem (ex.: "endereço" em
// "Comprovante de endereço", que o distingue de "Comprovante de renda").
// Usado quando a classificação por IA não está disponível ou ficou incerta.
// Sem dependências: testado em tests/unit/classificacao-por-nome.test.mjs.

export type Candidato = { id: string; nome: string };
export type PorNome = { checklistItemId: string | null; documentType: string; rotulo: string | null } | null;

function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PALAVRAS_SEM_PESO = new Set([
  "de", "da", "do", "das", "dos", "e", "ou", "com", "para", "the", "of", "and", "copia", "pagina", "dados",
  "documento", "documentos", "comprovante", "certidao", "ultimos", "meses", "solicitante", "se", "houver",
  "quem", "na", "no", "em", "jpg", "jpeg", "png", "pdf", "heic", "img", "scan", "whatsapp", "image", "foto",
]);

/** Sinônimos que aparecem em nome de arquivo -> palavra do nome do item. */
const SINONIMOS: Record<string, string[]> = {
  passaporte: ["passaporte", "passport", "pass"],
  extrato: ["extrato", "extratos", "statement", "statements", "bank", "banco", "saldo"],
  renda: ["renda", "holerite", "holerites", "contracheque", "salario", "irpf", "imposto", "income", "payslip", "inss"],
  vinculo: ["vinculo", "trabalho", "empregador", "empresa", "declaracao", "employment", "matricula"],
  endereco: ["endereco", "residencia", "address", "conta", "luz", "agua", "energia", "internet"],
  casamento: ["casamento", "marriage", "casada", "casado"],
  divorcio: ["divorcio", "divorce", "averbacao"],
  empresa: ["cnpj", "mei", "contrato social", "abertura"],
  convida: ["convite", "invitation", "anfitriao", "host"],
  itinerario: ["itinerario", "itinerary", "voo", "voos", "flight", "passagem", "passagens", "reserva", "booking"],
  traducao: ["traducao", "translation", "juramentada", "translated"],
};

/** Palavras-chave -> tipo geral (lib/documents/constants.ts). */
const TIPOS: [string, string[]][] = [
  ["passaporte", ["passaporte", "passport"]],
  ["extrato_bancario", ["extrato", "statement", "bank"]],
  ["certidao_antecedentes", ["antecedente", "antecedentes", "police", "criminal", "afp"]],
  ["seguro_saude", ["seguro", "insurance", "oshc", "ovhc"]],
  ["comprovante_ingles", ["ielts", "pte", "toefl", "cambridge", "ingles", "english"]],
  ["exame_medico", ["medical", "exame", "hap", "bupa"]],
  ["skills_assessment", ["skills", "vetassess", "acs", "tra", "assessment"]],
  ["coe", ["coe", "enrolment", "enrollment"]],
  ["comprovante_qualificacao", ["diploma", "certificado", "transcript", "historico", "qualificacao"]],
];

function palavras(t: string): string[] {
  return normalizar(t).split(" ").filter((p) => p.length >= 3 && !PALAVRAS_SEM_PESO.has(p) && !/^\d+$/.test(p));
}

/** Palavras do item expandidas com os sinônimos. */
function vocabulario(nomeItem: string): Set<string> {
  const v = new Set<string>();
  for (const p of palavras(nomeItem)) {
    v.add(p);
    for (const [chave, lista] of Object.entries(SINONIMOS)) {
      if (p === chave || lista.includes(p)) lista.forEach((s) => s.split(" ").forEach((x) => v.add(x)));
    }
  }
  return v;
}

export function classificarPeloNome(nomeArquivo: string, candidatos: Candidato[]): PorNome {
  const doArquivo = new Set(palavras(nomeArquivo.replace(/\.[a-z0-9]{2,5}$/i, "")));
  if (doArquivo.size === 0) return null;

  const tipo = TIPOS.find(([, chaves]) => chaves.some((c) => doArquivo.has(c)))?.[0] ?? null;

  // Item do checklist: primeiro as palavras que só ele tem; depois quantas
  // palavras bateram; por fim o item mais específico (menos palavras), para
  // "passaporte.pdf" ir para "Passaporte" e não para "Passaporte e visto de
  // quem convida".
  const vocabs = candidatos.map((c) => ({ c, v: vocabulario(c.nome) }));
  const pontos = vocabs
    .map(({ c, v }) => {
      const batem = [...v].filter((p) => doArquivo.has(p));
      const exclusivas = batem.filter((p) => !vocabs.some((o) => o.c.id !== c.id && o.v.has(p)));
      return { c, excl: exclusivas.length, total: batem.length, razao: batem.length / v.size };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.excl - a.excl || b.total - a.total || b.razao - a.razao);
  const [primeiro, segundo] = pontos;
  const empate =
    segundo && segundo.excl === primeiro.excl && segundo.total === primeiro.total && segundo.razao === primeiro.razao;
  const item = primeiro && !empate ? primeiro.c : null;

  if (!item && !tipo) return null;
  return { checklistItemId: item?.id ?? null, documentType: tipo ?? "outro", rotulo: item?.nome ?? null };
}

/** "Comprovante de endereço" -> "comprovante_de_endereco" (para o nome padronizado do arquivo). */
export function rotuloParaNome(rotulo: string): string {
  return normalizar(rotulo).replace(/ /g, "_").slice(0, 50);
}
