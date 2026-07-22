-- KMP Hub · Controle de armazenamento · Testes de RLS. Cobre: document_categories,
-- storage_settings, storage_daily_snapshots, storage_audit_runs,
-- storage_alert_events (migrações 20260721150000 a 20260721150500).
--
-- storage_daily_snapshots/storage_audit_runs/storage_alert_events não têm
-- policy de insert pra NENHUMA função de propósito — só a rotina diária
-- (Route Handler com lib/supabase/admin.ts, chave secreta, ignora RLS) grava
-- essas tabelas. Por isso os seeds delas rodam aqui ainda como o role dono
-- da conexão (antes do primeiro "set local role authenticated"), e os
-- testes daqui pra frente cobrem só leitura/reconhecimento.
--
-- Como rodar: cole no SQL Editor e clique "Run without RLS" se aparecer o
-- aviso (é só a tabela de rascunho dos resultados, apagada no rollback).

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(11);

-- ---------------------------------------------------------------------------
-- Seeds que exigem bypass de RLS (rodam antes de qualquer "set local role")
-- ---------------------------------------------------------------------------

insert into public.storage_daily_snapshots (snapshot_date, total_bytes, total_bytes_ativos, total_bytes_arquivados, total_arquivos)
values (current_date, 2000000000, 1900000000, 100000000, 2922);

with run as (
  insert into public.storage_audit_runs (total_bytes, orfaos_sem_processo, duplicados_grupos)
  values (2000000000, 0, 0)
  returning id
)
select set_config('app.audit_run_id', id::text, true) from run;

with alert as (
  insert into public.storage_alert_events (threshold_pct, total_bytes, email_status)
  values (50, 2000000000, 'enviado')
  returning id
)
select set_config('app.alert_id', id::text, true) from alert;

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.storage@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Storage","role":"admin"}'),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'director.storage@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Director Storage","role":"director"}'),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultant.storage@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultant Storage","role":"consultant"}'),
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'client.storage@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Client Storage","role":"client"}');

-- ---------------------------------------------------------------------------
-- storage_settings — só admin/director
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.storage_settings), 1, 'admin vê storage_settings'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.storage_settings), 1, 'director vê storage_settings'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.storage_settings), 0, 'consultor não vê storage_settings'
);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.document_categories), 10, 'consultor lê document_categories (lista pro upload)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000004', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.storage_settings), 0, 'cliente não vê storage_settings'
);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.document_categories), 10, 'cliente lê document_categories (lista pro upload no portal)'
);
reset role;

-- ---------------------------------------------------------------------------
-- document_categories — só admin/director gerenciam
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
insert into public._test_results_scratch (resultado) select lives_ok(
  $$ insert into public.document_categories (nome) values ('Categoria Teste Admin') $$,
  'admin consegue criar categoria de documento'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.document_categories (nome) values ('Categoria Teste Consultor') $$,
  '42501', null, 'consultor não consegue criar categoria de documento'
);
reset role;

-- ---------------------------------------------------------------------------
-- storage_daily_snapshots / storage_audit_runs / storage_alert_events —
-- só admin/director leem; reconhecimento de alerta só admin/director
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.storage_daily_snapshots), 1, 'admin vê o snapshot diário'
);
insert into public._test_results_scratch (resultado) select lives_ok(
  format(
    $$ update public.storage_alert_events set reconhecido_em = now() where id = %L $$,
    current_setting('app.alert_id', true)::uuid
  ),
  'admin consegue reconhecer (ack) um alerta'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.storage_daily_snapshots), 0, 'consultor não vê snapshots de armazenamento'
);
reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
