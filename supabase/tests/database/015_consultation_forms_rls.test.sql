-- KMP Hub · Ficha de Consulta · Testes de RLS (migração
-- 20260726120000). Admin/director tudo; consultor só do próprio cliente
-- (clients.consultor_id) — outro consultor não vê nem escreve.
--
-- Como rodar: cole no SQL Editor e clique "Run without RLS" se aparecer o
-- aviso (é só a tabela de rascunho dos resultados, apagada no rollback).
-- Se der "relation _test_results_scratch does not exist" mesmo em aba nova,
-- ver nota em supabase/README.md ("Rodando os testes de permissão") sobre o
-- pooler em modo transação — rodar como bloco DO em vez de begin...rollback.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(5);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.fichas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Fichas","role":"admin"}'),
  ('f1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.a.fichas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor A Fichas","role":"consultant"}'),
  ('f1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.b.fichas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor B Fichas","role":"consultant"}');

-- Admin cria o cliente já com o Consultor A como dono, e uma ficha para ele
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);

with cli as (
  insert into public.clients (nome, consultor_id) values ('Cliente Ficha Teste', 'f1000000-0000-0000-0000-000000000002')
  returning id
)
select set_config('app.client_id', id::text, true) from cli;

insert into public._test_results_scratch (resultado) select lives_ok(
  format(
    $$ insert into public.consultation_forms (client_id, data, created_by) values (%L, '{}'::jsonb, %L) $$,
    current_setting('app.client_id', true)::uuid,
    'f1000000-0000-0000-0000-000000000001'
  ),
  'admin consegue criar ficha de consulta'
);

reset role;

-- Consultor A (dono do cliente): vê a ficha e consegue editar
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.consultation_forms where client_id = current_setting('app.client_id', true)::uuid),
  1,
  'consultor dono do cliente vê a ficha'
);

insert into public._test_results_scratch (resultado) select lives_ok(
  format(
    $$ update public.consultation_forms set data = '{"clientNames":"teste"}'::jsonb where client_id = %L $$,
    current_setting('app.client_id', true)::uuid
  ),
  'consultor dono do cliente consegue editar a ficha'
);

reset role;

-- Consultor B (não é dono do cliente): não vê e não consegue criar
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000003', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.consultation_forms where client_id = current_setting('app.client_id', true)::uuid),
  0,
  'consultor que não é dono do cliente não vê a ficha'
);

insert into public._test_results_scratch (resultado) select throws_ok(
  format(
    $$ insert into public.consultation_forms (client_id, data, created_by) values (%L, '{}'::jsonb, %L) $$,
    current_setting('app.client_id', true)::uuid,
    'f1000000-0000-0000-0000-000000000003'
  ),
  '42501', null, 'consultor que não é dono do cliente não consegue criar ficha'
);

reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
