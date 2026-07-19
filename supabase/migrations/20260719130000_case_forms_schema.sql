-- KMP Hub · Formulários de coleta de dados (Fase 2 antecipada)
--
-- Mesmo padrão de checklist_templates/checklists: um template configurável
-- por tipo de serviço, instanciado por processo. Diferença chave: aqui o
-- cliente PODE editar as próprias respostas diretamente (RLS na próxima
-- migração) — não é um status controlado pela equipe como no checklist, é
-- só o preenchimento dele mesmo, em etapas (igual aos formulários de
-- kmp-forms.vercel.app).

create table public.case_form_templates (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references public.service_types (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.case_form_templates is
  'Template de formulário de coleta de dados por tipo de serviço. Referenciado por service_types.case_form_template_id (FK adicionada nesta migração).';

create index case_form_templates_service_type_id_idx on public.case_form_templates (service_type_id);

create trigger set_updated_at
  before update on public.case_form_templates
  for each row execute function public.set_updated_at();

alter table public.service_types
  add column case_form_template_id uuid references public.case_form_templates (id);

create table public.case_form_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.case_form_templates (id) on delete cascade,
  ordem integer not null,
  titulo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, ordem)
);

comment on table public.case_form_steps is
  'Uma etapa do formulário (ex.: "1 de 10 — Contexto da Aplicação").';

create index case_form_steps_template_id_idx on public.case_form_steps (template_id);

create table public.case_form_fields (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.case_form_steps (id) on delete cascade,
  ordem integer not null,
  label text not null,
  ajuda text,
  tipo text not null default 'text' check (
    tipo in ('text', 'textarea', 'select', 'date', 'radio', 'checkbox')
  ),
  opcoes jsonb,
  obrigatorio boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (step_id, ordem)
);

comment on table public.case_form_fields is
  'Um campo dentro de uma etapa. opcoes guarda a lista de escolhas para select/radio/checkbox (array json de strings) — null para text/textarea/date.';

create index case_form_fields_step_id_idx on public.case_form_fields (step_id);

create trigger set_updated_at
  before update on public.case_form_fields
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- case_forms (instância por processo) e case_form_responses
-- ---------------------------------------------------------------------------

create table public.case_forms (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  template_id uuid not null references public.case_form_templates (id),
  status text not null default 'em_preenchimento' check (
    status in ('em_preenchimento', 'enviado', 'em_analise', 'aprovado')
  ),
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, template_id)
);

comment on table public.case_forms is
  'Formulário de um processo, instanciado a partir de um case_form_template. status muda para enviado quando o cliente conclui o preenchimento (ação explícita, não automática).';

create index case_forms_case_id_idx on public.case_forms (case_id);

create trigger set_updated_at
  before update on public.case_forms
  for each row execute function public.set_updated_at();

create table public.case_form_responses (
  id uuid primary key default gen_random_uuid(),
  case_form_id uuid not null references public.case_forms (id) on delete cascade,
  field_id uuid not null references public.case_form_fields (id) on delete cascade,
  valor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_form_id, field_id)
);

comment on table public.case_form_responses is
  'Resposta do cliente (ou da equipe, se preenchido por ela) para um campo. Uma linha por campo por formulário — upsert em (case_form_id, field_id).';

create index case_form_responses_case_form_id_idx on public.case_form_responses (case_form_id);

create trigger set_updated_at
  before update on public.case_form_responses
  for each row execute function public.set_updated_at();
