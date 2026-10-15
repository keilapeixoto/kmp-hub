-- KMP Hub · Checklists: posse do processo checada por função auxiliar, sem
-- RLS aninhado (out/2026). Mesmo padrão de 20261016120000_rls_case_form_helpers.sql.
--
-- Diagnóstico do Dashboard no SQL Editor (supabase/diagnostics/explain-dashboard.sql):
-- a contagem de documentos pendentes (checklist_items) era a única consulta
-- lenta — 247 ms só de planejamento, mesmo para admin. Motivo: o Postgres
-- planeja juntas todas as políticas permissivas da tabela (inclusive as do
-- consultor/operacional/parceiro/cliente), e cada uma tinha um EXISTS em
-- checklists/cases/client_access com o RLS dessas tabelas expandido dentro.
--
-- Mesma permissão, exatamente: nas 8 políticas trocadas, o RLS aninhado só
-- repetia a condição que a própria política já exige; a função faz a mesma
-- junção com o mesmo filtro e responde só sobre o usuário logado. Nome,
-- comando e função de cada política continuam iguais (só ALTER POLICY).
-- Políticas de admin/diretor não mudam. Testes: 005_checklists_documents_rls
-- (permissões, sem mudança) e 025_rls_checklist_helpers.

-- Mesmo que private.acesso_formulario, partindo do checklist (checklists.id).
create or replace function private.acesso_checklist(p_checklist_id uuid, p_via text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.checklists cl
    where cl.id = p_checklist_id
      and private.acesso_processo(cl.case_id, p_via)
  );
$$;

revoke all on function private.acesso_checklist(uuid, text) from public;
grant execute on function private.acesso_checklist(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- checklists (original em 20260714121000_checklists_rls.sql)
-- ---------------------------------------------------------------------------

alter policy checklists_manage_consultant on public.checklists
  using ((select public.get_user_role()) = 'consultant'
         and private.acesso_processo(case_id, 'consultor'))
  with check ((select public.get_user_role()) = 'consultant'
              and private.acesso_processo(case_id, 'consultor'));

alter policy checklists_manage_operations on public.checklists
  using ((select public.get_user_role()) = 'operations'
         and private.acesso_processo(case_id, 'equipe'))
  with check ((select public.get_user_role()) = 'operations'
              and private.acesso_processo(case_id, 'equipe'));

alter policy checklists_select_partner on public.checklists
  using ((select public.get_user_role()) = 'partner'
         and private.acesso_processo(case_id, 'parceiro'));

alter policy checklists_select_client on public.checklists
  using ((select public.get_user_role()) = 'client'
         and private.acesso_processo(case_id, 'cliente'));

-- ---------------------------------------------------------------------------
-- checklist_items (original em 20260714121000_checklists_rls.sql)
-- ---------------------------------------------------------------------------

alter policy checklist_items_manage_consultant on public.checklist_items
  using ((select public.get_user_role()) = 'consultant'
         and private.acesso_checklist(checklist_id, 'consultor'))
  with check ((select public.get_user_role()) = 'consultant'
              and private.acesso_checklist(checklist_id, 'consultor'));

alter policy checklist_items_manage_operations on public.checklist_items
  using ((select public.get_user_role()) = 'operations'
         and private.acesso_checklist(checklist_id, 'equipe'))
  with check ((select public.get_user_role()) = 'operations'
              and private.acesso_checklist(checklist_id, 'equipe'));

alter policy checklist_items_select_partner on public.checklist_items
  using ((select public.get_user_role()) = 'partner'
         and private.acesso_checklist(checklist_id, 'parceiro'));

alter policy checklist_items_select_client on public.checklist_items
  using ((select public.get_user_role()) = 'client'
         and private.acesso_checklist(checklist_id, 'cliente'));

-- Verificação (resultado do SQL Editor): 8 políticas usando as funções.
select count(*) as politicas_com_funcao_auxiliar
from pg_policies
where schemaname = 'public'
  and tablename in ('checklists', 'checklist_items')
  and coalesce(qual, '') || coalesce(with_check, '') like '%private.acesso_%';
