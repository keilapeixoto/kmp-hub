// "Visto aplicado" a partir do nome da pasta da KEY MIGRATION
// (import/key-migration-map.csv, coluna tipo_processo — ex.: "485 APPLICATION /
// APLICADOS", "600 TOURIST VISA", "APPEAL"). Sem dependências: testado em
// tests/unit/visto-da-pasta.test.mjs; usado por scripts/visto-da-key-migration.mjs.

const PALAVRAS: [RegExp, string][] = [
  [/\bAPPEAL\b|\bAAT\b|\bART\b/, "Recurso (AAT)"],
  [/\bUSA\b|\bEUA\b|\bB1\b|\bB2\b/, "EUA B1/B2"],
  [/\bTOURIST\b|\bTURISTA\b/, "600"],
  [/\bBVB\b|\bBRID+ING VISA B\b|\bBRIDGING VISA B\b/, "Bridging B"],
  [/\bPARTNER\b/, "Partner"],
  [/\bPR'?S\b/, "Residência permanente"],
];

export function vistoDaPasta(tipoProcesso: string): string | null {
  const t = tipoProcesso.toUpperCase().trim();
  if (!t || /TEMPLATES|SPONSORS/.test(t)) return null;
  const numero = t.match(/\b(\d{3})\b/)?.[1] ?? null;
  const visto = numero ?? PALAVRAS.find(([re]) => re.test(t))?.[1] ?? null;
  if (!visto) return null;
  const situacao = /APROVADOS?\b/.test(t)
    ? "aprovado"
    : /\bAPLICADOS?\b/.test(t)
      ? "aplicado"
      : /PARA APLICAR/.test(t)
        ? "a aplicar"
        : /WITHDRAWAL/.test(t)
          ? "retirado"
          : null;
  return situacao ? `${visto} · ${situacao}` : visto;
}

/** Entre várias pastas do mesmo cliente, fica a mais específica (com situação). */
export function melhorVisto(rotulos: (string | null)[]): string | null {
  const validos = rotulos.filter((r): r is string => Boolean(r));
  return validos.find((r) => r.includes(" · ")) ?? validos[0] ?? null;
}
