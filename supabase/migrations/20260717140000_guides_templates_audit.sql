-- KMP Hub · Sprint 7 · Guias, templates de mensagem, linha do tempo e
-- auditoria (seções 4, 8, 15, 20 e 22 do plano). Schema + RLS num arquivo só.

-- ===========================================================================
-- guides / guide_versions
-- ===========================================================================

create table public.guides (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid references public.service_types (id) on delete set null,
  titulo text not null,
  conteudo text not null,
  versao integer not null default 1,
  atualizado_por uuid references auth.users (id) default auth.uid(),
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guides is
  'Guias internos de procedimento (seção 4), editáveis pelo admin sem código (seção 6, item 12). Versionamento automático via trigger save_guide_version.';

create index guides_service_type_id_idx on public.guides (service_type_id);

create trigger set_updated_at
  before update on public.guides
  for each row execute function public.set_updated_at();

alter table public.service_types
  add constraint service_types_guia_id_fkey
  foreign key (guia_id) references public.guides (id);

create table public.guide_versions (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides (id) on delete cascade,
  versao integer not null,
  conteudo text not null,
  autor uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (guide_id, versao)
);

comment on table public.guide_versions is
  'Histórico append-only de versões de um guia (seção 4). A versão N guarda o conteúdo como era ANTES da edição que criou a versão N+1.';

create index guide_versions_guide_id_idx on public.guide_versions (guide_id);

create or replace function public.save_guide_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.conteudo is distinct from old.conteudo then
    insert into public.guide_versions (guide_id, versao, conteudo, autor)
    values (old.id, old.versao, old.conteudo, old.atualizado_por);
    new.versao := old.versao + 1;
    new.atualizado_por := auth.uid();
  end if;
  return new;
end;
$$;

comment on function public.save_guide_version is
  'Ao editar o conteúdo de um guia, arquiva a versão anterior em guide_versions e incrementa guides.versao.';

create trigger save_guide_version
  before update on public.guides
  for each row execute function public.save_guide_version();

-- ===========================================================================
-- message_templates
-- ===========================================================================

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  canal text not null default 'email' check (canal in ('email', 'whatsapp', 'outro')),
  idioma text not null default 'pt' check (idioma in ('pt', 'en')),
  corpo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.message_templates is
  'Templates de mensagem com variáveis {{nome_cliente}} etc. (seção 4). Na Fase 1 o envio é manual por cópia (seção 6, item 13).';

create trigger set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- timeline_events (transversal, seção 4)
-- ===========================================================================
--
-- A linha do tempo exibida na Fase 1 agrega as tabelas de histórico que já
-- existem (lead_events, case_status_history, documents, tasks, appointments).
-- Esta tabela fica disponível para eventos explícitos e para as automações
-- das próximas fases.

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  entidade text not null check (entidade in ('client', 'case', 'lead')),
  entidade_id uuid not null,
  tipo text not null,
  descricao text not null,
  autor uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.timeline_events is
  'Eventos explícitos de linha do tempo (seção 4). Append-only. A timeline da Fase 1 agrega também lead_events/case_status_history/documents/tasks/appointments diretamente.';

create index timeline_events_entidade_idx on public.timeline_events (entidade, entidade_id);

-- ===========================================================================
-- audit_logs — trigger em todas as mutações, append-only (seção 4)
-- ===========================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id uuid,
  autor uuid,
  dados jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Log de auditoria (seção 4): trigger em todas as tabelas principais, append only, nenhum usuário edita. dados guarda o registro novo (INSERT/UPDATE) ou o antigo (DELETE).';

create index audit_logs_tabela_idx on public.audit_logs (tabela, registro_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);

create or replace function public.audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro jsonb;
  v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_registro := to_jsonb(old);
  else
    v_registro := to_jsonb(new);
  end if;
  v_id := (v_registro ->> 'id')::uuid;

  insert into public.audit_logs (tabela, operacao, registro_id, autor, dados)
  values (tg_table_name, tg_op, v_id, auth.uid(), v_registro);

  return coalesce(new, old);
end;
$$;

comment on function public.audit is
  'Trigger genérico de auditoria. SECURITY DEFINER para gravar em audit_logs independente do RLS de quem mutou.';

do $$
declare
  t text;
begin
  foreach t in array array[
    'leads', 'clients', 'client_relations', 'identity_documents',
    'cases', 'service_types', 'case_stages',
    'checklist_templates', 'checklist_template_items', 'checklists', 'checklist_items',
    'documents', 'tasks', 'appointments', 'appointment_summaries',
    'guides', 'message_templates', 'profiles', 'client_access'
  ]
  loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I
       for each row execute function public.audit()',
      t
    );
  end loop;
end $$;

-- ===========================================================================
--- RLS
-- ===========================================================================

alter table public.guides enable row level security;
alter table public.guide_versions enable row level security;
alter table public.message_templates enable row level security;
alter table public.timeline_events enable row level security;
alter table public.audit_logs enable row level security;

-- Guias (matriz seção 5): Admin G (edita) · Diretor/Consultor/Operacional/
-- Financeiro R · Parceiro/Cliente sem acesso. Guia arquivado: só admin vê.

create policy guides_manage_admin on public.guides
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy guides_select_staff on public.guides
  for select
  using (
    public.get_user_role() in ('director', 'consultant', 'operations', 'finance')
    and status = 'ativo'
  );

create policy guide_versions_manage_admin on public.guide_versions
  for select
  using (public.get_user_role() = 'admin');

create policy guide_versions_select_staff on public.guide_versions
  for select
  using (
    public.get_user_role() in ('director', 'consultant', 'operations', 'finance')
    and exists (
      select 1 from public.guides g
      where g.id = guide_versions.guide_id and g.status = 'ativo'
    )
  );

-- Templates (matriz seção 5): Admin G · equipe R · Parceiro/Cliente sem acesso.

create policy message_templates_manage_admin on public.message_templates
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy message_templates_select_staff on public.message_templates
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

-- timeline_events: admin/diretor gestão, equipe leitura; append via app.

create policy timeline_events_manage_staff on public.timeline_events
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy timeline_events_select_team on public.timeline_events
  for select
  using (public.get_user_role() in ('consultant', 'operations', 'finance'));

create policy timeline_events_insert_team on public.timeline_events
  for insert
  with check (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and autor = auth.uid()
  );

-- Auditoria (matriz seção 5): SÓ admin lê. Ninguém edita — sem política de
-- update/delete para nenhuma função; a escrita é feita apenas pelo trigger
-- SECURITY DEFINER.

create policy audit_logs_select_admin on public.audit_logs
  for select
  using (public.get_user_role() = 'admin');
