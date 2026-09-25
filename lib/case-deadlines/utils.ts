import { daysUntil } from "@/lib/clients/utils";
import {
  DEADLINE_ALERT_THRESHOLD_DAYS,
  DEADLINE_WINDOW_DAYS,
  REMINDER_MILESTONES,
  SKILLS_ASSESSMENT_ALERT_THRESHOLD_DAYS,
  type ReminderMilestone,
} from "./constants";
import type { CaseDeadline } from "./types";

export function defaultPrazoFinal(dataPedidoIso: string): string {
  const d = new Date(dataPedidoIso);
  d.setUTCDate(d.getUTCDate() + DEADLINE_WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

/** Alerta vermelho pra Keila: aguardando documento e a 7 dias ou menos do prazo (seção 4 da spec). */
export function isDeadlineUrgent(
  deadline: Pick<CaseDeadline, "status" | "prazo_final">,
): boolean {
  if (deadline.status !== "aguardando_documento") return false;
  return daysUntil(deadline.prazo_final) <= DEADLINE_ALERT_THRESHOLD_DAYS;
}

/** Alerta específico pra preparar carta de extensão de skills assessment (seção 4 da spec). */
export function needsExtensionLetterAlert(
  deadline: Pick<CaseDeadline, "tipo_pedido" | "status" | "prazo_final">,
): boolean {
  if (deadline.tipo_pedido !== "skills_assessment_pendente") return false;
  if (deadline.status !== "aguardando_documento") return false;
  return daysUntil(deadline.prazo_final) <= SKILLS_ASSESSMENT_ALERT_THRESHOLD_DAYS;
}

/** Marco de lembrete (14/7/3/1) cujos dias restantes batem exatamente hoje — null se nenhum. */
export function dueMilestoneToday(prazoFinalIso: string): ReminderMilestone | null {
  const dias = daysUntil(prazoFinalIso);
  return REMINDER_MILESTONES.find((m) => m === dias) ?? null;
}
