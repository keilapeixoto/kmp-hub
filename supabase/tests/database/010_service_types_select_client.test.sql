-- KMP Hub · Testa a nova policy service_types_select_client (migração
-- 20260719140000). Cliente só vê o service_type do PRÓPRIO processo.
--
-- Como rodar: cole no SQL Editor e clique "Run without RLS" se aparecer o
-- aviso (é só a tabela de rascunho dos resultados, apagada no rollback).

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(3);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.st.forms@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin ST","role":"admin"}'),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.a.st@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente A ST","role":"client"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);

with st_a as (
  insert into public.service_types (nome) values ('Serviço ST Teste A') returning id
)
select set_config('app.st_a_id', id::text, true) from st_a;

with st_b as (
  insert into public.service_types (nome) values ('Serviço ST Teste B') returning id
)
select set_config('app.st_b_id', id::text, true) from st_b;

with cli_a as (
  insert into public.clients (nome) values ('Cliente A ST Teste') returning id
)
select set_config('app.client_a_id', id::text, true) from cli_a;

with case_a as (
  insert into public.cases (client_id, service_type_id)
  values (current_setting('app.client_a_id', true)::uuid, current_setting('app.st_a_id', true)::uuid)
  returning id
)
select set_config('app.case_a_id', id::text, true) from case_a;

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_a_id', true)::uuid, 'b1000000-0000-0000-0000-000000000002');

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.service_types where id = current_setting('app.st_a_id', true)::uuid),
  1,
  'cliente vê o service_type do próprio processo'
);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.service_types where id = current_setting('app.st_b_id', true)::uuid),
  0,
  'cliente não vê service_type de outro processo (nem tem processo nele)'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.service_types where nome like 'Serviço ST Teste%'),
  2,
  'admin continua vendo todos os service_types'
);

reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
