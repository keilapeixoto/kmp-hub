export type Appointment = {
  id: string;
  titulo: string;
  tipo: string | null;
  client_id: string | null;
  lead_id: string | null;
  case_id: string | null;
  responsavel: string;
  inicio: string;
  fim: string | null;
  fusos_exibidos: string[];
  google_event_id: string | null;
  lembretes: unknown[];
  created_at: string;
  updated_at: string;
};

export type AppointmentSummary = {
  id: string;
  appointment_id: string;
  resumo: string;
  decisoes: string | null;
  riscos: string | null;
  documentos_solicitados: string | null;
  proximos_passos: string | null;
  proximo_acompanhamento: string | null;
  autor: string;
  created_at: string;
  updated_at: string;
};
