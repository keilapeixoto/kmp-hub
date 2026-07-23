-- KMP Hub · Formulários · Testes de RLS de case_form_views (migração
-- 20260722140000). Cliente só insere a própria; nunca vê nenhuma (nem a
-- própria); staff (admin/consultor do processo) lê.
--
-- Como rodar: cole no SQL Editor e clique "Run without RLS" se aparecer o
-- aviso (é só a tabela de rascunho dos resultados, apagada no rollback).

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(5);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.views@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Views","role":"admin"}'),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.a.views@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente A Views","role":"client"}'),
  ('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.b.views@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente B Views","role":"client"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

with st as (
  insert into public.service_types (nome) values ('Serviço Views Teste') returning id
)
select set_config('app.service_type_id', id::text, true) from st;

with tpl as (
  insert into public.case_form_templates (service_type_id, nome)
  values (current_setting('app.service_type_id', true)::uuid, 'Template Views Teste')
  returning id
)
select set_config('app.template_id', id::text, true) from tpl;

with cli_a as (
  insert into public.clients (nome) values ('Cliente A Views Teste') returning id
)
select set_config('app.client_a_id', id::text, true) from cli_a;

with case_a as (
  insert into public.cases (client_id, service_type_id)
  values (current_setting('app.client_a_id', true)::uuid, current_setting('app.service_type_id', true)::uuid)
  returning id
)
select set_config('app.case_a_id', id::text, true) from case_a;

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_a_id', true)::uuid, 'e1000000-0000-0000-0000-000000000002');

reset role;

-- Cliente A marca que abriu o próprio formulário
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select lives_ok(
  format(
    $$ insert into public.case_form_views (case_id, template_id) values (%L, %L) $$,
    current_setting('app.case_a_id', true)::uuid,
    current_setting('app.template_id', true)::uuid
  ),
  'cliente A marca que abriu o próprio formulário'
);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_form_views),
  0,
  'cliente não enxerga nenhuma linha (nem a própria) — só a equipe vê'
);

reset role;

-- Cliente B (sem acesso ao processo) não consegue marcar visualização nele
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);

insert into public._test_results_scratch (resultado) select throws_ok(
  format(
    $$ insert into public.case_form_views (case_id, template_id) values (%L, %L) $$,
    current_setting('app.case_a_id', true)::uuid,
    current_setting('app.template_id', true)::uuid
  ),
  '42501', null, 'cliente B não consegue marcar visualização em processo de outro cliente'
);

reset role;

-- Admin vê a visualização gravada pelo cliente A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_form_views where case_id = current_setting('app.case_a_id', true)::uuid),
  1,
  'admin vê a visualização gravada'
);

insert into public._test_results_scratch (resultado) select ok(
  (select visualizado_em is not null from public.case_form_views limit 1),
  'visualizado_em foi preenchido automaticamente'
);

reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
