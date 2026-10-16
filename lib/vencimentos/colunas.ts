import { createClient } from "@/lib/supabase/server";
import { VISA_URGENCY_LABELS } from "@/lib/clients/constants";
import type { VisaBucket } from "./constants";

export const CHAVE_COLUNAS = "vencimentos.colunas";

export const NOMES_PADRAO: Record<VisaBucket, string> = {
  ...VISA_URGENCY_LABELS,
  sem_data: "Sem data cadastrada",
};

/** Nomes das colunas do radar (os da equipe por cima dos padrões). Sem a tabela, usa os padrões. */
export async function getNomesDasColunas(): Promise<Record<VisaBucket, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("valor").eq("chave", CHAVE_COLUNAS).maybeSingle();
  const salvos = (data?.valor ?? {}) as Partial<Record<VisaBucket, string>>;
  const nomes = { ...NOMES_PADRAO };
  for (const k of Object.keys(nomes) as VisaBucket[]) {
    if (typeof salvos[k] === "string" && salvos[k]!.trim()) nomes[k] = salvos[k]!.trim();
  }
  return nomes;
}
