// O que acontece sozinho quando um processo entra numa etapa (pelo nome da
// etapa, que a equipe edita em Tipos de serviço). Out/2026, fluxo do 485 da
// Keila: aplicou o visto, aguarda exame médico (28 dias), pode vir pedido da
// imigração, visto aprovado. Sem dependências: testado em
// tests/unit/efeitos-da-etapa.test.mjs.

export type EfeitosDaEtapa = {
  /** cases.aplicacao_status ("Andamento da aplicação"). */
  aplicacao?: "enviada" | "em_analise" | "pedido_informacao" | "concedida";
  /** cases.skills_status. */
  skills?: "aplicado" | "aprovado";
  /** Abre um prazo de 28 dias em Vencimentos → Prazos de 28 dias. */
  prazo?: "exame_medico" | "informacao_adicional";
};

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function efeitosDaEtapa(nome: string): EfeitosDaEtapa {
  const n = normalizar(nome);
  if (/exame medico|medical/.test(n)) return { prazo: "exame_medico" };
  if (/request|pedido da imigracao|informacao adicional|\brfi\b/.test(n)) {
    return { aplicacao: "pedido_informacao", prazo: "informacao_adicional" };
  }
  if (/aguardando aprovacao.*skill/.test(n)) return { skills: "aplicado" };
  if (/skills? assessment aplicado|skill.*aplicad/.test(n)) return { skills: "aplicado" };
  if (/visto aprovado|visa granted|concedido/.test(n)) return { aplicacao: "concedida" };
  if (/visto aplicado|pos-submissao|aplicacao enviada/.test(n)) return { aplicacao: "em_analise" };
  return {};
}

/** Data + 28 dias (AAAA-MM-DD). */
export function mais28Dias(dataIso: string): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 28);
  return d.toISOString().slice(0, 10);
}
