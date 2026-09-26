export const INVOICE_STATUSES = [
  { slug: "rascunho", label: "Rascunho" },
  { slug: "enviada", label: "Enviada" },
  { slug: "paga", label: "Paga" },
  { slug: "vencida", label: "Vencida" },
  { slug: "cancelada", label: "Cancelada" },
] as const;

export const INVOICE_CURRENCIES = [
  { value: "AUD", label: "AUD (Dólar Australiano)" },
  { value: "BRL", label: "BRL (Real Brasileiro)" },
] as const;

export const GST_RATE = 0.1;

export const INVOICE_PAYMENT_METHODS = [
  { value: "payid", label: "PayID (Austrália)" },
  { value: "pix", label: "PIX (Brasil)" },
] as const;

// Dados fixos da KMP — pedido explícito da Keila pra vir pré-preenchido
// (o formulário continua editável, isso é só o valor padrão de uma invoice
// nova). Só visível pra quem já tem acesso a /financeiro (admin/finance).
export const DEFAULT_PAYID = {
  valor: "0451051806",
  bsb: "923100",
  conta: "319505660",
  titular: "Keila Mayara Peixoto",
} as const;

export const DEFAULT_PIX = {
  chave: "keila.peixoto@kmpconsulting.com.au",
  titular: "Keila Mayara Peixoto",
} as const;

// Serviços mais comuns da KMP — cobre os subclasses de visto já usados na
// matriz de ocupações (lib/occupations/constants.ts) mais os que a Keila
// pediu especificamente (600, 500). "Outro" libera o campo de texto livre.
export const SERVICO_REFERENTE_OPTIONS = [
  "Visa Application - Subclass 189 (Skilled Independent)",
  "Visa Application - Subclass 190 (Skilled Nominated)",
  "Visa Application - Subclass 491 (Skilled Work Regional)",
  "Visa Application - Subclass 482 (Skills in Demand/TSS)",
  "Visa Application - Subclass 494 (Skilled Employer Sponsored Regional)",
  "Visa Application - Subclass 186 (Employer Nomination Scheme)",
  "Visa Application - Subclass 407 (Training)",
  "Visa Application - Subclass 485 (Temporary Graduate)",
  "Visa Application - Subclass 500 (Student)",
  "Visa Application - Subclass 600 (Visitor)",
  "Skill Assessment Application",
  "Outro",
] as const;
