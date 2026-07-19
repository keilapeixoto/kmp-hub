-- KMP Hub · Sprint 5 · RLS de checklist_templates, checklist_template_items,
-- checklists e checklist_items. Referência: seção 5 do plano — módulo
-- "Templates" para os templates, "Checklists" para as instâncias por
-- processo. Mesma decisão dos Sprints 3/4: consultor só nos próprios
-- processos, sem compartilhamento (diferente de leads).

alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;

-- ---------------------------------------------------------------------------
-- checklist_templates / checklist_template_items ("Templates")
-- ---------------------------------------------------------------------------

create policy checklist_templates_manage_admin on public.checklist_templates
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy checklist_templates_select_staff on public.checklist_templates
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

create policy checklist_template_items_manage_admin on public.checklist_template_items
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy checklist_template_items_select_staff on public.checklist_template_items
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

-- ---------------------------------------------------------------------------
-- checklists / checklist_items — visibilidade segue o processo (cases)
-- ---------------------------------------------------------------------------

create policy checklists_manage_staff on public.checklists
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy checklists_manage_consultant on public.checklists
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = checklists.case_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.cases c
      where c.id = checklists.case_id and c.consultor_id = auth.uid()
    )
  );

create policy checklists_manage_operations on public.checklists
  for all
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.id = checklists.case_id and auth.uid() = any(c.equipe)
    )
  )
  with check (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.id = checklists.case_id and auth.uid() = any(c.equipe)
    )
  );

create policy checklists_select_partner on public.checklists
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = checklists.case_id and ca.partner_id = auth.uid()
    )
  );

create policy checklists_select_client on public.checklists
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = checklists.case_id and ca.client_user_id = auth.uid()
    )
  );

-- checklist_items: mesmas regras, via checklists.case_id

create policy checklist_items_manage_staff on public.checklist_items
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy checklist_items_manage_consultant on public.checklist_items
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.checklists cl
      join public.cases c on c.id = cl.case_id
      where cl.id = checklist_items.checklist_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.checklists cl
      join public.cases c on c.id = cl.case_id
      where cl.id = checklist_items.checklist_id and c.consultor_id = auth.uid()
    )
  );

create policy checklist_items_manage_operations on public.checklist_items
  for all
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.checklists cl
      join public.cases c on c.id = cl.case_id
      where cl.id = checklist_items.checklist_id and auth.uid() = any(c.equipe)
    )
  )
  with check (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.checklists cl
      join public.cases c on c.id = cl.case_id
      where cl.id = checklist_items.checklist_id and auth.uid() = any(c.equipe)
    )
  );

create policy checklist_items_select_partner on public.checklist_items
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.checklists cl
      join public.cases c on c.id = cl.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cl.id = checklist_items.checklist_id and ca.partner_id = auth.uid()
    )
  );

create policy checklist_items_select_client on public.checklist_items
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.checklists cl
      join public.cases c on c.id = cl.case_id
      join public.client_access ca on ca.client_id = c.client_id
      where cl.id = checklist_items.checklist_id and ca.client_user_id = auth.uid()
    )
  );
