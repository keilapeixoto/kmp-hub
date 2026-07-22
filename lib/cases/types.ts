import type { CasePriority, CaseStatus } from "./constants";

export type ServiceType = {
  id: string;
  nome: string;
  descricao: string | null;
  guia_id: string | null;
  checklist_template_id: string | null;
  arquivado: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseStage = {
  id: string;
  service_type_id: string;
  ordem: number;
  nome: string;
  regras: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Case = {
  id: string;
  client_id: string;
  service_type_id: string;
  consultor_id: string;
  equipe: string[];
  inicio: string;
  prazo: string | null;
  status: CaseStatus;
  etapa_id: string | null;
  prioridade: CasePriority;
  riscos: string | null;
  proxima_acao: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseStatusHistoryEntry = {
  id: string;
  case_id: string;
  campo: "status" | "etapa";
  de: string | null;
  para: string | null;
  autor: string | null;
  created_at: string;
};

export type CaseFilters = {
  consultor?: string;
  servicoTipo?: string;
  status?: string;
  prioridade?: string;
};
