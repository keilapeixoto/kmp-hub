// Reordenar e acrescentar etapas de um tipo de serviço (pipeline por etapa).
// Sem dependências do app: roda no servidor e nos testes.

type EtapaOrdem = { id: string; ordem: number };

/** Novas ordens das duas etapas que trocam de lugar, ou null se não dá para mover. */
export function trocaDeOrdem(
  etapas: EtapaOrdem[],
  id: string,
  direcao: "subir" | "descer",
): EtapaOrdem[] | null {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
  const i = ordenadas.findIndex((e) => e.id === id);
  const j = direcao === "subir" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ordenadas.length) return null;
  return [
    { id: ordenadas[i].id, ordem: ordenadas[j].ordem },
    { id: ordenadas[j].id, ordem: ordenadas[i].ordem },
  ];
}

/** Ordem de uma etapa nova: depois da última. */
export function proximaOrdem(etapas: EtapaOrdem[]): number {
  return etapas.reduce((max, e) => Math.max(max, e.ordem), 0) + 1;
}
