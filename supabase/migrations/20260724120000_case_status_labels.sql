-- KMP Hub · Nomes de status de processos (configuração de equipe).
--
-- Os slugs de status ('ativo','pausado','concluido','cancelado','arquivado')
-- são fixos (check constraint em cases.status, cases_status_check) e usados
-- em toda a lógica de negócio e nas cores fixas do Kanban — só o TEXTO
-- exibido é editável aqui. Se a linha de um status não existir (não deveria
-- acontecer, já que a seed abaixo cria as 5), o app usa o rótulo padrão de
-- lib/cases/constants.ts (CASE_STATUS_LABELS) como fallback.

create table public.case_status_labels (
  id uuid primary key default gen_random_uuid(),
  status_slug text not null unique
    check (status_slug in ('ativo', 'pausado', 'concluido', 'cancelado', 'arquivado')),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

comment on table public.case_status_labels is
  'Rótulos exibidos para cada status de processo — editável em /configuracoes/processos. O slug em si nunca muda (é usado em cases.status e na lógica/cores do Kanban).';

create trigger set_updated_at
  before update on public.case_status_labels
  for each row execute function public.set_updated_at();

insert into public.case_status_labels (status_slug, label) values
  ('ativo', 'Ativo'),
  ('pausado', 'Pausado'),
  ('concluido', 'Concluído'),
  ('cancelado', 'Cancelado'),
  ('arquivado', 'Arquivado')
on conflict (status_slug) do nothing;

alter table public.case_status_labels enable row level security;

-- Mesmo padrão de storage_settings: admin e director podem editar; demais
-- funções de equipe só leem (cliente/portal nunca acessa esta tabela).
create policy case_status_labels_manage_admin on public.case_status_labels
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy case_status_labels_manage_director on public.case_status_labels
  for all
  using (public.get_user_role() = 'director')
  with check (public.get_user_role() = 'director');

create policy case_status_labels_select_staff on public.case_status_labels
  for select
  using (public.get_user_role() in ('consultant', 'operations', 'finance'));
