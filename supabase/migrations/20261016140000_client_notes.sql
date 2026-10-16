-- KMP Hub · Notas internas da equipe no perfil do cliente (out/2026, pedido
-- da Keila — o painel de "comentários" da referência visual do perfil).
--
-- Nota interna: escrita pela equipe PARA a equipe. Diferente de
-- case_client_updates (recado para o cliente ler no portal): cliente e
-- parceiro nunca leem nota interna, por nenhuma política (convenção do
-- CLAUDE.md para notas internas e riscos).
--
-- Quem lê e escreve: quem da equipe já enxerga o cliente — admin/diretor
-- (todos), consultor (clientes dele, clients.consultor_id) e operacional
-- (clientes de processos em que está na equipe). Mesma regra das políticas
-- de clients para a equipe; financeiro não enxerga clients, então também
-- não enxerga as notas. Sem edição (corrigir = nova nota); excluir só o
-- próprio autor ou admin. O trigger audit() guarda tudo, inclusive exclusões.
--
-- A posse é checada por função auxiliar SECURITY DEFINER (padrão de
-- 20261016120000_rls_case_form_helpers.sql), para não expandir o RLS de
-- clients/cases dentro da política.

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  autor uuid not null references auth.users (id) default auth.uid(),
  texto text not null check (length(trim(texto)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_notes is
  'Notas internas da equipe sobre o cliente (perfil do cliente). Nunca visíveis para client/partner. Sem update; excluir só autor ou admin.';

create index client_notes_client_id_idx on public.client_notes (client_id, created_at desc);

create trigger set_updated_at
  before update on public.client_notes
  for each row execute function public.set_updated_at();

create trigger audit
  after insert or update or delete on public.client_notes
  for each row execute function public.audit();

-- Quem da equipe enxerga este cliente (mesma regra das políticas de clients
-- para admin/diretor/consultor/operacional). Responde só sobre o usuário logado.
create or replace function private.acesso_cliente_equipe(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_user_role()
    when 'admin' then true
    when 'director' then true
    when 'consultant' then exists (
      select 1 from public.clients cl
      where cl.id = p_client_id and cl.consultor_id = auth.uid())
    when 'operations' then exists (
      select 1 from public.cases c
      where c.client_id = p_client_id and auth.uid() = any(c.equipe))
    else false
  end;
$$;

revoke all on function private.acesso_cliente_equipe(uuid) from public;
grant execute on function private.acesso_cliente_equipe(uuid) to authenticated;

alter table public.client_notes enable row level security;

create policy client_notes_select_staff on public.client_notes
  for select
  using (
    (select public.get_user_role()) in ('admin', 'director', 'consultant', 'operations')
    and private.acesso_cliente_equipe(client_id)
  );

create policy client_notes_insert_staff on public.client_notes
  for insert
  with check (
    (select public.get_user_role()) in ('admin', 'director', 'consultant', 'operations')
    and autor = (select auth.uid())
    and private.acesso_cliente_equipe(client_id)
  );

create policy client_notes_delete_own_or_admin on public.client_notes
  for delete
  using (
    (select public.get_user_role()) in ('admin', 'director', 'consultant', 'operations')
    and private.acesso_cliente_equipe(client_id)
    and (autor = (select auth.uid()) or (select public.get_user_role()) = 'admin')
  );

-- Verificação (resultado do SQL Editor): RLS ligado e 3 políticas.
select
  (select relrowsecurity from pg_class where oid = 'public.client_notes'::regclass) as rls_ligado,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'client_notes') as politicas;
