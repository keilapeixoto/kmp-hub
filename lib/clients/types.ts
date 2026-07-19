import type { ClientRelationType } from "./constants";

export type Client = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  nacionalidade: string | null;
  telefone: string | null;
  email: string | null;
  rede_social: string | null;
  pais: string | null;
  cidade: string | null;
  fuso_horario: string | null;
  idioma_preferencial: "pt" | "en";
  situacao: string | null;
  objetivos: string | null;
  consultor_id: string;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRelation = {
  id: string;
  client_id: string;
  related_client_id: string;
  tipo: ClientRelationType;
  created_at: string;
  updated_at: string;
};

export type ClientRelationWithRelated = ClientRelation & {
  related: { id: string; nome: string } | null;
};

export type IdentityDocument = {
  id: string;
  client_id: string;
  tipo: string;
  numero: string | null;
  validade: string | null;
  arquivado: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientFilters = {
  consultor?: string;
  pais?: string;
  situacao?: string;
  busca?: string;
};
