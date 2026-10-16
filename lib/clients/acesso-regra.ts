// Regra do acesso ao portal (out/2026, pedido da Keila): o login do portal é
// sempre o e-mail do cadastro do cliente. Decide o que fazer quando o e-mail
// muda. Sem dependências: testado em tests/unit/acesso-portal.test.mjs; quem
// executa é lib/clients/portal-acesso.ts.

export type AcessoAtual = { id: string; userId: string; email: string | null; outrosClientes: number };
export type ContaDoEmail = { userId: string; ehEquipe: boolean } | null;

export type Plano =
  | { resultado: "nada" }
  | { resultado: "removido"; remover: string[] }
  | { resultado: "renomeado"; renomear: { userId: string; email: string }; remover: string[] }
  | { resultado: "movido"; remover: string[]; vincular: string }
  | { resultado: "convidar"; remover: string[] }
  | { resultado: "equipe" };

const igual = (a: string | null, b: string | null) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export function planoDoAcesso(emailNovo: string | null, acessos: AcessoAtual[], conta: ContaDoEmail): Plano {
  if (acessos.length === 0) return { resultado: "nada" };
  const email = emailNovo?.trim().toLowerCase() || null;
  if (!email) return { resultado: "removido", remover: acessos.map((a) => a.id) };

  const certos = acessos.filter((a) => igual(a.email, email));
  const errados = acessos.filter((a) => !igual(a.email, email)).map((a) => a.id);
  if (certos.length) return errados.length ? { resultado: "removido", remover: errados } : { resultado: "nada" };

  if (conta) {
    if (conta.ehEquipe) return { resultado: "equipe" };
    return { resultado: "movido", remover: errados, vincular: conta.userId };
  }
  // Ninguém tem o e-mail novo: troca o e-mail da conta, se ela for só deste cliente.
  if (acessos.length === 1 && acessos[0].outrosClientes === 0) {
    return { resultado: "renomeado", renomear: { userId: acessos[0].userId, email }, remover: [] };
  }
  return { resultado: "convidar", remover: errados };
}
