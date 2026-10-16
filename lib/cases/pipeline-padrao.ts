// Colunas da Pipeline com todos os vistos juntos (out/2026: "as pipelines
// precisam ser padrões"). As etapas têm o mesmo nome em todos os vistos
// (scripts/pipeline-padrao.mjs); etapa que só um visto tem entra na posição
// média em que aparece. Sem dependências: testado em tests/unit/pipeline-padrao.test.mjs.

export type EtapaComTipo = { id: string; nome: string; ordem: number; service_type_id: string };

/** Nomes das colunas na ordem: pela posição média de cada nome nos vistos. */
export function colunasPadrao(etapas: EtapaComTipo[]): string[] {
  const soma = new Map<string, { total: number; n: number }>();
  for (const e of etapas) {
    const a = soma.get(e.nome) ?? { total: 0, n: 0 };
    soma.set(e.nome, { total: a.total + e.ordem, n: a.n + 1 });
  }
  return [...soma.entries()]
    .sort((a, b) => a[1].total / a[1].n - b[1].total / b[1].n || b[1].n - a[1].n)
    .map(([nome]) => nome);
}

/** Etapa com aquele nome no visto do processo (para arrastar entre colunas). */
export function etapaDoVisto(etapas: EtapaComTipo[], serviceTypeId: string, nome: string): string | null {
  return etapas.find((e) => e.service_type_id === serviceTypeId && e.nome === nome)?.id ?? null;
}

/** Vencimento do visto atual em destaque: cor e texto (vencido é sempre vermelho). */
export function destaqueDoVencimento(
  validade: string | null | undefined,
  hoje: string,
): { cor: "vermelho" | "laranja" | "amarelo" | "verde"; texto: string; data: string } | null {
  if (!validade) return null;
  const v = validade.slice(0, 10);
  const dias = Math.round((Date.parse(`${v}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 864e5);
  const data = `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
  if (dias < 0) return { cor: "vermelho", texto: `venceu há ${-dias}d`, data };
  if (dias === 0) return { cor: "vermelho", texto: "vence hoje", data };
  if (dias <= 30) return { cor: "laranja", texto: `faltam ${dias}d`, data };
  if (dias <= 90) return { cor: "amarelo", texto: `faltam ${dias}d`, data };
  return { cor: "verde", texto: `faltam ${dias}d`, data };
}
