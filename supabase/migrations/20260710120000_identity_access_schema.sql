-- KMP Hub · Sprint 1 · Identidade e acesso (seção 4 do plano)
-- Tabelas: roles, profiles, permissions, client_access.
-- RLS é ativado na migração seguinte (20260710121000_identity_access_rls.sql).

-- ---------------------------------------------------------------------------
-- Função utilitária: updated_at automático
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (
    nome in ('admin', 'director', 'consultant', 'operations', 'finance', 'partner', 'client')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roles is
  'Funções do sistema (seção 5 do plano de arquitetura): admin, director, consultant, operations, finance, partner, client.';

create trigger set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 com auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  nome text not null,
  idioma text not null default 'pt' check (idioma in ('pt', 'en')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de cada usuário autenticado (equipe e cliente). idioma controla o idioma da interface (independente do idioma do portal do cliente, ver seção 1 do plano).';

create index profiles_role_id_idx on public.profiles (role_id);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------------

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  modulo text not null,
  acao text not null check (acao in ('read', 'write', 'manage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, modulo, acao)
);

comment on table public.permissions is
  'Capacidades por função e módulo (usadas para exibir/ocultar navegação na interface). O controle de acesso real aos dados é sempre imposto pelas políticas de RLS, nunca só por esta tabela.';

create trigger set_updated_at
  before update on public.permissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- client_access (acesso granular de parceiros e clientes)
-- ---------------------------------------------------------------------------

create table public.client_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  partner_id uuid references auth.users (id) on delete cascade,
  client_user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_access_one_grantee check (
    (partner_id is not null and client_user_id is null)
    or (partner_id is null and client_user_id is not null)
  )
);

comment on table public.client_access is
  'Vínculo de acesso de um parceiro ou do próprio cliente a um client_id. A referência a public.clients(id) é adicionada por ALTER TABLE no Sprint 3, quando a tabela clients é criada (seção 4 do plano).';

create index client_access_client_id_idx on public.client_access (client_id);
create index client_access_partner_id_idx on public.client_access (partner_id);
create index client_access_client_user_id_idx on public.client_access (client_user_id);

create trigger set_updated_at
  before update on public.client_access
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- get_user_role(): base de todas as políticas de RLS (seção 5 do plano)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_role(p_user_id uuid default auth.uid())
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.nome
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.user_id = p_user_id
    and p.ativo = true;
$$;

comment on function public.get_user_role is
  'Retorna o nome da função do usuário autenticado (ou de p_user_id). SECURITY DEFINER para poder ler profiles/roles independente das políticas de RLS dessas tabelas.';

-- ---------------------------------------------------------------------------
-- Criação automática de profile ao criar usuário em auth.users
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  select id into v_role_id
  from public.roles
  where nome = coalesce(new.raw_user_meta_data ->> 'role', 'client');

  if v_role_id is null then
    select id into v_role_id from public.roles where nome = 'client';
  end if;

  insert into public.profiles (user_id, role_id, nome, idioma)
  values (
    new.id,
    v_role_id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    coalesce(new.raw_user_meta_data ->> 'idioma', 'pt')
  );

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Cria a linha de profiles correspondente sempre que um usuário é criado em auth.users. A função (role) desejada vem de raw_user_meta_data->>''role'', definida pelo Server Action de convite (com service role), padrão client se ausente.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guarda contra autopromoção: usuário comum não muda a própria função/ativo
-- ---------------------------------------------------------------------------

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id = auth.uid()
     and public.get_user_role(auth.uid()) <> 'admin'
     and (new.role_id is distinct from old.role_id or new.ativo is distinct from old.ativo) then
    raise exception 'Apenas admin pode alterar função ou status ativo de um perfil.';
  end if;

  return new;
end;
$$;

create trigger prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();
