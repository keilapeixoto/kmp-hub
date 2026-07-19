import { DOCUMENT_EXPIRY_THRESHOLD_DAYS } from "./constants";

export function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** true se o documento já venceu ou vence dentro do limite de alerta (90 dias). */
export function isDocumentExpiringSoon(validade: string | null): boolean {
  if (!validade) return false;
  return daysUntil(validade) <= DOCUMENT_EXPIRY_THRESHOLD_DAYS;
}
