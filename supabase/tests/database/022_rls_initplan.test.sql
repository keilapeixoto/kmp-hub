-- KMP Hub · Guarda de desempenho das políticas de RLS. Cobre:
-- 20261015120000_rls_initplan_performance.sql.
--
-- Não testa permissão (isso continua nos testes 001–021, que devem passar
-- sem nenhuma mudança — a migração não altera quem vê o quê). Testa que
-- nenhuma política chama get_user_role()/auth.uid() sem o sub-select
-- "(select ...)": sem ele, o Postgres reavalia a função a cada linha e a
-- gravação do formulário pelo portal voltava a estourar o tempo (57014).
-- Se este teste falhar depois de uma migração nova, escreva a política com
-- (select public.get_user_role()) / (select auth.uid()).
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);

select plan(4);

insert into public._test_results_scratch (resultado) select is(
  (select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
   from pg_policies
   where schemaname = 'public'
     and (coalesce(qual, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))'
       or coalesce(with_check, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))')),
  null,
  'nenhuma política de public chama get_user_role()/auth.uid() sem (select ...)'
);

insert into public._test_results_scratch (resultado) select is(
  (select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
   from pg_policies
   where schemaname = 'storage'
     and (coalesce(qual, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))'
       or coalesce(with_check, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))')),
  null,
  'nenhuma política de storage.objects chama get_user_role()/auth.uid() sem (select ...)'
);

insert into public._test_results_scratch (resultado) select has_index(
  'public', 'client_access', 'client_access_client_user_id_client_id_idx',
  array['client_user_id', 'client_id'],
  'índice composto client_access (client_user_id, client_id)'
);

insert into public._test_results_scratch (resultado) select has_index(
  'public', 'client_access', 'client_access_partner_id_client_id_idx',
  array['partner_id', 'client_id'],
  'índice composto client_access (partner_id, client_id)'
);

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
