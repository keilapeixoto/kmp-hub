-- KMP Hub · Nomes de status de processos · Testes de RLS (migração
-- 20260724120000). Admin/director editam; consultor/operations/finance só leem;
-- cliente não tem policy nenhuma (nunca acessa esta tabela).
--
-- Como rodar: cole no SQL Editor e clique "Run without RLS" se aparecer o
-- aviso (é só a tabela de rascunho dos resultados, apagada no rollback).
-- Se der "relation _test_results_scratch does not exist" mesmo em aba nova,
-- ver nota em supabase/README.md ("Rodando os testes de permissão") sobre o
-- pooler em modo transação — rodar como bloco DO em vez de begin...rollback.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(5);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.statuslabels@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin StatusLabels","role":"admin"}'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'director.statuslabels@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Director StatusLabels","role":"director"}'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultant.statuslabels@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultant StatusLabels","role":"consultant"}');

-- admin: vê as 5 linhas e consegue editar um label
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_status_labels), 5, 'admin vê as 5 linhas de status'
);

insert into public._test_results_scratch (resultado) select lives_ok(
  $$ update public.case_status_labels set label = 'Em andamento' where status_slug = 'ativo' $$,
  'admin consegue editar o label de um status'
);

reset role;

-- director: também consegue editar
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select lives_ok(
  $$ update public.case_status_labels set label = 'Suspenso' where status_slug = 'pausado' $$,
  'director consegue editar o label de um status'
);

reset role;

-- consultor: lê (precisa exibir os nomes na tela), mas não escreve
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_status_labels), 5, 'consultor lê as 5 linhas (precisa exibir os nomes)'
);

insert into public._test_results_scratch (resultado) select throws_ok(
  $$ update public.case_status_labels set label = 'Hackeado' where status_slug = 'cancelado' $$,
  '42501', null, 'consultor não consegue editar o label de um status'
);

reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
