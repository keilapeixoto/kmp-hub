export type InvoiceStatus =
  | "rascunho"
  | "enviada"
  | "paga"
  | "vencida"
  | "cancelada";

export type InvoiceCurrency = "AUD" | "BRL";

export type InvoiceDiscountType = "none" | "value" | "percent";

export type InvoicePaymentMethod = "payid" | "pix";

export type Invoice = {
  id: string;
  client_id: string;
  case_id: string | null;
  numero: string;
  moeda: InvoiceCurrency;
  status: InvoiceStatus;
  data_emissao: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  servico_referente: string | null;
  desconto_tipo: InvoiceDiscountType;
  desconto_valor: number;
  gst_incluido: boolean;
  subtotal: number;
  gst_valor: number;
  total: number;
  forma_pagamento: InvoicePaymentMethod;
  payid_valor: string | null;
  payid_bsb: string | null;
  payid_conta: string | null;
  payid_titular: string | null;
  pix_chave: string | null;
  pix_titular: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

export type InvoiceWithClient = Invoice & { client_nome: string };

export type InvoiceFilters = {
  status?: string;
  q?: string;
};
