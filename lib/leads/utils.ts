import { CLOSED_LEAD_STATUSES, INACTIVITY_THRESHOLD_DAYS } from "./constants";
import type { Lead } from "./types";

export function daysSince(dateIso: string): number {
  const ms = Date.now() - new Date(dateIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Dias desde o último contato (ou desde a criação, se nunca houve contato). */
export function daysSinceLastContact(lead: Pick<Lead, "ultimo_contato" | "created_at">): number {
  return daysSince(lead.ultimo_contato ?? lead.created_at);
}

export function isLeadInactive(lead: Pick<Lead, "status" | "ultimo_contato" | "created_at">): boolean {
  if (CLOSED_LEAD_STATUSES.has(lead.status)) return false;
  return daysSinceLastContact(lead) >= INACTIVITY_THRESHOLD_DAYS;
}
