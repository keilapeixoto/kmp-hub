-- KMP Hub · RLS de case_form_templates/steps/fields (módulo "Templates") e
-- case_forms/case_form_responses (por processo). Diferente de checklists: o
-- cliente tem INSERT/UPDATE nas próprias respostas (é o preenchimento dele),
-- não só SELECT — e um trigger de validação fecha a mesma brecha já corrigida
-- em documents (campo referenciando algo de outro processo/template).

alter table public.case_form_templates enable row level security;
alter table public.case_form_steps enable row level security;
alter table public.case_form_fields enable row level security;
alter table public.case_forms enable row level security;
alter table public.case_form_responses enable row level security;

-- ---------------------------------------------------------------------------
-- Templates: mesmo padrão de checklist_templates
-- ---------------------------------------------------------------------------

create policy case_form_templates_manage_admin on public.case_form_templates
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy case_form_templates_select_staff on public.case_form_templates
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

create policy case_form_steps_manage_admin on public.case_form_steps
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy case_form_steps_select_staff on public.case_form_steps
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

create policy case_form_fields_manage_admin on public.case_form_fields
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy case_form_fields_select_staff on public.case_form_fields
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

-- Cliente e parceiro também precisam ler a definição dos campos (rótulo,
-- tipo, opções) para renderizar o formulário no portal — sem isso, veem as
-- respostas mas não sabem o que cada uma significa.

create policy case_form_templates_select_client on public.case_form_templates
  for select
  using (public.get_user_role() in ('client', 'partner'));

create policy case_form_steps_select_client on public.case_form_steps
  for select
  using (public.get_user_role() in ('client', 'partner'));

create policy case_form_fields_select_client on public.case_form_fields
  for select
  using (public.get_user_role() in ('client', 'partner'));

-- ---------------------------------------------------------------------------
-- case_forms — visibilidade segue o processo (cases), igual a checklists
-- ---------------------------------------------------------------------------

create policy case_forms_manage_staff on public.case_forms
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy case_forms_manage_consultant on public.case_forms
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = case_forms.case_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = case_forms.case_id and c.consultor_id = auth.uid()
    )
  );

create policy case_forms_manage_operations on public.case_forms
  for all
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.id = case_forms.case_id and auth.uid() = any(c.equipe)
    )
  )
  with check (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.id = case_forms.case_id and auth.uid() = any(c.equipe)
    )
  );

create policy case_forms_select_partner on public.case_forms
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_forms.case_id and ca.partner_id = auth.uid()
    )
  );

-- Cliente: select + insert + update das próprias — mas só pode levar o
-- status até 'enviado', nunca para em_analise/aprovado (isso é a equipe que
-- decide, depois de revisar).

create policy case_forms_select_client on public.case_forms
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_forms.case_id and ca.client_user_id = auth.uid()
    )
  );

create policy case_forms_insert_client on public.case_forms
  for insert
  with check (
    public.get_user_role() = 'client'
    and status in ('em_preenchimento', 'enviado')
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_forms.case_id and ca.client_user_id = auth.uid()
    )
  );

create policy case_forms_update_client on public.case_forms
  for update
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_forms.case_id and ca.client_user_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'client'
    and status in ('em_preenchimento', 'enviado')
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_forms.case_id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- case_form_responses — mesmas regras, via case_forms.case_id; cliente edita
-- ---------------------------------------------------------------------------

create policy case_form_responses_manage_staff on public.case_form_responses
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy case_form_responses_manage_consultant on public.case_form_responses
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      where cf.id = case_form_responses.case_form_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      where cf.id = case_form_responses.case_form_id and c.consultor_id = auth.uid()
    )
  );

create policy case_form_responses_manage_operations on public.case_form_responses
  for all
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      where cf.id = case_form_responses.case_form_id and auth.uid() = any(c.equipe)
    )
  )
  with check (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      where cf.id = case_form_responses.case_form_id and auth.uid() = any(c.equipe)
    )
  );

create policy case_form_responses_select_partner on public.case_form_responses
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cf.id = case_form_responses.case_form_id and ca.partner_id = auth.uid()
    )
  );

create policy case_form_responses_select_client on public.case_form_responses
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cf.id = case_form_responses.case_form_id and ca.client_user_id = auth.uid()
    )
  );

create policy case_form_responses_insert_client on public.case_form_responses
  for insert
  with check (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cf.id = case_form_responses.case_form_id and ca.client_user_id = auth.uid()
    )
  );

create policy case_form_responses_update_client on public.case_form_responses
  for update
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cf.id = case_form_responses.case_form_id and ca.client_user_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.case_forms cf
      join public.cases c on c.id = cf.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cf.id = case_form_responses.case_form_id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Validação: field_id precisa pertencer ao mesmo template do case_forms —
-- mesma lógica já usada em validate_document_checklist_item, fechando a
-- mesma classe de brecha (RLS de client_id sozinha não garante consistência
-- entre as FKs do próprio registro).
-- ---------------------------------------------------------------------------

create or replace function public.validate_case_form_response_field()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form_template_id uuid;
  v_field_template_id uuid;
begin
  select template_id into v_form_template_id
  from public.case_forms
  where id = new.case_form_id;

  select cft.template_id into v_field_template_id
  from public.case_form_fields cff
  join public.case_form_steps cft on cft.id = cff.step_id
  where cff.id = new.field_id;

  if v_form_template_id is null or v_field_template_id is null
     or v_form_template_id is distinct from v_field_template_id then
    raise exception 'field_id não pertence ao template deste formulário.';
  end if;

  return new;
end;
$$;

create trigger validate_case_form_response_field
  before insert or update on public.case_form_responses
  for each row execute function public.validate_case_form_response_field();
