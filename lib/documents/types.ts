export type Document = {
  id: string;
  client_id: string;
  case_id: string | null;
  checklist_item_id: string | null;
  categoria: string | null;
  nome: string | null;
  storage_path: string;
  enviado_por: string | null;
  analisado_por: string | null;
  validade: string | null;
  arquivado: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  versao: number;
  storage_path: string;
  autor: string | null;
  created_at: string;
};
