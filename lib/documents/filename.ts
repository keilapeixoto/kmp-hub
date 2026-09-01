/**
 * Convenção de nome padronizado (docs/spec-controle-documentos.md, seção 4):
 * sobrenome_cliente-tipo_documento-ano_mes_dia.extensao — ex.: silva-extrato_bancario-2026_09_01.pdf
 */
export function standardizedFilename(
  clienteNome: string,
  documentType: string,
  dataIso: string,
  extensao: string,
): string {
  const sobrenome = clienteNome.trim().split(/\s+/).pop() ?? clienteNome;
  const normalizado = sobrenome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const data = dataIso.replaceAll("-", "_");
  return `${normalizado || "cliente"}-${documentType}-${data}.${extensao}`;
}
