import type { ConversationStage, MessageType, TemplateType } from "./constants";

export type WhatsappConversation = {
  id: string;
  client_id: string | null;
  case_id: string | null;
  telefone: string;
  nome_contato: string;
  etapa: ConversationStage;
  ultima_mensagem_em: string | null;
  ultima_mensagem_preview: string | null;
  nao_lida: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type WhatsappMessage = {
  id: string;
  conversation_id: string;
  direcao: "enviada" | "recebida";
  tipo: MessageType;
  conteudo: string | null;
  midia_storage_path: string | null;
  enviado_por: string | null;
  is_demo: boolean;
  created_at: string;
};

export type WhatsappTemplate = {
  id: string;
  nome: string;
  tipo: TemplateType;
  conteudo: string | null;
  audio_storage_path: string | null;
  autor: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};
