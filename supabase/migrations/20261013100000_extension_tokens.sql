-- KMP Hub · Token da extensão de navegador (preenchimento automático do
-- ImmiAccount) — pedido da Keila, mesma exceção de fase da integração
-- Google (ver "Convenções" no CLAUDE.md).
--
-- A extensão roda no navegador, fora do Hub, e precisa se autenticar pra
-- chamar a API que busca o código de verificação do ImmiAccount no Gmail.
-- Token gerado uma vez na tela de Integrações, mostrado só naquele
-- momento (nunca mais recuperável) — só o hash fica guardado, mesmo
-- padrão de API key de qualquer serviço (nunca o token em texto puro).
--
-- Sem NENHUMA política RLS de propósito, igual google_connections: um
-- token válido equivale a autenticação completa na API da extensão, então
-- só createAdminClient() (SUPABASE_SECRET_KEY) toca nela.

create table public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  rotulo text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

comment on table public.extension_tokens is
  'Token de autenticação da extensão de navegador (preenchimento ImmiAccount) por usuário. Guarda só o hash (sha256) do token, nunca o valor puro. Sem RLS de propósito (ver 021_extension_tokens_rls.test.sql) — só createAdminClient() acessa.';

create index extension_tokens_user_id_idx on public.extension_tokens (user_id);

alter table public.extension_tokens enable row level security;
-- Propositalmente sem "create policy" nenhuma — mesmo motivo de
-- google_connections: trava total pra anon/authenticated, inclusive admin.
