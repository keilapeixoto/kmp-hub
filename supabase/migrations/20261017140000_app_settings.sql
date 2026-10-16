-- KMP Hub · Configurações da equipe em chave/valor (out/2026).
--
-- Primeiro uso: nomes das colunas do radar de Vencimentos, que a Keila quer
-- poder renomear (chave "vencimentos.colunas", valor {vencido: "...", ...}).
-- Admin grava; a equipe lê; cliente e parceiro não veem.

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique check (length(trim(chave)) between 1 and 100),
  valor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Configurações da equipe em chave/valor (ex.: vencimentos.colunas). Admin grava, equipe lê.';

create trigger set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

create policy app_settings_manage_admin on public.app_settings
  for all
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

create policy app_settings_select_staff on public.app_settings
  for select
  using ((select public.get_user_role()) in ('admin', 'director', 'consultant', 'operations', 'finance'));

notify pgrst, 'reload schema';
