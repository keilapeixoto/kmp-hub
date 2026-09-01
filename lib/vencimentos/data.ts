import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type VisaPanelRow = {
  id: string;
  nome: string;
  visto_atual_subclasse: string | null;
  visto_atual_validade: string | null;
  visto_alerta_limite_dias: number | null;
};

/**
 * Clientes com pelo menos um processo ativo (status = 'ativo'), qualquer que
 * seja a etapa — escopo definido pela Keila (docs/spec-vencimento-vistos.md,
 * seção 7.4). O embed `cases!inner(status)` faz o filtro por processo ativo
 * sem duplicar a linha do cliente por processo.
 */
export async function getClientsWithActiveVisa(): Promise<VisaPanelRow[]> {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, nome, visto_atual_subclasse, visto_atual_validade, visto_alerta_limite_dias, cases!inner(status)",
    )
    .eq("cases.status", "ativo")
    .range(0, 4999);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    nome: row.nome as string,
    visto_atual_subclasse: row.visto_atual_subclasse as string | null,
    visto_atual_validade: row.visto_atual_validade as string | null,
    visto_alerta_limite_dias: row.visto_alerta_limite_dias as number | null,
  }));
}
