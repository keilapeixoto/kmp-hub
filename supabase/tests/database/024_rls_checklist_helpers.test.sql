-- KMP Hub · Função auxiliar de posse usada pelas políticas de
-- checklists/checklist_items. Cobre: 20261016130000_rls_checklist_helpers.sql.
--
-- As permissões dos checklists continuam cobertas pelo 005 (deve passar sem
-- mudança). Aqui: a função responde só sobre o usuário logado e um cliente
-- não "descobre" acesso a checklist de outro cliente.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(5);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.chk@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Chk","role":"consultant"}'),
  ('c4000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.a.chk@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente A Chk","role":"client"}');

insert into public.service_types (id, nome)
values ('c4000000-0000-0000-0000-0000000000a1', 'Serviço Chk Teste');
insert into public.checklist_templates (id, service_type_id, nome)
values ('c4000000-0000-0000-0000-0000000000a2', 'c4000000-0000-0000-0000-0000000000a1', 'Checklist Chk Teste');
insert into public.clients (id, nome, consultor_id) values
  ('c4000000-0000-0000-0000-0000000000b1', 'Cliente A Chk', 'c4000000-0000-0000-0000-000000000001'),
  ('c4000000-0000-0000-0000-0000000000b2', 'Cliente B Chk', 'c4000000-0000-0000-0000-000000000001');
insert into public.cases (id, client_id, service_type_id, consultor_id) values
  ('c4000000-0000-0000-0000-0000000000c1', 'c4000000-0000-0000-0000-0000000000b1',
   'c4000000-0000-0000-0000-0000000000a1', 'c4000000-0000-0000-0000-000000000001'),
  ('c4000000-0000-0000-0000-0000000000c2', 'c4000000-0000-0000-0000-0000000000b2',
   'c4000000-0000-0000-0000-0000000000a1', 'c4000000-0000-0000-0000-000000000001');
insert into public.checklists (id, case_id, checklist_template_id) values
  ('c4000000-0000-0000-0000-0000000000d1', 'c4000000-0000-0000-0000-0000000000c1', 'c4000000-0000-0000-0000-0000000000a2'),
  ('c4000000-0000-0000-0000-0000000000d2', 'c4000000-0000-0000-0000-0000000000c2', 'c4000000-0000-0000-0000-0000000000a2');
insert into public.client_access (client_id, client_user_id) values
  ('c4000000-0000-0000-0000-0000000000b1', 'c4000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select ok(
  private.acesso_checklist('c4000000-0000-0000-0000-0000000000d1', 'cliente'),
  'cliente A tem acesso ao checklist do próprio processo'
);
insert into public._test_results_scratch (resultado) select ok(
  not private.acesso_checklist('c4000000-0000-0000-0000-0000000000d2', 'cliente'),
  'cliente A não tem acesso ao checklist do cliente B'
);
insert into public._test_results_scratch (resultado) select ok(
  not private.acesso_checklist('c4000000-0000-0000-0000-0000000000d1', 'consultor'),
  'cliente A não passa como consultor'
);

select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select ok(
  private.acesso_checklist('c4000000-0000-0000-0000-0000000000d2', 'consultor'),
  'consultor tem acesso ao checklist do processo dele'
);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.checklists),
  2,
  'consultor continua vendo os checklists dos processos dele'
);
reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
