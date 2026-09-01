import { DOCUMENT_EXPIRY_THRESHOLD_DAYS, VISA_ALERT_THRESHOLDS, type VisaUrgency } from "./constants";

export function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** true se o documento já venceu ou vence dentro do limite de alerta (90 dias). */
export function isDocumentExpiringSoon(validade: string | null): boolean {
  if (!validade) return false;
  return daysUntil(validade) <= DOCUMENT_EXPIRY_THRESHOLD_DAYS;
}

/**
 * Faixa de urgência do visto atual (painel /vencimentos). `limiteCriticoOverride`
 * substitui só o limite "crítico" (30d) — `visto_alerta_limite_dias` do cliente.
 */
export function visaUrgency(
  validade: string,
  limiteCriticoOverride?: number | null,
): VisaUrgency {
  const dias = daysUntil(validade);
  const limiteCritico = limiteCriticoOverride ?? VISA_ALERT_THRESHOLDS.critico;

  if (dias < 0) return "vencido";
  if (dias <= limiteCritico) return "critico";
  if (dias <= VISA_ALERT_THRESHOLDS.atencao) return "atencao";
  if (dias <= VISA_ALERT_THRESHOLDS.monitorar) return "monitorar";
  return "sem_urgencia";
}
