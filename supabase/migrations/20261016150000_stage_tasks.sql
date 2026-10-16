-- KMP Hub · Pipeline por tarefas (out/2026, pedido da Keila: "a pipeline
-- precisa ser tasks a serem cumpridas, e muda automaticamente para a próxima
-- quando todas forem feitas").
--
-- case_stage_tasks: lista de tarefas padrão de cada etapa (case_stages) de
-- cada tipo de serviço. Só admin edita (mesma regra de case_stages).
--
-- Ao entrar numa etapa (processo criado já com etapa, ou etapa trocada), o
-- banco cria as tarefas padrão daquela etapa para o processo (tasks com
-- etapa_id e stage_task_id), responsável = consultor do processo, prazo =
-- hoje + prazo_dias. Nunca duplica: índice único (case_id, stage_task_id).
--
-- Quando a última tarefa padrão da etapa atual fica concluída (ou
-- cancelada), o banco passa o processo para a próxima etapa (ordem
-- seguinte do mesmo tipo de serviço) — o que dispara o histórico de etapa
-- (log_case_status_change → linha do tempo do portal) e cria as tarefas da
-- etapa nova. Etapa sem tarefas padrão: nada muda, troca manual como antes.
-- A última etapa não encerra o processo sozinha.
--
-- As funções que criam tarefas e avançam a etapa são SECURITY DEFINER (rodam
-- dentro de triggers, independentemente de quem concluiu a tarefa); ficam no
-- schema private, fora da API. Processos já em andamento: public.
-- gerar_tarefas_da_etapa(case_id), com a sessão de quem chama (o RLS de
-- cases confere que a pessoa enxerga o processo).

-- ---------------------------------------------------------------------------
-- Tarefas padrão por etapa
-- ---------------------------------------------------------------------------

create table public.case_stage_tasks (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.case_stages (id) on delete cascade,
  ordem integer not null default 0,
  titulo text not null check (length(trim(titulo)) between 1 and 200),
  prazo_dias integer check (prazo_dias is null or prazo_dias between 0 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.case_stage_tasks is
  'Tarefas padrão de uma etapa da pipeline. Ao entrar na etapa, viram tasks do processo; concluídas todas, o processo avança para a próxima etapa.';

create index case_stage_tasks_stage_id_idx on public.case_stage_tasks (stage_id, ordem);

create trigger set_updated_at
  before update on public.case_stage_tasks
  for each row execute function public.set_updated_at();

create trigger audit
  after insert or update or delete on public.case_stage_tasks
  for each row execute function public.audit();

alter table public.case_stage_tasks enable row level security;

create policy case_stage_tasks_manage_admin on public.case_stage_tasks
  for all
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

create policy case_stage_tasks_select_staff on public.case_stage_tasks
  for select
  using ((select public.get_user_role()) in ('director', 'consultant', 'operations', 'finance'));

-- ---------------------------------------------------------------------------
-- Ligação da tarefa com a etapa
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column etapa_id uuid references public.case_stages (id) on delete set null,
  add column stage_task_id uuid references public.case_stage_tasks (id) on delete set null;

comment on column public.tasks.etapa_id is 'Etapa da pipeline em que a tarefa foi gerada (tarefas padrão da etapa).';
comment on column public.tasks.stage_task_id is 'Tarefa padrão de origem (case_stage_tasks). Única por processo.';

create unique index tasks_case_stage_task_uidx
  on public.tasks (case_id, stage_task_id)
  where stage_task_id is not null;

create index tasks_case_etapa_idx on public.tasks (case_id, etapa_id) where etapa_id is not null;

-- ---------------------------------------------------------------------------
-- Gerar as tarefas da etapa atual de um processo
-- ---------------------------------------------------------------------------

create or replace function private.gerar_tarefas_da_etapa(p_case_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
  v_inseridas integer;
begin
  select id, client_id, consultor_id, etapa_id, status into v_case
  from public.cases where id = p_case_id;
  if v_case.etapa_id is null or v_case.status not in ('ativo', 'pausado') then
    return 0;
  end if;

  insert into public.tasks
    (titulo, client_id, case_id, responsavel, criado_por, prioridade, prazo, status, etapa_id, stage_task_id)
  select st.titulo, v_case.client_id, v_case.id, v_case.consultor_id,
         coalesce(auth.uid(), v_case.consultor_id), 'media',
         case when st.prazo_dias is null then null else current_date + st.prazo_dias end,
         'pendente', st.stage_id, st.id
  from public.case_stage_tasks st
  where st.stage_id = v_case.etapa_id
  order by st.ordem, st.created_at
  on conflict (case_id, stage_task_id) where stage_task_id is not null do nothing;

  get diagnostics v_inseridas = row_count;
  return v_inseridas;
end;
$$;

revoke all on function private.gerar_tarefas_da_etapa(uuid) from public;

-- Para processos que já estavam na etapa antes das tarefas padrão existirem.
-- SECURITY INVOKER: só gera para processo que quem chama enxerga (RLS de cases).
create or replace function public.gerar_tarefas_da_etapa(p_case_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (select public.get_user_role()) not in ('admin', 'director', 'consultant', 'operations') then
    raise exception 'Sem permissão para gerar tarefas.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cases where id = p_case_id) then
    raise exception 'Processo não encontrado.' using errcode = '42501';
  end if;
  return private.gerar_tarefas_da_etapa(p_case_id);
end;
$$;

revoke all on function public.gerar_tarefas_da_etapa(uuid) from public, anon;
grant execute on function public.gerar_tarefas_da_etapa(uuid) to authenticated;
grant execute on function private.gerar_tarefas_da_etapa(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Avançar o processo quando todas as tarefas padrão da etapa terminarem
-- ---------------------------------------------------------------------------

create or replace function private.avancar_etapa_se_concluida(p_case_id uuid, p_etapa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
  v_ordem integer;
  v_proxima uuid;
begin
  select id, etapa_id, service_type_id, status into v_case
  from public.cases where id = p_case_id;
  -- Só a etapa em que o processo está agora, e só processo ativo.
  if v_case.etapa_id is distinct from p_etapa_id or v_case.status <> 'ativo' then
    return;
  end if;
  -- Precisa ter pelo menos uma tarefa padrão, e todas encerradas.
  if not exists (
    select 1 from public.tasks
    where case_id = p_case_id and etapa_id = p_etapa_id and stage_task_id is not null
  ) then
    return;
  end if;
  if exists (
    select 1 from public.tasks
    where case_id = p_case_id and etapa_id = p_etapa_id and stage_task_id is not null
      and status not in ('concluida', 'cancelada')
  ) then
    return;
  end if;

  select ordem into v_ordem from public.case_stages where id = p_etapa_id;
  select id into v_proxima
  from public.case_stages
  where service_type_id = v_case.service_type_id and ordem > v_ordem
  order by ordem
  limit 1;
  if v_proxima is null then
    return; -- última etapa: não encerra o processo sozinha
  end if;

  update public.cases set etapa_id = v_proxima where id = p_case_id;
end;
$$;

revoke all on function private.avancar_etapa_se_concluida(uuid, uuid) from public;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function private.trg_cases_gerar_tarefas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.etapa_id is not null
     and (tg_op = 'INSERT' or old.etapa_id is distinct from new.etapa_id) then
    perform private.gerar_tarefas_da_etapa(new.id);
  end if;
  return null;
end;
$$;

create trigger gerar_tarefas_da_etapa
  after insert or update of etapa_id on public.cases
  for each row execute function private.trg_cases_gerar_tarefas();

create or replace function private.trg_tasks_avancar_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.case_id is not null and new.etapa_id is not null and new.stage_task_id is not null
     and new.status in ('concluida', 'cancelada')
     and old.status is distinct from new.status then
    perform private.avancar_etapa_se_concluida(new.case_id, new.etapa_id);
  end if;
  return null;
end;
$$;

create trigger avancar_etapa_quando_concluir
  after update of status on public.tasks
  for each row execute function private.trg_tasks_avancar_etapa();

notify pgrst, 'reload schema';

-- Verificação (resultado do SQL Editor): RLS ligado, 2 políticas, 2 triggers.
select
  (select relrowsecurity from pg_class where oid = 'public.case_stage_tasks'::regclass) as rls_ligado,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'case_stage_tasks') as politicas,
  (select count(*) from pg_trigger
   where tgname in ('gerar_tarefas_da_etapa', 'avancar_etapa_quando_concluir') and not tgisinternal) as triggers;
