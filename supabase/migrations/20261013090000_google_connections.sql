-- KMP Hub · Integração com Google (Calendar + Gmail) — pedido da Keila
-- pra ver a agenda real do dia e e-mails não lidos/urgentes no /inicio, e
-- mandar e-mail de dentro do Hub pelo Gmail de verdade (não é o Resend que
-- já existe pros avisos automáticos de sistema).
--
-- Exceção de fase (ver "Convenções" no CLAUDE.md) — Google Calendar API e
-- envio de e-mail eram Fase 2, adiantados a pedido da Keila em out/2026,
-- mesmo padrão já usado pra invoices.
--
-- refresh_token é extremamente sensível (dá acesso de leitura/escrita na
-- conta Google de quem conectou). Por isso esta tabela não tem NENHUMA
-- política RLS — nem admin lê via client normal. Só Server Actions/Route
-- Handlers usando createAdminClient() (SUPABASE_SECRET_KEY) tocam nela.

create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  google_email text,
  refresh_token text not null,
  scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.google_connections is
  'Conexão OAuth com Google Calendar/Gmail por usuário da equipe. Sem RLS de propósito (tabela trava total p/ anon e authenticated) — refresh_token só é lido via SUPABASE_SECRET_KEY, nunca pelo client. Ver 019_google_connections_rls.test.sql.';

create trigger set_updated_at
  before update on public.google_connections
  for each row execute function public.set_updated_at();

alter table public.google_connections enable row level security;
-- Propositalmente sem "create policy" nenhuma: RLS ativado + zero políticas
-- = ninguém acessa via anon/authenticated, nem admin. Só a secret key.
