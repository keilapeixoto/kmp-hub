-- KMP Hub · Andamento da aplicação e do skills assessment. Cobre:
-- 20261016170000_application_status.sql.
--
-- Colunas novas em cases com valores padrão e lista fechada; a permissão é a
-- do próprio processo (consultor dono edita, outro consultor e o cliente não).
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(6);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c9000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.aplic@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Aplic","role":"consultant"}'),
  ('c9000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor2.aplic@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outro Aplic","role":"consultant"}'),
  ('c9000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.aplic@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Aplic","role":"client"}');

insert into public.service_types (id, nome) values ('c9000000-0000-0000-0000-0000000000a1', 'Visto Aplic Teste');
insert into public.clients (id, nome, consultor_id)
values ('c9000000-0000-0000-0000-0000000000b1', 'Cliente Aplic', 'c9000000-0000-0000-0000-000000000001');
insert into public.cases (id, client_id, service_type_id, consultor_id)
values ('c9000000-0000-0000-0000-0000000000c1', 'c9000000-0000-0000-0000-0000000000b1',
        'c9000000-0000-0000-0000-0000000000a1', 'c9000000-0000-0000-0000-000000000001');
insert into public.client_access (client_id, client_user_id)
values ('c9000000-0000-0000-0000-0000000000b1', 'c9000000-0000-0000-0000-000000000003');

insert into public._test_results_scratch (resultado) select is(
  (select aplicacao_status || '/' || skills_status from public.cases where id = 'c9000000-0000-0000-0000-0000000000c1'),
  'nao_enviada/nao_se_aplica', 'processo novo começa como não enviada / não se aplica');

insert into public._test_results_scratch (resultado) select throws_ok(
  $$ update public.cases set aplicacao_status = 'qualquer' where id = 'c9000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'status fora da lista é recusado');

set local role authenticated;

select set_config('request.jwt.claim.sub', 'c9000000-0000-0000-0000-000000000001', true);
update public.cases
set aplicacao_status = 'em_analise', aplicacao_enviada_em = '2026-10-01', skills_status = 'aplicado', skills_orgao = 'VETASSESS'
where id = 'c9000000-0000-0000-0000-0000000000c1';

select set_config('request.jwt.claim.sub', 'c9000000-0000-0000-0000-000000000002', true);
update public.cases set aplicacao_status = 'recusada' where id = 'c9000000-0000-0000-0000-0000000000c1';

select set_config('request.jwt.claim.sub', 'c9000000-0000-0000-0000-000000000003', true);
update public.cases set aplicacao_status = 'concedida' where id = 'c9000000-0000-0000-0000-0000000000c1';
insert into public._test_results_scratch (resultado) select is(
  (select aplicacao_status from public.cases where id = 'c9000000-0000-0000-0000-0000000000c1'),
  'em_analise', 'cliente lê o andamento do próprio processo');

reset role;

insert into public._test_results_scratch (resultado) select is(
  (select aplicacao_status from public.cases where id = 'c9000000-0000-0000-0000-0000000000c1'),
  'em_analise', 'só o consultor dono mudou o status (outro consultor e cliente não)');
insert into public._test_results_scratch (resultado) select is(
  (select skills_orgao from public.cases where id = 'c9000000-0000-0000-0000-0000000000c1'),
  'VETASSESS', 'órgão do skills assessment gravado');
insert into public._test_results_scratch (resultado) select is(
  (select aplicacao_enviada_em::text from public.cases where id = 'c9000000-0000-0000-0000-0000000000c1'),
  '2026-10-01', 'data de envio gravada');

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
