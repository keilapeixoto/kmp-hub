-- KMP Hub · Checklist sem modelo (pedidos avulsos). Cobre:
-- 20261017120000_checklist_sem_modelo.sql.
--
-- O consultor dono cria um checklist sem modelo e um pedido 'solicitado';
-- o cliente do processo vê o pedido; outro consultor não cria checklist em
-- processo alheio.
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
  ('ca000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.pedido@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Pedido","role":"consultant"}'),
  ('ca000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor2.pedido@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outro Pedido","role":"consultant"}'),
  ('ca000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.pedido@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Pedido","role":"client"}');

insert into public.service_types (id, nome) values ('ca000000-0000-0000-0000-0000000000a1', 'Visto Pedido Teste');
insert into public.clients (id, nome, consultor_id)
values ('ca000000-0000-0000-0000-0000000000b1', 'Cliente Pedido', 'ca000000-0000-0000-0000-000000000001');
insert into public.cases (id, client_id, service_type_id, consultor_id)
values ('ca000000-0000-0000-0000-0000000000c1', 'ca000000-0000-0000-0000-0000000000b1',
        'ca000000-0000-0000-0000-0000000000a1', 'ca000000-0000-0000-0000-000000000001');
insert into public.client_access (client_id, client_user_id)
values ('ca000000-0000-0000-0000-0000000000b1', 'ca000000-0000-0000-0000-000000000003');

set local role authenticated;

select set_config('request.jwt.claim.sub', 'ca000000-0000-0000-0000-000000000001', true);
insert into public.checklists (id, case_id)
values ('ca000000-0000-0000-0000-0000000000d1', 'ca000000-0000-0000-0000-0000000000c1');
insert into public.checklist_items (checklist_id, nome, status, observacao_equipe)
values ('ca000000-0000-0000-0000-0000000000d1', 'Tradução juramentada: certidão de casamento', 'solicitado', 'Para o inglês.');

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.checklist_items where checklist_id = 'ca000000-0000-0000-0000-0000000000d1'),
  1, 'consultor dono cria checklist sem modelo com um pedido');

select set_config('request.jwt.claim.sub', 'ca000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select is(
  (select status from public.checklist_items where checklist_id = 'ca000000-0000-0000-0000-0000000000d1'),
  'solicitado', 'cliente vê o pedido do próprio processo');

select set_config('request.jwt.claim.sub', 'ca000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.checklist_items where checklist_id = 'ca000000-0000-0000-0000-0000000000d1'),
  0, 'outro consultor não vê o pedido');
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.checklists (case_id) values ('ca000000-0000-0000-0000-0000000000c1') $$,
  '42501', null, 'outro consultor não cria checklist em processo alheio');

reset role;

insert into public._test_results_scratch (resultado) select is(
  (select checklist_template_id from public.checklists where id = 'ca000000-0000-0000-0000-0000000000d1'),
  null, 'checklist ficou sem modelo');

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
