-- KMP Hub · Formulários: posse do processo checada por função auxiliar, sem
-- RLS aninhado (out/2026).
--
-- A migração 20261015120000 (sub-select em get_user_role()/auth.uid()) não
-- bastou: gravar 8 respostas com a sessão do cliente continuou em 57014 /
-- ~6 s. O diagnóstico no SQL Editor mostrou ~2 s só de PLANEJAMENTO (sem RLS:
-- 1 ms). Causa: cada política de case_form_responses tem um EXISTS em
-- case_forms/cases/client_access, e o Postgres expande o RLS de cada uma
-- dessas tabelas dentro do EXISTS — que por sua vez tem EXISTS em cases e
-- client_access, com RLS próprio. O plano de um upsert vira milhares de nós.
--
-- Correção (padrão recomendado pelo Supabase): o EXISTS passa a ser feito
-- dentro de uma função SECURITY DEFINER, que lê as tabelas sem RLS.
--
-- Mesma permissão, exatamente: em todas as políticas trocadas, o RLS
-- aninhado só repetia a condição que a própria política já exige (ex.: a
-- política do cliente exige ca.client_user_id = auth.uid(); o RLS de
-- client_access, cases e case_forms, para o cliente, exige o mesmo vínculo).
-- As funções fazem a mesma junção da política original, com o mesmo filtro,
-- e respondem só sobre o próprio usuário logado (auth.uid()). Ficam no
-- schema "private", que a API (PostgREST) não expõe — não dá para chamá-las
-- como RPC. Nome, comando e função de cada política continuam iguais (só
-- ALTER POLICY). Políticas de admin/diretor não mudam (não têm EXISTS).
-- Testes: 009_case_forms_rls (permissões, sem mudança) e
-- 023_rls_case_form_helpers (as funções em si).

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- p_via: 'consultor' (consultor_id), 'equipe' (equipe do processo),
-- 'parceiro' (client_access.partner_id) ou 'cliente' (client_access.client_user_id).
create or replace function private.acesso_processo(p_case_id uuid, p_via text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_via
    when 'consultor' then exists (
      select 1 from public.cases c
      where c.id = p_case_id and c.consultor_id = auth.uid())
    when 'equipe' then exists (
      select 1 from public.cases c
      where c.id = p_case_id and auth.uid() = any(c.equipe))
    when 'parceiro' then exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = p_case_id and ca.partner_id = auth.uid())
    when 'cliente' then exists (
      select 1 from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.id = p_case_id and ca.client_user_id = auth.uid())
    else false
  end;
$$;

-- Mesmo que acima, partindo do formulário (case_forms.id).
create or replace function private.acesso_formulario(p_case_form_id uuid, p_via text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.case_forms cf
    where cf.id = p_case_form_id
      and private.acesso_processo(cf.case_id, p_via)
  );
$$;

revoke all on function private.acesso_processo(uuid, text) from public;
revoke all on function private.acesso_formulario(uuid, text) from public;
grant execute on function private.acesso_processo(uuid, text) to authenticated;
grant execute on function private.acesso_formulario(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- case_forms (original em 20260719131000_case_forms_rls.sql)
-- ---------------------------------------------------------------------------

alter policy case_forms_manage_consultant on public.case_forms
  using ((select public.get_user_role()) = 'consultant'
         and private.acesso_processo(case_id, 'consultor'))
  with check ((select public.get_user_role()) = 'consultant'
              and private.acesso_processo(case_id, 'consultor'));

alter policy case_forms_manage_operations on public.case_forms
  using ((select public.get_user_role()) = 'operations'
         and private.acesso_processo(case_id, 'equipe'))
  with check ((select public.get_user_role()) = 'operations'
              and private.acesso_processo(case_id, 'equipe'));

alter policy case_forms_select_partner on public.case_forms
  using ((select public.get_user_role()) = 'partner'
         and private.acesso_processo(case_id, 'parceiro'));

alter policy case_forms_select_client on public.case_forms
  using ((select public.get_user_role()) = 'client'
         and private.acesso_processo(case_id, 'cliente'));

alter policy case_forms_insert_client on public.case_forms
  with check ((select public.get_user_role()) = 'client'
              and status in ('em_preenchimento', 'enviado')
              and private.acesso_processo(case_id, 'cliente'));

alter policy case_forms_update_client on public.case_forms
  using ((select public.get_user_role()) = 'client'
         and private.acesso_processo(case_id, 'cliente'))
  with check ((select public.get_user_role()) = 'client'
              and status in ('em_preenchimento', 'enviado')
              and private.acesso_processo(case_id, 'cliente'));

-- ---------------------------------------------------------------------------
-- case_form_responses (original em 20260719131000_case_forms_rls.sql)
-- ---------------------------------------------------------------------------

alter policy case_form_responses_manage_consultant on public.case_form_responses
  using ((select public.get_user_role()) = 'consultant'
         and private.acesso_formulario(case_form_id, 'consultor'))
  with check ((select public.get_user_role()) = 'consultant'
              and private.acesso_formulario(case_form_id, 'consultor'));

alter policy case_form_responses_manage_operations on public.case_form_responses
  using ((select public.get_user_role()) = 'operations'
         and private.acesso_formulario(case_form_id, 'equipe'))
  with check ((select public.get_user_role()) = 'operations'
              and private.acesso_formulario(case_form_id, 'equipe'));

alter policy case_form_responses_select_partner on public.case_form_responses
  using ((select public.get_user_role()) = 'partner'
         and private.acesso_formulario(case_form_id, 'parceiro'));

alter policy case_form_responses_select_client on public.case_form_responses
  using ((select public.get_user_role()) = 'client'
         and private.acesso_formulario(case_form_id, 'cliente'));

alter policy case_form_responses_insert_client on public.case_form_responses
  with check ((select public.get_user_role()) = 'client'
              and private.acesso_formulario(case_form_id, 'cliente'));

alter policy case_form_responses_update_client on public.case_form_responses
  using ((select public.get_user_role()) = 'client'
         and private.acesso_formulario(case_form_id, 'cliente'))
  with check ((select public.get_user_role()) = 'client'
              and private.acesso_formulario(case_form_id, 'cliente'));

-- Verificação (resultado do SQL Editor): 12 políticas usando as funções.
select count(*) as politicas_com_funcao_auxiliar
from pg_policies
where schemaname = 'public'
  and tablename in ('case_forms', 'case_form_responses')
  and coalesce(qual, '') || coalesce(with_check, '') like '%private.acesso_%';
