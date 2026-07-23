export type Document = {
  id: string;
  client_id: string;
  case_id: string | null;
  checklist_item_id: string | null;
  categoria: string | null;
  categoria_id: string | null;
  nome: string | null;
  storage_path: string;
  enviado_por: string | null;
  analisado_por: string | null;
  validade: string | null;
  arquivado: boolean;
  tamanho_bytes: number | null;
  formato: string | null;
  hash_sha256: string | null;
  pasta: string | null;
  status_revisao: DocumentStatusRevisao;
  created_at: string;
  updated_at: string;
};

export type DocumentStatusRevisao = "pendente" | "aprovado" | "incorreto";

export const DOCUMENT_STATUS_REVISAO_LABELS: Record<DocumentStatusRevisao, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  incorreto: "Incorreto",
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  versao: number;
  storage_path: string;
  autor: string | null;
  tamanho_bytes: number | null;
  formato: string | null;
  hash_sha256: string | null;
  created_at: string;
};

export type DocumentCategory = {
  id: string;
  nome: string;
  sensivel: boolean;
  ordem: number;
};
