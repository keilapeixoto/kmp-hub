import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type VisaPanelRow = {
  id: string;
  nome: string;
  visto_atual_subclasse: string | null;
  visto_atual_validade: string | null;
  visto_alerta_limite_dias: number | null;
  /** Já tem processo ativo (o "próximo processo" já foi alocado). */
  temProcessoAtivo: boolean;
};

/**
 * Radar de vistos (out/2026, pedido da Keila: "ficar ali no radar a data de
 * vencimento e eu aloco qual processo seria"): todo cliente com vencimento
 * de visto cadastrado, mais os que têm processo ativo mesmo sem data
 * (aparecem em "Sem data"). Antes eram só os com processo ativo.
 */
export async function getClientsWithActiveVisa(): Promise<VisaPanelRow[]> {
  const supabase = await createSupabaseClient();
  const campos = "id, nome, visto_atual_subclasse, visto_atual_validade, visto_alerta_limite_dias";

  const [comData, comProcesso] = await Promise.all([
    supabase.from("clients").select(campos).not("visto_atual_validade", "is", null).range(0, 4999),
    supabase
      .from("clients")
      .select(`${campos}, cases!inner(status)`)
      .eq("cases.status", "ativo")
      .range(0, 4999),
  ]);
  if (comData.error) throw comData.error;
  if (comProcesso.error) throw comProcesso.error;

  const ativos = new Set((comProcesso.data ?? []).map((r) => r.id as string));
  const porId = new Map<string, VisaPanelRow>();
  for (const row of [...(comData.data ?? []), ...(comProcesso.data ?? [])]) {
    porId.set(row.id as string, {
      id: row.id as string,
      nome: row.nome as string,
      visto_atual_subclasse: row.visto_atual_subclasse as string | null,
      visto_atual_validade: row.visto_atual_validade as string | null,
      visto_alerta_limite_dias: row.visto_alerta_limite_dias as number | null,
      temProcessoAtivo: ativos.has(row.id as string),
    });
  }
  return [...porId.values()];
}
