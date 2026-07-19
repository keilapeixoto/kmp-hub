import type { LeadStatus } from "./constants";

export type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  rede_social: string | null;
  pais: string | null;
  cidade: string | null;
  origem: string | null;
  servico_interesse: string | null;
  consultor_id: string;
  status: LeadStatus;
  ultimo_contato: string | null;
  proxima_acao: string | null;
  proxima_acao_data: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadEvent = {
  id: string;
  lead_id: string;
  tipo: "criacao" | "mudanca_status" | "atribuicao" | "contato" | "observacao";
  descricao: string;
  autor: string | null;
  created_at: string;
};

export type ConsultantOption = {
  user_id: string;
  nome: string;
};

export type LeadFilters = {
  consultor?: string;
  servico?: string;
  origem?: string;
  pais?: string;
  status?: string;
  de?: string;
  ate?: string;
};
