import type { DeadlineStatus, ReminderMilestone, RequestType } from "./constants";

export type CaseDeadline = {
  id: string;
  case_id: string;
  tipo_pedido: RequestType;
  data_pedido: string;
  prazo_final: string;
  status: DeadlineStatus;
  documento_recebido_em: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseDeadlineWithContext = CaseDeadline & {
  client_id: string | null;
  client_nome: string;
  client_email: string | null;
};

export type CaseDeadlineReminder = {
  id: string;
  case_deadline_id: string;
  marco_dias: ReminderMilestone;
  destinatario: string;
  status: "enviado" | "falhou";
  detalhe: string | null;
  enviado_por: string | null;
  enviado_em: string;
};

export type ActiveCaseOption = {
  id: string;
  client_nome: string;
  service_type_nome: string;
};

export type DueReminder = {
  deadline: CaseDeadlineWithContext;
  milestone: ReminderMilestone;
  preview: { subject: string; paragraphs: string[] };
};
