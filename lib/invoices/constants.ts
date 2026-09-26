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
