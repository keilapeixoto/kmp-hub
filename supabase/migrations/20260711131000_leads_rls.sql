-- KMP Hub · Sprint 2 · RLS de leads e lead_events
-- Referência: seção 5 do plano (matriz de permissões), módulo "Leads":
--   Admin: G · Diretor: G · Consultor: A (E), atribuídos, com escrita ·
--   Operacional/Financeiro/Parceiro/Cliente: sem acesso.

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create policy leads_manage_staff on public.leads
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy leads_select_own_consultant on public.leads
  for select
  using (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

create policy leads_insert_own_consultant on public.leads
  for insert
  with check (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

create policy leads_update_own_consultant on public.leads
  for update
  using (public.get_user_role() = 'consultant' and consultor_id = auth.uid())
  with check (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

-- Sem policy de delete para consultant: "A (E)" é leitura+escrita nos
-- atribuídos, não exclusão. Exclusão de lead fica só para admin/diretor
-- (via leads_manage_staff), coerente com o resto do plano preferir
-- arquivamento a apagar de vez.

-- ---------------------------------------------------------------------------
-- lead_events
-- Mesma visibilidade dos leads. Sem update/delete para ninguém — histórico é
-- append-only (mesmo espírito de audit_logs, seção 4).
-- ---------------------------------------------------------------------------

create policy lead_events_select_staff on public.lead_events
  for select
  using (public.get_user_role() in ('admin', 'director'));

create policy lead_events_select_own_consultant on public.lead_events
  for select
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.leads l
      where l.id = lead_events.lead_id and l.consultor_id = auth.uid()
    )
  );

create policy lead_events_insert_staff on public.lead_events
  for insert
  with check (public.get_user_role() in ('admin', 'director'));

create policy lead_events_insert_own_consultant on public.lead_events
  for insert
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.leads l
      where l.id = lead_events.lead_id and l.consultor_id = auth.uid()
    )
  );
