-- KMP Hub · Recados da equipe para o cliente na linha do tempo do portal
-- (out/2026, pedido da Keila). Cada recado é uma linha (append-only, como
-- case_status_history): o mais recente aparece em destaque no portal e todos
-- entram em "O que já aconteceu". Diferente de notas internas e riscos: aqui
-- é texto escrito PARA o cliente ler.
--
-- Políticas usam (select ...) em get_user_role()/auth.uid() para o Postgres
-- calcular uma vez por consulta, não por linha.

create table public.case_client_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  mensagem text not null check (length(trim(mensagem)) between 1 and 500),
  etapa_nome text,
  autor uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.case_client_updates is
  'Recados da equipe para o cliente (visíveis no portal, linha do tempo). Append-only: sem update/delete pela equipe; corrigir = novo recado.';

create index case_client_updates_case_id_idx
  on public.case_client_updates (case_id, created_at desc);

create trigger set_updated_at
  before update on public.case_client_updates
  for each row execute function public.set_updated_at();

alter table public.case_client_updates enable row level security;

-- Equipe: lê e escreve nos processos que já enxerga (mesma regra de
-- case_status_history). Financeiro só lê.
create policy case_client_updates_select_staff on public.case_client_updates
  for select
  using (
    (select public.get_user_role()) in ('admin', 'director', 'finance')
    or (
      (select public.get_user_role()) in ('consultant', 'operations')
      and exists (
        select 1 from public.cases c
        where c.id = case_client_updates.case_id
          and (c.consultor_id = (select auth.uid()) or (select auth.uid()) = any(c.equipe))
      )
    )
  );

create policy case_client_updates_insert_staff on public.case_client_updates
  for insert
  with check (
    autor = (select auth.uid())
    and (
      (select public.get_user_role()) in ('admin', 'director')
      or (
        (select public.get_user_role()) in ('consultant', 'operations')
        and exists (
          select 1 from public.cases c
          where c.id = case_client_updates.case_id
            and (c.consultor_id = (select auth.uid()) or (select auth.uid()) = any(c.equipe))
        )
      )
    )
  );

-- Cliente: só lê os recados dos próprios processos.
create policy case_client_updates_select_client on public.case_client_updates
  for select
  using (
    (select public.get_user_role()) = 'client'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_client_updates.case_id and ca.client_user_id = (select auth.uid())
    )
  );

create trigger audit
  after insert or update or delete on public.case_client_updates
  for each row execute function public.audit();
