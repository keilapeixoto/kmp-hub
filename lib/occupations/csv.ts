import { OCCUPATION_CATEGORIES } from "./constants";

export type ParsedOccupationRow = {
  nome: string;
  codigo_anzsco: string;
  categoria: string;
  autoridade_avaliadora: string;
  nivel_habilidade: number;
  na_csol: boolean;
  na_mltssl_legada: boolean;
  fonte: string | null;
};

export type ParseResult = {
  rows: ParsedOccupationRow[];
  errors: string[];
};

const CABECALHO_ESPERADO = [
  "nome",
  "codigo_anzsco",
  "categoria",
  "autoridade_avaliadora",
  "nivel_habilidade",
  "na_csol",
  "na_mltssl_legada",
  "fonte",
];

function paraBooleano(valor: string): boolean {
  return ["1", "true", "sim", "yes"].includes(valor.trim().toLowerCase());
}

export function parseOccupationsCsv(conteudo: string): ParseResult {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);

  if (linhas.length === 0) {
    return { rows: [], errors: ["Arquivo vazio."] };
  }

  const cabecalho = linhas[0].split(",").map((c) => c.trim().toLowerCase());
  const colunasFaltando = CABECALHO_ESPERADO.filter(
    (c) => !cabecalho.includes(c),
  );
  if (colunasFaltando.length > 0) {
    return {
      rows: [],
      errors: [
        `Cabeçalho inválido. Colunas esperadas: ${CABECALHO_ESPERADO.join(", ")}. Faltando: ${colunasFaltando.join(", ")}.`,
      ],
    };
  }

  const rows: ParsedOccupationRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const numeroLinha = i + 1;
    const valores = linhas[i].split(",").map((v) => v.trim());
    if (valores.length !== cabecalho.length) {
      errors.push(
        `Linha ${numeroLinha}: número de colunas não bate com o cabeçalho.`,
      );
      continue;
    }

    const registro: Record<string, string> = {};
    cabecalho.forEach((coluna, index) => {
      registro[coluna] = valores[index];
    });

    if (!registro.nome) {
      errors.push(`Linha ${numeroLinha}: nome é obrigatório.`);
      continue;
    }
    if (!/^\d{6}$/.test(registro.codigo_anzsco)) {
      errors.push(
        `Linha ${numeroLinha}: código ANZSCO deve ter 6 dígitos.`,
      );
      continue;
    }
    if (
      !OCCUPATION_CATEGORIES.includes(
        registro.categoria as (typeof OCCUPATION_CATEGORIES)[number],
      )
    ) {
      errors.push(
        `Linha ${numeroLinha}: categoria "${registro.categoria}" inválida. Use uma de: ${OCCUPATION_CATEGORIES.join(", ")}.`,
      );
      continue;
    }
    const nivel = Number(registro.nivel_habilidade);
    if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
      errors.push(
        `Linha ${numeroLinha}: nível de habilidade deve ser um número inteiro de 1 a 5.`,
      );
      continue;
    }

    rows.push({
      nome: registro.nome,
      codigo_anzsco: registro.codigo_anzsco,
      categoria: registro.categoria,
      autoridade_avaliadora: registro.autoridade_avaliadora,
      nivel_habilidade: nivel,
      na_csol: paraBooleano(registro.na_csol),
      na_mltssl_legada: paraBooleano(registro.na_mltssl_legada),
      fonte: registro.fonte || null,
    });
  }

  return { rows, errors };
}
