// Variáveis dos templates de e-mail e conversão de texto para HTML. Sem
// dependências do app: roda nos testes (tests/unit/email.test.mjs).

export type VariaveisDoEmail = {
  nome_cliente: string;
  primeiro_nome: string;
  visto: string;
  etapa: string;
  prazo: string;
  consultor: string;
  link_portal: string;
};

/** Nomes antigos que continuam valendo (templates de lembrete de prazo). */
const APELIDOS: Record<string, keyof VariaveisDoEmail> = {
  nome_estudante: "nome_cliente",
};

/** Lista para mostrar na tela de templates. */
export const VARIAVEIS_DISPONIVEIS: { chave: keyof VariaveisDoEmail; descricao: string }[] = [
  { chave: "nome_cliente", descricao: "nome completo do cliente" },
  { chave: "primeiro_nome", descricao: "primeiro nome do cliente" },
  { chave: "visto", descricao: "tipo de visto do processo" },
  { chave: "etapa", descricao: "etapa atual do processo" },
  { chave: "prazo", descricao: "prazo do processo" },
  { chave: "consultor", descricao: "nome de quem está enviando" },
  { chave: "link_portal", descricao: "endereço do portal do cliente" },
];

/** Troca {{variavel}} pelos valores; variáveis desconhecidas ficam como estão. */
export function preencherVariaveis(texto: string, vars: VariaveisDoEmail): string {
  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (inteiro, nome: string) => {
    const chave = (APELIDOS[nome] ?? nome) as keyof VariaveisDoEmail;
    return chave in vars ? vars[chave] : inteiro;
  });
}

export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Texto digitado vira HTML seguro: linha em branco separa parágrafos. */
export function textoParaHtml(texto: string): string {
  return texto
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.split("\n").map(escaparHtml).join("<br>")}</p>`)
    .join("");
}
