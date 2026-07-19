import type { ChecklistItemStatus } from "./constants";

export type ChecklistTemplate = {
  id: string;
  service_type_id: string;
  nome: string;
  created_at: string;
  updated_at: string;
};

export type ChecklistTemplateItem = {
  id: string;
  checklist_template_id: string;
  ordem: number;
  nome: string;
  descricao: string | null;
  exemplo: string | null;
  formato: string | null;
  validade_dias: number | null;
  obrigatorio: boolean;
  condicional: boolean;
  created_at: string;
  updated_at: string;
};

export type Checklist = {
  id: string;
  case_id: string;
  checklist_template_id: string;
  percentual: number;
  created_at: string;
  updated_at: string;
};

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  template_item_id: string | null;
  nome: string;
  descricao: string | null;
  status: ChecklistItemStatus;
  responsavel: string | null;
  observacao_equipe: string | null;
  observacao_cliente: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  updated_at: string;
};
