-- KMP Hub · Sprint 4 · Processos: tipos de serviço, etapas configuráveis,
-- histórico de status (seção 4 do plano). RLS na migração seguinte
-- (20260713121000_cases_rls.sql).

-- ---------------------------------------------------------------------------
-- service_types (catálogo de serviços, tratado como "Templates" na seção 5)
-- ---------------------------------------------------------------------------
--
-- guia_id e checklist_template_id ficam sem FK por enquanto: guides é
-- Sprint 7, checklist_templates é Sprint 5. Mesma convenção usada em
-- client_access.client_id no Sprint 1 — a FK é adicionada quando a tabela
-- referenciada existir.

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  guia_id uuid,
  checklist_template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_types is
  'Tipos de serviço (ex.: Subclass 500, Subclass 189) — seção 4 do plano. guia_id e checklist_template_id ganham FK nos Sprints 7 e 5, respectivamente.';

create trigger set_updated_at
  before update on public.service_types
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- case_stages (etapas configuráveis por tipo de serviço)
-- ---------------------------------------------------------------------------
--
-- "regras" guarda a automação (JSON) descrita na seção 4 — "criar tarefa e
-- notificar ao mudar de etapa" (seção 6). Só armazenado nesta migração: a
-- execução da automação depende de tasks/notifications, que chegam nos
-- Sprints 6 e 7. Fica pronto para configurar sem quebrar quando a execução
-- for construída.

create table public.case_stages (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references public.service_types (id) on delete cascade,
  ordem integer not null,
  nome text not null,
  regras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_type_id, ordem)
);

comment on table public.case_stages is
  'Etapas do pipeline de um tipo de serviço, em ordem. regras (JSON) descreve automações que ainda não são executadas (Sprint 6/7 constroem a execução).';

create index case_stages_service_type_id_idx on public.case_stages (service_type_id);

create trigger set_updated_at
  before update on public.case_stages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cases (processos)
-- ---------------------------------------------------------------------------
--
-- status: estado macro do processo (ativo/pausado/concluído/cancelado).
-- etapa_id: posição atual no pipeline configurável (case_stages) do
-- service_type escolhido — são conceitos diferentes, por isso duas colunas.
-- equipe: membros (além do consultor responsável) com acesso de escrita
-- (seção 5, "Operacional: E autorizados") — implementado como array de
-- auth.users, mais simples que uma tabela de junção para o volume esperado.

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  service_type_id uuid not null references public.service_types (id),
  consultor_id uuid not null references auth.users (id) default auth.uid(),
  equipe uuid[] not null default '{}'::uuid[],
  inicio date not null default current_date,
  prazo date,
  status text not null default 'ativo' check (
    status in ('ativo', 'pausado', 'concluido', 'cancelado')
  ),
  etapa_id uuid references public.case_stages (id),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  riscos text,
  proxima_acao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cases is
  'Processos (seção 4 do plano). etapa_id referencia case_stages do mesmo service_type_id — não há CHECK cruzado garantindo isso no banco; a UI só oferece etapas do service_type selecionado.';

create index cases_client_id_idx on public.cases (client_id);
create index cases_service_type_id_idx on public.cases (service_type_id);
create index cases_consultor_id_idx on public.cases (consultor_id);
create index cases_etapa_id_idx on public.cases (etapa_id);
create index cases_equipe_idx on public.cases using gin (equipe);

create trigger set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- case_status_history (histórico automático)
-- ---------------------------------------------------------------------------
--
-- Acrescenta "campo" (status|etapa) em relação à lista literal da seção 4
-- (case_id, de, para, autor, data) para diferenciar as duas colunas que
-- geram histórico em cases — sem isso "de"/"para" ficariam ambíguos.

create table public.case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  campo text not null check (campo in ('status', 'etapa')),
  de text,
  para text,
  autor uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.case_status_history is
  'Histórico append-only de mudanças de status/etapa de um processo (seção 4). Gerado pelo trigger log_case_status_change — sem política de update/delete.';

create index case_status_history_case_id_idx on public.case_status_history (case_id);

-- ---------------------------------------------------------------------------
-- Histórico automático de status/etapa
-- ---------------------------------------------------------------------------

create or replace function public.log_case_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etapa_de text;
  v_etapa_para text;
begin
  if new.status is distinct from old.status then
    insert into public.case_status_history (case_id, campo, de, para, autor)
    values (new.id, 'status', old.status, new.status, auth.uid());
  end if;

  if new.etapa_id is distinct from old.etapa_id then
    select nome into v_etapa_de from public.case_stages where id = old.etapa_id;
    select nome into v_etapa_para from public.case_stages where id = new.etapa_id;

    insert into public.case_status_history (case_id, campo, de, para, autor)
    values (new.id, 'etapa', v_etapa_de, v_etapa_para, auth.uid());
  end if;

  return new;
end;
$$;

comment on function public.log_case_status_change is
  'Gera o histórico automático em case_status_history quando status ou etapa_id mudam. SECURITY DEFINER para inserir independente das políticas de RLS de case_status_history (mesmo padrão de log_lead_event no Sprint 2).';

create trigger log_case_status_change
  after update on public.cases
  for each row execute function public.log_case_status_change();
