-- KMP Hub · Invoices — emissão de fatura para cliente (registro + PDF).
-- Exceção aberta à regra de fases (ver CLAUDE.md, set/2026): adiantado a
-- pedido da Keila, antes da Fase 1 fechar. Escopo: registro interno +
-- geração de PDF no padrão KMP, sem Stripe/Xero/cobrança automática —
-- essas integrações continuam fora de escopo até serem pedidas.
--
-- Modelo de pagamento tirado do gerador de invoice que a Keila já usa hoje
-- (PayID para Austrália, PIX para Brasil) — os dados bancários ficam
-- congelados (snapshot) em cada invoice na hora da emissão, não como uma
-- tabela de "configurações da empresa" à parte: se ela trocar de conta
-- amanhã, invoices já emitidas continuam mostrando os dados corretos de
-- quando foram emitidas.

create sequence public.invoices_numero_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  case_id uuid references public.cases (id) on delete set null,
  numero text not null unique,
  moeda text not null default 'AUD' check (moeda in ('AUD', 'BRL')),
  status text not null default 'rascunho' check (
    status in ('rascunho', 'enviada', 'paga', 'vencida', 'cancelada')
  ),
  data_emissao date not null default current_date,
  data_vencimento date,
  data_pagamento date,
  servico_referente text,
  desconto_tipo text not null default 'none' check (desconto_tipo in ('none', 'value', 'percent')),
  desconto_valor numeric(12, 2) not null default 0,
  gst_incluido boolean not null default false,
  subtotal numeric(12, 2) not null default 0,
  gst_valor numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  forma_pagamento text not null default 'payid' check (forma_pagamento in ('payid', 'pix')),
  payid_valor text,
  payid_bsb text,
  payid_conta text,
  payid_titular text,
  pix_chave text,
  pix_titular text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.invoices is
  'Fatura emitida a um cliente. subtotal/gst_valor/total são recalculados pela Server Action ao salvar itens ou mudar desconto/GST — nunca editados soltos na tela. Sem exclusão física (só cancelada via status), mesma convenção de documentos.';

comment on column public.invoices.numero is
  'Gerado pelo trigger set_invoice_numero (INV-<ano>-<sequencial>), nunca digitado pelo usuário.';

comment on column public.invoices.gst_incluido is
  'Se true, soma 10% de GST (Australian GST) sobre o subtotal já descontado. Opcional por invoice — nem todo serviço da KMP tem GST aplicável.';

create index invoices_client_id_idx on public.invoices (client_id);
create index invoices_case_id_idx on public.invoices (case_id);
create index invoices_status_idx on public.invoices (status);

create trigger set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create or replace function public.set_invoice_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero is null then
    new.numero := 'INV-' || extract(year from now())::text || '-' ||
      lpad(nextval('public.invoices_numero_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

comment on function public.set_invoice_numero is
  'Preenche invoices.numero antes do insert quando não informado (sempre — a interface nunca envia numero manualmente). SECURITY DEFINER pra poder usar a sequence independente de grant na role do chamador (mesmo motivo dos triggers de checklists).';

create trigger set_invoice_numero
  before insert on public.invoices
  for each row execute function public.set_invoice_numero();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  descricao text not null,
  quantidade numeric(12, 2) not null default 1,
  valor_unitario numeric(12, 2) not null default 0,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.invoice_items is
  'Linhas de serviço de uma invoice. subtotal da invoice é a soma de quantidade * valor_unitario de todas as linhas, recalculado pela Server Action.';

create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

create trigger set_updated_at
  before update on public.invoice_items
  for each row execute function public.set_updated_at();
