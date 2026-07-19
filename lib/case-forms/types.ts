export type CaseFormFieldType = "text" | "textarea" | "select" | "date" | "radio" | "checkbox";

export type CaseFormTemplate = {
  id: string;
  service_type_id: string;
  nome: string;
  created_at: string;
  updated_at: string;
};

export type CaseFormStep = {
  id: string;
  template_id: string;
  ordem: number;
  titulo: string;
  created_at: string;
  updated_at: string;
};

export type CaseFormField = {
  id: string;
  step_id: string;
  ordem: number;
  label: string;
  ajuda: string | null;
  tipo: CaseFormFieldType;
  opcoes: string[] | null;
  obrigatorio: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseFormStatus = "em_preenchimento" | "enviado" | "em_analise" | "aprovado";

export type CaseForm = {
  id: string;
  case_id: string;
  template_id: string;
  status: CaseFormStatus;
  enviado_em: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseFormResponse = {
  id: string;
  case_form_id: string;
  field_id: string;
  valor: string | null;
  created_at: string;
  updated_at: string;
};

export const CASE_FORM_STATUS_LABELS: Record<CaseFormStatus, string> = {
  em_preenchimento: "Em preenchimento",
  enviado: "Enviado",
  em_analise: "Em análise",
  aprovado: "Aprovado",
};
