// KMP Hub · Leitura de carta de concessão de visto (grant notice) e de
// consulta VEVO do Department of Home Affairs. Só transforma texto em dados;
// não grava nada e não tem dependências (roda em Server Action, script e
// teste — tests/unit/carta-visto.test.mjs). Os rótulos seguem o padrão do
// Home Affairs; cartas com rótulos diferentes caem em "avisos" e a pessoa
// completa à mão na tela de confirmação.

export type CartaDoVisto = {
  tipo: "grant" | "vevo" | null;
  nome: string | null;
  dataNascimento: string | null;
  passaporte: string | null;
  subclasse: string | null;
  stream: string | null;
  dataConcessao: string | null;
  /** Vencimento do visto ("Visa expiry date"/"Visa ceases"). */
  dataVencimento: string | null;
  /** Para vistos de estadia por período ("stay until"): até quando pode ficar. */
  permanenciaAte: string | null;
  avisos: string[];
};

const MESES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** "15 March 2029", "01 Feb 2025", "21/07/1990" → "AAAA-MM-DD" (dia/mês, padrão australiano). */
export function dataIso(texto: string): string | null {
  const t = texto.trim();
  let m = t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/);
  if (m) {
    const mes = MESES[m[2].slice(0, m[2].toLowerCase().startsWith("sept") ? 4 : 3).toLowerCase()];
    if (!mes) return null;
    return `${m[3]}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${m[3]}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  return null;
}

function nomeProprio(texto: string): string {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Valor do rótulo: na mesma linha ou, se vazio, na linha seguinte. */
function valorDe(linhas: string[], rotulo: RegExp): string | null {
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(rotulo);
    if (!m) continue;
    const resto = linhas[i].slice((m.index ?? 0) + m[0].length).replace(/^\s*[:\-]\s*/, "").trim();
    if (resto) return resto;
    const seguinte = linhas.slice(i + 1).find((l) => l.trim());
    return seguinte?.trim() ?? null;
  }
  return null;
}

export function lerCartaDoVisto(texto: string): CartaDoVisto {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const corrido = linhas.join(" ");
  const avisos: string[] = [];

  const tipo: CartaDoVisto["tipo"] = /Visa Entitlement Verification Online|\bVEVO\b/i.test(corrido)
    ? "vevo"
    : /visa grant notice|grant notification|grant of (a|your) visa|Visa grant number/i.test(corrido)
      ? "grant"
      : null;
  if (!tipo) avisos.push("Não parece uma carta de concessão de visto nem uma consulta VEVO.");

  const familia = valorDe(linhas, /^Family name\b/i);
  const dados = valorDe(linhas, /^Given names?\b/i);
  const nome = [dados, familia].filter(Boolean).join(" ").trim();

  const subclasse =
    corrido.match(/subclass\s*(\d{3})\b/i)?.[1] ??
    corrido.match(/Visa class\s*\/\s*subclass\s*:?\s*[A-Z]{2}\s*\/\s*(\d{3})\b/i)?.[1] ??
    null;
  if (tipo && !subclasse) avisos.push("Não achei a subclasse do visto.");

  const stream = valorDe(linhas, /^(Visa )?stream\b/i);
  const concessao = valorDe(linhas, /^(Visa grant date|Date of grant|Grant date)\b/i);
  const vencimento = valorDe(linhas, /^(Visa expiry date|Expiry date|Visa ceases|Visa end date)\b/i);
  const permanencia = corrido.match(/stay until\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] ?? null;
  const nascimento = valorDe(linhas, /^Date of birth\b/i);
  const passaporte =
    valorDe(linhas, /^(Passport number|Document number|Travel document number)\b/i)?.match(/[A-Z0-9]{6,12}/)?.[0] ?? null;

  const dataVencimento = vencimento ? dataIso(vencimento) : null;
  const permanenciaAte = permanencia ? dataIso(permanencia) : null;
  if (tipo && !dataVencimento && !permanenciaAte) {
    avisos.push("Não achei a data de vencimento do visto. Preencha à mão antes de salvar.");
  }

  return {
    tipo,
    nome: nome ? nomeProprio(nome) : null,
    dataNascimento: nascimento ? dataIso(nascimento) : null,
    passaporte,
    subclasse,
    stream: stream && stream.length <= 80 ? stream : null,
    dataConcessao: concessao ? dataIso(concessao) : null,
    dataVencimento,
    permanenciaAte,
    avisos,
  };
}
