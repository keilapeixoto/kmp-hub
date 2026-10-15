-- KMP Hub · Teste de permissão (RLS) de case_client_updates (recados da
-- equipe para o cliente no portal).
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('a2200000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.recado@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Recado","role":"admin"}'),
  ('a2200000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.recado@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Recado","role":"consultant"}'),
  ('a2200000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'outra.consultora.recado@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outra Consultora","role":"consultant"}'),
  ('a2200000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.recado@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Recado","role":"client"}'),
  ('a2200000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'outro.cliente.recado@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outro Cliente","role":"client"}');

-- Admin cria tipo de serviço; consultora cria cliente e processo.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-000000000001', true);
with st as (insert into public.service_types (nome) values ('Tipo Recado Teste') returning id)
select set_config('app.st', id::text, true) from st;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-000000000002', true);
with cli as (insert into public.clients (nome) values ('Cliente Recado Teste') returning id)
select set_config('app.cli', id::text, true) from cli;
with cs as (
  insert into public.cases (client_id, service_type_id)
  values (current_setting('app.cli', true)::uuid, current_setting('app.st', true)::uuid)
  returning id
)
select set_config('app.case', id::text, true) from cs;

select lives_ok(
  $$ insert into public.case_client_updates (case_id, mensagem)
     values (current_setting('app.case', true)::uuid, 'Aguardando resposta do Home Affairs') $$,
  'consultora do processo escreve recado'
);
reset role;

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.cli', true)::uuid, 'a2200000-0000-0000-0000-000000000004');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$ insert into public.case_client_updates (case_id, mensagem)
     values (current_setting('app.case', true)::uuid, 'indevido') $$,
  '42501',
  null,
  'consultora de fora não escreve recado em processo alheio'
);
select is(
  (select count(*)::int from public.case_client_updates where case_id = current_setting('app.case', true)::uuid),
  0,
  'consultora de fora não lê os recados'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.case_client_updates where case_id = current_setting('app.case', true)::uuid),
  1,
  'cliente lê o recado do próprio processo'
);
select throws_ok(
  $$ insert into public.case_client_updates (case_id, mensagem)
     values (current_setting('app.case', true)::uuid, 'cliente tentando escrever') $$,
  '42501',
  null,
  'cliente não escreve recado'
);
select lives_ok(
  $$ update public.case_client_updates set mensagem = 'alterado' $$,
  'update do cliente não dá erro, mas não afeta nada (sem política)'
);
reset role;

select is(
  (select mensagem from public.case_client_updates where case_id = current_setting('app.case', true)::uuid),
  'Aguardando resposta do Home Affairs',
  'recado continua igual depois da tentativa de update do cliente'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2200000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.case_client_updates where case_id = current_setting('app.case', true)::uuid),
  0,
  'outro cliente não lê os recados'
);
reset role;

select * from finish();
rollback;
