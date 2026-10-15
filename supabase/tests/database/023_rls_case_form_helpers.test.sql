-- KMP Hub · Funções auxiliares de posse usadas pelas políticas de
-- case_forms/case_form_responses. Cobre: 20261016120000_rls_case_form_helpers.sql.
--
-- As permissões dos formulários continuam cobertas pelo 009 (deve passar sem
-- mudança). Aqui: as funções respondem só sobre o usuário logado, um cliente
-- não "descobre" acesso a processo de outro cliente, e anon não executa.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated, anon;

select plan(8);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.helpers@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Helpers","role":"consultant"}'),
  ('c3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.a.helpers@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente A Helpers","role":"client"}'),
  ('c3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.b.helpers@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente B Helpers","role":"client"}');

insert into public.service_types (id, nome)
values ('c3000000-0000-0000-0000-0000000000a1', 'Serviço Helpers Teste');
insert into public.case_form_templates (id, service_type_id, nome)
values ('c3000000-0000-0000-0000-0000000000a2', 'c3000000-0000-0000-0000-0000000000a1', 'Template Helpers Teste');
insert into public.clients (id, nome, consultor_id) values
  ('c3000000-0000-0000-0000-0000000000b1', 'Cliente A Helpers', 'c3000000-0000-0000-0000-000000000001'),
  ('c3000000-0000-0000-0000-0000000000b2', 'Cliente B Helpers', 'c3000000-0000-0000-0000-000000000001');
insert into public.cases (id, client_id, service_type_id, consultor_id) values
  ('c3000000-0000-0000-0000-0000000000c1', 'c3000000-0000-0000-0000-0000000000b1',
   'c3000000-0000-0000-0000-0000000000a1', 'c3000000-0000-0000-0000-000000000001'),
  ('c3000000-0000-0000-0000-0000000000c2', 'c3000000-0000-0000-0000-0000000000b2',
   'c3000000-0000-0000-0000-0000000000a1', 'c3000000-0000-0000-0000-000000000001');
insert into public.case_forms (id, case_id, template_id) values
  ('c3000000-0000-0000-0000-0000000000d1', 'c3000000-0000-0000-0000-0000000000c1', 'c3000000-0000-0000-0000-0000000000a2'),
  ('c3000000-0000-0000-0000-0000000000d2', 'c3000000-0000-0000-0000-0000000000c2', 'c3000000-0000-0000-0000-0000000000a2');
insert into public.client_access (client_id, client_user_id) values
  ('c3000000-0000-0000-0000-0000000000b1', 'c3000000-0000-0000-0000-000000000002'),
  ('c3000000-0000-0000-0000-0000000000b2', 'c3000000-0000-0000-0000-000000000003');

-- Cliente A
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c3000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select ok(
  private.acesso_formulario('c3000000-0000-0000-0000-0000000000d1', 'cliente'),
  'cliente A tem acesso ao próprio formulário'
);
insert into public._test_results_scratch (resultado) select ok(
  not private.acesso_formulario('c3000000-0000-0000-0000-0000000000d2', 'cliente'),
  'cliente A não tem acesso ao formulário do cliente B'
);
insert into public._test_results_scratch (resultado) select ok(
  not private.acesso_processo('c3000000-0000-0000-0000-0000000000c1', 'consultor'),
  'cliente A não passa como consultor do próprio processo'
);
insert into public._test_results_scratch (resultado) select ok(
  not private.acesso_processo('c3000000-0000-0000-0000-0000000000c1', 'qualquer'),
  'via desconhecida nega'
);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_forms),
  1,
  'cliente A continua vendo só o próprio formulário'
);

-- Consultor
select set_config('request.jwt.claim.sub', 'c3000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select ok(
  private.acesso_formulario('c3000000-0000-0000-0000-0000000000d2', 'consultor'),
  'consultor tem acesso ao formulário do processo dele'
);
reset role;

-- anon não executa as funções (nem enxerga o schema private)
set local role anon;
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ select private.acesso_processo('c3000000-0000-0000-0000-0000000000c1', 'cliente') $$,
  '42501', null, 'anon não executa private.acesso_processo'
);
reset role;

insert into public._test_results_scratch (resultado) select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname like 'acesso_%'),
  'funções auxiliares não ficam no schema public (a API não expõe private)'
);

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
