-- KMP Hub · Sprint 6 · Tarefas e agenda (seção 4 do plano, "Operação").
-- RLS na migração seguinte (20260717121000_tasks_appointments_rls.sql).

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
--
-- criado_por não está na lista literal da seção 4, mas a matriz da seção 5 dá
-- ao consultor acesso a "próprias + criadas" — sem registrar quem criou, essa
-- regra não teria como ser aplicada no RLS.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  client_id uuid references public.clients (id) on delete set null,
  case_id uuid references public.cases (id) on delete set null,
  responsavel uuid not null references auth.users (id) default auth.uid(),
  participantes uuid[] not null default '{}'::uuid[],
  criado_por uuid not null references auth.users (id) default auth.uid(),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  prazo date,
  status text not null default 'pendente' check (
    status in ('pendente', 'em_andamento', 'concluida', 'cancelada')
  ),
  dependencia_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is
  'Tarefas da equipe (seção 4). dependencia_id aponta para a tarefa que precisa terminar antes desta começar; a UI sinaliza, não bloqueia.';

create index tasks_responsavel_idx on public.tasks (responsavel);
create index tasks_client_id_idx on public.tasks (client_id);
create index tasks_case_id_idx on public.tasks (case_id);
create index tasks_status_idx on public.tasks (status);
create index tasks_participantes_idx on public.tasks using gin (participantes);

create trigger set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- task_comments (append-only)
-- ---------------------------------------------------------------------------

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  autor uuid not null references auth.users (id) default auth.uid(),
  texto text not null,
  anexo text,
  created_at timestamptz not null default now()
);

comment on table public.task_comments is
  'Comentários de tarefa (seção 4). anexo é um storage_path opcional no bucket documents. Append-only — sem política de update/delete.';

create index task_comments_task_id_idx on public.task_comments (task_id);

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
--
-- Tudo em UTC (timestamptz); a conversão para BR/Sydney/Brisbane acontece só
-- na interface (seção 8, risco 8). google_event_id e lembretes ficam
-- preparados para a integração Google Calendar da Fase 2, sem uso agora.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text,
  client_id uuid references public.clients (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  case_id uuid references public.cases (id) on delete set null,
  responsavel uuid not null references auth.users (id) default auth.uid(),
  inicio timestamptz not null,
  fim timestamptz,
  fusos_exibidos text[] not null default array['America/Sao_Paulo', 'Australia/Sydney', 'Australia/Brisbane'],
  google_event_id text,
  lembretes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.appointments is
  'Compromissos da agenda interna (seção 4). titulo não está na lista literal do plano, mas o wireframe do dashboard ("10:00 Ana P. · Consulta") pressupõe um rótulo por compromisso.';

create index appointments_responsavel_idx on public.appointments (responsavel);
create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_inicio_idx on public.appointments (inicio);

create trigger set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- appointment_summaries (resumo obrigatório pós-consulta)
-- ---------------------------------------------------------------------------
--
-- "Obrigatório" é aplicado pela interface: compromisso passado sem resumo
-- aparece com alerta até alguém registrar. Contém riscos — nota interna que
-- nunca pode chegar ao portal (seção 8, risco 2): a migração de RLS não cria
-- NENHUMA política para as funções client/partner nesta tabela.

create table public.appointment_summaries (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  resumo text not null,
  decisoes text,
  riscos text,
  documentos_solicitados text,
  proximos_passos text,
  proximo_acompanhamento date,
  autor uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.appointment_summaries is
  'Resumo obrigatório após consulta (seções 4 e 6 do plano). riscos é nota interna — sem política RLS para client/partner em nenhuma hipótese.';

create trigger set_updated_at
  before update on public.appointment_summaries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Diretório completo da equipe para o seletor de responsável de tarefas —
-- diferente de list_team_members() (Sprint 4, só consultant/operations),
-- tarefas podem ser de qualquer função de equipe (matriz da seção 5).
-- ---------------------------------------------------------------------------

create or replace function public.list_staff_members()
returns table (user_id uuid, nome text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.nome, r.nome as role
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where r.nome in ('admin', 'director', 'consultant', 'operations', 'finance')
    and p.ativo = true
  order by p.nome;
$$;

comment on function public.list_staff_members is
  'Todos os membros ativos da equipe (sem partner/client), para seletores de responsável/participantes. SECURITY DEFINER porque roles é restrita a admin/diretor via RLS.';
