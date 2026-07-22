-- KMP Hub · Gestão de usuários · Testes de RLS de profiles (colunas novas:
-- telefone/cargo/foto_url, migração 20260722120000). As policies em si já
-- existiam desde o Sprint 1 — este teste confirma que elas continuam
-- corretas com as colunas novas e que o trigger prevent_self_role_escalation
-- segue bloqueando autopromoção.
--
-- Como rodar: cole no SQL Editor e clique "Run without RLS" se aparecer o
-- aviso (é só a tabela de rascunho dos resultados, apagada no rollback).

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(6);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.profiles@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Profiles","role":"admin"}'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultant.profiles@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultant Profiles","role":"consultant"}');

-- ---------------------------------------------------------------------------
-- consultor: vê o próprio perfil e o do admin (staff vê todos via
-- profiles_select_staff só cobre admin/director — consultor só vê o próprio)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.profiles where user_id = 'd1000000-0000-0000-0000-000000000002'),
  1, 'consultor vê o próprio perfil'
);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.profiles where user_id = 'd1000000-0000-0000-0000-000000000001'),
  0, 'consultor não vê perfil de outro (não é admin/director)'
);

insert into public._test_results_scratch (resultado) select lives_ok(
  $$ update public.profiles set telefone = '+61 400 000 000', cargo = 'Consultor' where user_id = 'd1000000-0000-0000-0000-000000000002' $$,
  'consultor edita telefone/cargo do próprio perfil'
);

insert into public._test_results_scratch (resultado) select throws_ok(
  $$ update public.profiles set ativo = false where user_id = 'd1000000-0000-0000-0000-000000000002' $$,
  'P0001', null, 'consultor não consegue se autodesativar (trigger prevent_self_role_escalation)'
);

reset role;

-- ---------------------------------------------------------------------------
-- admin: vê todos e consegue desativar outro perfil
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.profiles where nome like '%Profiles'),
  2, 'admin vê os dois perfis de teste'
);

insert into public._test_results_scratch (resultado) select lives_ok(
  $$ update public.profiles set ativo = false where user_id = 'd1000000-0000-0000-0000-000000000002' $$,
  'admin consegue desativar o perfil de outro usuário'
);

reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
