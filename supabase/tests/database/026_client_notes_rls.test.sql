-- KMP Hub · Notas internas do cliente (client_notes). Cobre:
-- 20261016140000_client_notes.sql.
--
-- Regras: admin/diretor leem e escrevem em todos; consultor só nos clientes
-- dele; operacional só nos clientes de processos em que está na equipe;
-- financeiro, parceiro e cliente nunca leem nem escrevem. Ninguém escreve
-- em nome de outro autor. Sem edição. Excluir: só o próprio autor ou admin.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(16);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c6000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Notas","role":"admin"}'),
  ('c6000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.a.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor A Notas","role":"consultant"}'),
  ('c6000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.b.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor B Notas","role":"consultant"}'),
  ('c6000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Notas","role":"operations"}'),
  ('c6000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'financeiro.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Financeiro Notas","role":"finance"}'),
  ('c6000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Notas","role":"client"}'),
  ('c6000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.fora.notas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Fora","role":"operations"}');

insert into public.service_types (id, nome)
values ('c6000000-0000-0000-0000-0000000000a1', 'Serviço Notas Teste');
-- Cliente A é do consultor A; o operacional está na equipe do processo dele.
insert into public.clients (id, nome, consultor_id)
values ('c6000000-0000-0000-0000-0000000000b1', 'Cliente A Notas', 'c6000000-0000-0000-0000-000000000002');
insert into public.cases (id, client_id, service_type_id, consultor_id, equipe)
values ('c6000000-0000-0000-0000-0000000000c1', 'c6000000-0000-0000-0000-0000000000b1',
        'c6000000-0000-0000-0000-0000000000a1', 'c6000000-0000-0000-0000-000000000002',
        array['c6000000-0000-0000-0000-000000000004']::uuid[]);
insert into public.client_access (client_id, client_user_id)
values ('c6000000-0000-0000-0000-0000000000b1', 'c6000000-0000-0000-0000-000000000006');

set local role authenticated;

-- Admin escreve uma nota
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000001', true);
insert into public._test_results_scratch (resultado) select lives_ok(
  $$ insert into public.client_notes (id, client_id, texto)
     values ('c6000000-0000-0000-0000-0000000000d1', 'c6000000-0000-0000-0000-0000000000b1', 'Nota do admin') $$,
  'admin escreve nota em qualquer cliente'
);

-- Consultor A (dono do cliente)
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes), 1, 'consultor do cliente lê a nota');
insert into public._test_results_scratch (resultado) select lives_ok(
  $$ insert into public.client_notes (id, client_id, texto)
     values ('c6000000-0000-0000-0000-0000000000d2', 'c6000000-0000-0000-0000-0000000000b1', 'Nota do consultor') $$,
  'consultor do cliente escreve nota');
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.client_notes (client_id, autor, texto)
     values ('c6000000-0000-0000-0000-0000000000b1', 'c6000000-0000-0000-0000-000000000001', 'Em nome do admin') $$,
  '42501', null, 'ninguém escreve nota em nome de outro autor');
update public.client_notes set texto = 'editada' where id = 'c6000000-0000-0000-0000-0000000000d2';
delete from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d1';

-- Consultor B (não é dono)
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes), 0, 'outro consultor não lê notas de cliente que não é dele');
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.client_notes (client_id, texto)
     values ('c6000000-0000-0000-0000-0000000000b1', 'Intrusa') $$,
  '42501', null, 'outro consultor não escreve nota em cliente que não é dele');

-- Operacional na equipe do processo
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000004', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes), 2, 'operacional da equipe do processo lê as notas');

-- Operacional fora da equipe
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000007', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes), 0, 'operacional fora da equipe não lê');

-- Financeiro
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000005', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes), 0, 'financeiro não lê notas internas');
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.client_notes (client_id, texto)
     values ('c6000000-0000-0000-0000-0000000000b1', 'Financeiro') $$,
  '42501', null, 'financeiro não escreve nota');

-- Cliente (com acesso ao próprio cadastro no portal)
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000006', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes), 0, 'cliente nunca lê nota interna, nem do próprio cadastro');
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.client_notes (client_id, texto)
     values ('c6000000-0000-0000-0000-0000000000b1', 'Cliente') $$,
  '42501', null, 'cliente não escreve nota interna');

reset role;

insert into public._test_results_scratch (resultado) select is(
  (select texto from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d2'),
  'Nota do consultor', 'nota não pode ser editada (update não tem efeito)');
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d1'),
  1, 'consultor não exclui nota de outro autor');

set local role authenticated;

-- Autor exclui a própria; admin exclui qualquer
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000002', true);
delete from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d2';
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000001', true);
delete from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d1';
reset role;

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d2'),
  0, 'autor exclui a própria nota');
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.client_notes where id = 'c6000000-0000-0000-0000-0000000000d1'),
  0, 'admin exclui nota de qualquer autor');

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
