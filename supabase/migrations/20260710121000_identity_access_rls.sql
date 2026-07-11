-- KMP Hub · Sprint 1 · Row Level Security das tabelas de identidade e acesso
-- Referência: seção 5 do plano (matriz de permissões), módulo "Equipe/Config":
--   Admin: gestão total · Diretor: leitura · demais funções: sem acesso.

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.client_access enable row level security;

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------

create policy roles_select_admin_director on public.roles
  for select
  using (public.get_user_role() in ('admin', 'director'));

create policy roles_manage_admin on public.roles
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------------

create policy permissions_select_admin_director on public.permissions
  for select
  using (public.get_user_role() in ('admin', 'director'));

create policy permissions_manage_admin on public.permissions
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- profiles
-- Cada usuário vê e edita o próprio perfil (nome/idioma; role_id e ativo são
-- protegidos pelo trigger prevent_self_role_escalation). Admin e diretor
-- enxergam todos os perfis (diretório da equipe); só admin edita os de outros.
-- Não há política de insert/delete: a criação é feita pelo trigger
-- handle_new_user (security definer) e por Server Actions com service role.
-- ---------------------------------------------------------------------------

create policy profiles_select_self on public.profiles
  for select
  using (user_id = auth.uid());

create policy profiles_select_staff on public.profiles
  for select
  using (public.get_user_role() in ('admin', 'director'));

create policy profiles_update_self on public.profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- client_access
-- Admin/diretor têm gestão total. Parceiro e cliente enxergam apenas os
-- próprios vínculos. Regras finas por client_id chegam no Sprint 3, quando a
-- tabela clients existir.
-- ---------------------------------------------------------------------------

create policy client_access_manage_staff on public.client_access
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy client_access_select_own on public.client_access
  for select
  using (partner_id = auth.uid() or client_user_id = auth.uid());
