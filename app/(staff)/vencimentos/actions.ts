"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VISA_ALERT_THRESHOLDS } from "@/lib/clients/constants";
import type { VisaBucket } from "@/lib/vencimentos/constants";

/** Data representativa de cada coluna — não é a data exata do visto, só uma reclassificação rápida por arraste. */
function targetDateForBucket(
  bucket: Exclude<VisaBucket, "sem_data">,
  limiteCriticoOverride: number | null,
): string {
  const addDays = (n: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const limiteCritico = limiteCriticoOverride ?? VISA_ALERT_THRESHOLDS.critico;

  switch (bucket) {
    case "vencido":
      return addDays(-1);
    case "critico":
      return addDays(Math.round(limiteCritico / 2));
    case "atencao":
      return addDays(Math.round((limiteCritico + VISA_ALERT_THRESHOLDS.atencao) / 2));
    case "monitorar":
      return addDays(
        Math.round((VISA_ALERT_THRESHOLDS.atencao + VISA_ALERT_THRESHOLDS.monitorar) / 2),
      );
    case "sem_urgencia":
      return addDays(VISA_ALERT_THRESHOLDS.monitorar + 30);
  }
}

/**
 * Arrastar um cliente para outra coluna do painel /vencimentos — reclassifica
 * rápido ajustando visto_atual_validade para uma data representativa da
 * faixa (não a data exata). Para o vencimento real, editar em /clientes/[id].
 */
export async function updateVisaBucketDrag(clientId: string, bucket: VisaBucket) {
  const supabase = await createClient();

  if (bucket === "sem_data") {
    await supabase
      .from("clients")
      .update({ visto_atual_validade: null })
      .eq("id", clientId);
    revalidatePath("/vencimentos");
    return;
  }

  const { data } = await supabase
    .from("clients")
    .select("visto_alerta_limite_dias")
    .eq("id", clientId)
    .maybeSingle();

  const visto_atual_validade = targetDateForBucket(
    bucket,
    (data?.visto_alerta_limite_dias as number | null) ?? null,
  );

  await supabase.from("clients").update({ visto_atual_validade }).eq("id", clientId);
  revalidatePath("/vencimentos");
}
