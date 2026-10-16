-- KMP Hub · app_settings (configurações da equipe). Cobre:
-- 20261017140000_app_settings.sql.
--
-- Admin grava; consultor lê mas não grava; cliente não vê.
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
  ('cb000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.config@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Config","role":"admin"}'),
  ('cb000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.config@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Config","role":"consultant"}'),
  ('cb000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.config@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Config","role":"client"}');

set local role authenticated;

select set_config('request.jwt.claim.sub', 'cb000000-0000-0000-0000-000000000001', true);
insert into public.app_settings (chave, valor) values ('teste.colunas', '{"vencido":"Já venceu"}');
insert into public._test_results_scratch (resultado) select is(
  (select valor->>'vencido' from public.app_settings where chave = 'teste.colunas'),
  'Já venceu', 'admin grava a configuração');

select set_config('request.jwt.claim.sub', 'cb000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.app_settings where chave = 'teste.colunas'),
  1, 'consultor lê a configuração');
update public.app_settings set valor = '{"vencido":"mudou"}' where chave = 'teste.colunas';
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.app_settings (chave, valor) values ('teste.outra', '{}') $$,
  '42501', null, 'consultor não cria configuração');

select set_config('request.jwt.claim.sub', 'cb000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.app_settings),
  0, 'cliente não vê configurações');

reset role;
insert into public._test_results_scratch (resultado) select is(
  (select valor->>'vencido' from public.app_settings where chave = 'teste.colunas'),
  'Já venceu', 'consultor não conseguiu alterar');

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
