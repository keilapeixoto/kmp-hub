-- KMP Hub · Formulários (Parte 1/2) · rastreio de "abriu o formulário".
--
-- case_forms só é criado no PRIMEIRO SAVE (ver saveFormStep,
-- ensureCaseForm) — ou seja, hoje não dá pra distinguir "nunca abriu" de
-- "abriu mas não preencheu nada ainda". case_form_views fecha essa lacuna:
-- grava uma vez (a primeira) quando o cliente abre a página do formulário no
-- portal, antes de qualquer campo ser preenchido.
--
-- Três estados visíveis pro staff (seção "requisito formulários"):
--   abriu    → tem linha em case_form_views, mas não em case_forms
--   iniciou  → tem case_forms (status em_preenchimento)
--   concluiu → case_forms.enviado_em preenchido

create table public.case_form_views (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  template_id uuid not null references public.case_form_templates (id) on delete cascade,
  visualizado_em timestamptz not null default now(),
  unique (case_id, template_id)
);

comment on table public.case_form_views is
  'Primeira vez que o cliente abriu a página do formulário no portal (controle de formulários) — insert único por case_id/template_id, nunca atualizado depois.';

create index case_form_views_case_id_idx on public.case_form_views (case_id);

alter table public.case_form_views enable row level security;

create policy case_form_views_select_staff on public.case_form_views
  for select
  using (public.get_user_role() in ('admin', 'director'));

create policy case_form_views_select_consultant on public.case_form_views
  for select
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = case_form_views.case_id and c.consultor_id = auth.uid()
    )
  );

create policy case_form_views_select_operations on public.case_form_views
  for select
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.id = case_form_views.case_id and auth.uid() = any(c.equipe)
    )
  );

-- Cliente só insere (marca que abriu) — sem select próprio, já que a tela do
-- portal não precisa mostrar isso pra ele mesmo, só pra equipe.
create policy case_form_views_insert_client on public.case_form_views
  for insert
  with check (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_form_views.case_id and ca.client_user_id = auth.uid()
    )
  );
