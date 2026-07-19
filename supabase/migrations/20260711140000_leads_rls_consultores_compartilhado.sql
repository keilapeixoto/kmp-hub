-- KMP Hub · Sprint 2 · Leads visíveis entre todos os consultores
--
-- Decisão do cliente (fora da matriz da seção 5 do plano, que definia
-- consultor como "A (E)" — só leads atribuídos): qualquer consultor pode ver
-- e editar leads de qualquer outro consultor, não só os próprios. Continua
-- sem exclusão para consultor (só admin/diretor) e sem acesso nenhum para
-- operations/finance/partner/client.
--
-- Substitui as políticas leads_select_own_consultant, leads_insert_own_consultant,
-- leads_update_own_consultant, lead_events_select_own_consultant e
-- lead_events_insert_own_consultant criadas em 20260711131000_leads_rls.sql.

drop policy if exists leads_select_own_consultant on public.leads;
drop policy if exists leads_insert_own_consultant on public.leads;
drop policy if exists leads_update_own_consultant on public.leads;
drop policy if exists lead_events_select_own_consultant on public.lead_events;
drop policy if exists lead_events_insert_own_consultant on public.lead_events;

-- ---------------------------------------------------------------------------
-- leads: consultor lê/escreve em qualquer lead, sem exclusão
-- ---------------------------------------------------------------------------

create policy leads_select_consultant on public.leads
  for select
  using (public.get_user_role() = 'consultant');

create policy leads_insert_consultant on public.leads
  for insert
  with check (public.get_user_role() = 'consultant');

create policy leads_update_consultant on public.leads
  for update
  using (public.get_user_role() = 'consultant')
  with check (public.get_user_role() = 'consultant');

-- ---------------------------------------------------------------------------
-- lead_events: mesma visibilidade compartilhada; ainda sem update/delete
-- ---------------------------------------------------------------------------

create policy lead_events_select_consultant on public.lead_events
  for select
  using (public.get_user_role() = 'consultant');

create policy lead_events_insert_consultant on public.lead_events
  for insert
  with check (public.get_user_role() = 'consultant');

-- ---------------------------------------------------------------------------
-- Diretório de consultores para a UI (seletor de "Consultor responsável",
-- filtro e resolução de nomes na lista/kanban). A tabela roles continua
-- restrita a admin/diretor (RLS do Sprint 1); sem esta função, consultores
-- não conseguiriam resolver o nome de colegas agora que os leads são
-- compartilhados. Mesmo padrão de get_user_role(): SECURITY DEFINER, só
-- expõe id + nome, nada sensível.
-- ---------------------------------------------------------------------------

create or replace function public.list_consultants()
returns table (user_id uuid, nome text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.nome
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where r.nome = 'consultant' and p.ativo = true
  order by p.nome;
$$;

comment on function public.list_consultants is
  'Lista de consultores ativos (id + nome). SECURITY DEFINER porque a tabela roles é restrita a admin/diretor via RLS — usada pela UI de leads agora que a visibilidade é compartilhada entre consultores.';
