-- KMP Hub · Sprint 4 · RLS de service_types, case_stages, cases e
-- case_status_history. Referência: seção 5 do plano — módulo "Processos"
-- para cases/case_status_history; service_types/case_stages tratados como o
-- módulo "Templates" (Admin G, demais funções de equipe R, parceiro/cliente
-- sem acesso).

alter table public.service_types enable row level security;
alter table public.case_stages enable row level security;
alter table public.cases enable row level security;
alter table public.case_status_history enable row level security;

-- ---------------------------------------------------------------------------
-- service_types / case_stages ("Templates": admin gestão, equipe lê, sem
-- acesso para parceiro/cliente)
-- ---------------------------------------------------------------------------

create policy service_types_manage_admin on public.service_types
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy service_types_select_staff on public.service_types
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

create policy case_stages_manage_admin on public.case_stages
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy case_stages_select_staff on public.case_stages
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));

-- ---------------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------------

create policy cases_manage_staff on public.cases
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy cases_select_own_consultant on public.cases
  for select
  using (
    public.get_user_role() = 'consultant'
    and (consultor_id = auth.uid() or auth.uid() = any(equipe))
  );

create policy cases_insert_own_consultant on public.cases
  for insert
  with check (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

create policy cases_update_own_consultant on public.cases
  for update
  using (
    public.get_user_role() = 'consultant'
    and (consultor_id = auth.uid() or auth.uid() = any(equipe))
  )
  with check (
    public.get_user_role() = 'consultant'
    and (consultor_id = auth.uid() or auth.uid() = any(equipe))
  );

-- Operacional: "E autorizados" — só os processos em que está na equipe, sem
-- criar processo novo.
create policy cases_select_operations on public.cases
  for select
  using (public.get_user_role() = 'operations' and auth.uid() = any(equipe));

create policy cases_update_operations on public.cases
  for update
  using (public.get_user_role() = 'operations' and auth.uid() = any(equipe))
  with check (public.get_user_role() = 'operations' and auth.uid() = any(equipe));

-- Financeiro: "R" — leitura de todos os processos, sem qualificador na matriz.
create policy cases_select_finance on public.cases
  for select
  using (public.get_user_role() = 'finance');

-- Parceiro: "R compartilhados" via client_access.
create policy cases_select_partner on public.cases
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = cases.client_id and ca.partner_id = auth.uid()
    )
  );

-- Cliente: "andamento simplificado" — RLS só libera a leitura; a
-- simplificação em si é responsabilidade da UI do portal (Fase 2).
create policy cases_select_client on public.cases
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = cases.client_id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- case_status_history: mesma visibilidade de cases, sem update/delete
-- (append-only, igual audit_logs/lead_events).
-- ---------------------------------------------------------------------------

create policy case_status_history_select_staff on public.case_status_history
  for select
  using (
    public.get_user_role() in ('admin', 'director', 'finance')
    or (
      public.get_user_role() in ('consultant', 'operations')
      and exists (
        select 1 from public.cases c
        where c.id = case_status_history.case_id
          and (
            c.consultor_id = auth.uid()
            or auth.uid() = any(c.equipe)
          )
      )
    )
  );

create policy case_status_history_select_partner on public.case_status_history
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_status_history.case_id and ca.partner_id = auth.uid()
    )
  );

create policy case_status_history_select_client on public.case_status_history
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = case_status_history.case_id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Acesso de operations a clients/identity_documents, pendente desde o
-- Sprint 3 ("R autorizados" — agora existe cases.equipe para definir quem é
-- autorizado).
-- ---------------------------------------------------------------------------

create policy clients_select_operations on public.clients
  for select
  using (
    public.get_user_role() = 'operations'
    and exists (
      select 1 from public.cases c
      where c.client_id = clients.id and auth.uid() = any(c.equipe)
    )
  );

create policy identity_documents_select_operations on public.identity_documents
  for select
  using (
    public.get_user_role() = 'operations'
    and not arquivado
    and exists (
      select 1 from public.cases c
      where c.client_id = identity_documents.client_id and auth.uid() = any(c.equipe)
    )
  );
