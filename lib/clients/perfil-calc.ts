// Contas do perfil do cliente (cabeçalho com indicadores, lista de tarefas).
// Sem dependências do app: roda nos testes (tests/unit/perfil-cliente.test.mjs).

/** Iniciais para o avatar sem foto: primeiro e último nome. */
export function iniciais(nome: string): string {
  // Primeira letra de cada palavra, ignorando pontuação: "(temporário)" vira "t".
  const partes = nome
    .trim()
    .split(/\s+/)
    .map((p) => p.match(/\p{L}/u)?.[0] ?? "")
    .filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0];
  const ultima = partes.length > 1 ? partes[partes.length - 1] : "";
  return (primeira + ultima).toUpperCase();
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** "hoje", "amanhã", "em 5 dias", "ontem", "há 14 dias" — datas no formato AAAA-MM-DD. */
export function prazoRelativo(
  prazo: string | null,
  hoje: string,
): { texto: string; atrasado: boolean } | null {
  if (!prazo) return null;
  const dias = Math.round(
    (Date.parse(`${prazo.slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / DIA_MS,
  );
  if (dias === 0) return { texto: "hoje", atrasado: false };
  if (dias === 1) return { texto: "amanhã", atrasado: false };
  if (dias === -1) return { texto: "ontem", atrasado: true };
  return dias > 0
    ? { texto: `em ${dias} dias`, atrasado: false }
    : { texto: `há ${-dias} dias`, atrasado: true };
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 6 dias"; mais de 30 dias vira a data (DD/MM/AAAA). */
export function haQuantoTempo(iso: string, agora: Date): string {
  const minutos = Math.floor((agora.getTime() - Date.parse(iso)) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias <= 30) return `há ${dias} dias`;
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export type ResumoParaIndicador = {
  status: string;
  checklistPct: number | null;
  formularioPct: number | null;
  pendentesCliente: number;
  prazo: string | null;
};

const EM_ANDAMENTO = ["ativo", "pausado"];

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/**
 * Números do cabeçalho do perfil. Só processos ativos/pausados contam;
 * processo sem checklist ou sem formulário fica fora da média daquele item.
 */
export function indicadoresDoCliente(processos: ResumoParaIndicador[]) {
  const abertos = processos.filter((p) => EM_ANDAMENTO.includes(p.status));
  const prazos = abertos
    .map((p) => p.prazo)
    .filter((p): p is string => Boolean(p))
    .sort();
  return {
    processosEmAndamento: abertos.length,
    checklistPct: media(abertos.flatMap((p) => (p.checklistPct === null ? [] : [p.checklistPct]))),
    formularioPct: media(abertos.flatMap((p) => (p.formularioPct === null ? [] : [p.formularioPct]))),
    pendentesCliente: abertos.reduce((total, p) => total + p.pendentesCliente, 0),
    proximoPrazo: prazos[0] ?? null,
  };
}

const ABERTAS = ["pendente", "em_andamento"];

/** Abertas primeiro (prazo mais próximo antes, sem prazo no fim), depois as encerradas. */
export function ordenarTarefas<T extends { status: string; prazo: string | null }>(tarefas: T[]): T[] {
  const chave = (t: T) => [ABERTAS.includes(t.status) ? 0 : 1, t.prazo ? 0 : 1, t.prazo ?? ""] as const;
  return [...tarefas].sort((a, b) => {
    const ka = chave(a);
    const kb = chave(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });
}
