-- KMP Hub · Prazo de 28 dias e lembretes automáticos
-- (docs/spec-prazo-28-dias.md). Depende de public.cases (Sprint 4).
--
-- case_deadlines: um pedido do Department com janela de resposta (exame
-- médico, informação adicional, skills assessment pendente). case_id (não
-- client_id) porque o pedido é sempre sobre um processo específico em
-- andamento — um cliente com dois processos pode ter prazos independentes
-- em cada um. Cada novo request do Department vira uma linha nova (nunca
-- substitui a anterior — seção 8 da spec).
--
-- case_deadline_reminders: histórico de cada lembrete enviado (seção 7 da
-- spec — auditoria). Sem política de insert/update para nenhuma função: só
-- o cliente admin do servidor grava aqui (mesmo padrão de
-- storage_audit_runs/storage_alert_events) — o envio de e-mail em si é uma
-- operação de sistema, não uma edição de dado do usuário.

create table public.case_deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  tipo_pedido text not null check (
    tipo_pedido in ('exame_medico', 'informacao_adicional', 'skills_assessment_pendente', 'outro')
  ),
  data_pedido date not null,
  prazo_final date not null,
  status text not null default 'aguardando_documento' check (
    status in ('aguardando_documento', 'documento_recebido', 'extensao_solicitada', 'concluido', 'cancelado')
  ),
  documento_recebido_em date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.case_deadlines is
  'Prazo de 28 dias de um pedido do Department (exame médico, informação adicional, skills assessment pendente) — seção 3 da spec. prazo_final é editável manualmente (não trigado por trigger) para os casos em que o Department concede prazo diferente por escrito.';

create index case_deadlines_case_id_idx on public.case_deadlines (case_id);
create index case_deadlines_prazo_final_idx on public.case_deadlines (prazo_final);
create index case_deadlines_status_idx on public.case_deadlines (status);

create trigger set_updated_at
  before update on public.case_deadlines
  for each row execute function public.set_updated_at();

create table public.case_deadline_reminders (
  id uuid primary key default gen_random_uuid(),
  case_deadline_id uuid not null references public.case_deadlines (id) on delete cascade,
  marco_dias integer not null check (marco_dias in (14, 7, 3, 1)),
  destinatario text not null,
  status text not null default 'enviado' check (status in ('enviado', 'falhou')),
  detalhe text,
  enviado_por uuid references auth.users (id),
  enviado_em timestamptz not null default now()
);

comment on table public.case_deadline_reminders is
  'Histórico de lembretes de prazo enviados (seção 7 da spec). enviado_por nulo = envio automático (cron); preenchido = clique manual no painel. Append-only — sem política de update/delete.';

create index case_deadline_reminders_case_deadline_id_idx on public.case_deadline_reminders (case_deadline_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.case_deadlines enable row level security;
alter table public.case_deadline_reminders enable row level security;

create policy case_deadlines_manage_staff on public.case_deadlines
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy case_deadlines_manage_consultant on public.case_deadlines
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = case_deadlines.case_id
        and (c.consultor_id = auth.uid() or auth.uid() = any(c.equipe))
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = case_deadlines.case_id
        and (c.consultor_id = auth.uid() or auth.uid() = any(c.equipe))
    )
  );

create policy case_deadlines_select_operations on public.case_deadlines
  for select
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.id = case_deadlines.case_id and auth.uid() = any(c.equipe)
    )
  );

-- Sem policy para partner/client: prazo com o Department é acompanhamento
-- interno da equipe, mesma exclusão de "notas internas e riscos" do CLAUDE.md.

create policy case_deadline_reminders_select_admin on public.case_deadline_reminders
  for select using (public.get_user_role() = 'admin');

create policy case_deadline_reminders_select_director on public.case_deadline_reminders
  for select using (public.get_user_role() = 'director');
