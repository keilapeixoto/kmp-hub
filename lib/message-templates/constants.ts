export type MessageTemplate = {
  id: string;
  nome: string;
  canal: "email" | "whatsapp" | "outro";
  idioma: "pt" | "en";
  assunto: string | null;
  chave: string | null;
  corpo: string;
  created_at: string;
  updated_at: string;
};

export const CANAL_LABELS: Record<string, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  outro: "Outro",
};
