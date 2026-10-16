-- KMP Hub · Pipeline por tarefas. Cobre: 20261016150000_stage_tasks.sql.
--
-- Tarefas padrão por etapa (só admin edita, equipe lê); ao entrar na etapa o
-- processo ganha as tarefas; concluídas todas, avança para a próxima etapa
-- (e registra no histórico); etapa sem tarefas padrão não avança sozinha;
-- gerar de novo não duplica; quem não enxerga o processo não gera tarefas.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(11);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c7000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.etapas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Etapas","role":"admin"}'),
  ('c7000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.etapas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Etapas","role":"consultant"}'),
  ('c7000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor2.etapas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outro Consultor","role":"consultant"}');

insert into public.service_types (id, nome) values ('c7000000-0000-0000-0000-0000000000a1', 'Visto Etapas Teste');
insert into public.case_stages (id, service_type_id, ordem, nome) values
  ('c7000000-0000-0000-0000-0000000000b1', 'c7000000-0000-0000-0000-0000000000a1', 1, 'Documentos'),
  ('c7000000-0000-0000-0000-0000000000b2', 'c7000000-0000-0000-0000-0000000000a1', 2, 'Aplicação'),
  ('c7000000-0000-0000-0000-0000000000b3', 'c7000000-0000-0000-0000-0000000000a1', 3, 'Decisão');
insert into public.clients (id, nome, consultor_id)
values ('c7000000-0000-0000-0000-0000000000c1', 'Cliente Etapas', 'c7000000-0000-0000-0000-000000000002');

set local role authenticated;

-- Consultor não edita tarefas padrão; admin edita
select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.case_stage_tasks (stage_id, titulo) values ('c7000000-0000-0000-0000-0000000000b1', 'x') $$,
  '42501', null, 'consultor não cria tarefa padrão');

select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-000000000001', true);
insert into public._test_results_scratch (resultado) select lives_ok(
  $$ insert into public.case_stage_tasks (stage_id, ordem, titulo, prazo_dias) values
       ('c7000000-0000-0000-0000-0000000000b1', 1, 'Pedir passaporte', 3),
       ('c7000000-0000-0000-0000-0000000000b1', 2, 'Conferir documentos', 7),
       ('c7000000-0000-0000-0000-0000000000b2', 1, 'Enviar aplicação', 2) $$,
  'admin cria tarefas padrão');

-- Consultor cria o processo já na etapa 1
select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_stage_tasks), 3, 'consultor lê as tarefas padrão');
insert into public.cases (id, client_id, service_type_id, consultor_id, etapa_id)
values ('c7000000-0000-0000-0000-0000000000d1', 'c7000000-0000-0000-0000-0000000000c1',
        'c7000000-0000-0000-0000-0000000000a1', 'c7000000-0000-0000-0000-000000000002',
        'c7000000-0000-0000-0000-0000000000b1');

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.tasks
   where case_id = 'c7000000-0000-0000-0000-0000000000d1' and responsavel = 'c7000000-0000-0000-0000-000000000002'),
  2, 'entrar na etapa cria as 2 tarefas padrão para o consultor do processo');
insert into public._test_results_scratch (resultado) select is(
  (select prazo - current_date from public.tasks
   where case_id = 'c7000000-0000-0000-0000-0000000000d1' and titulo = 'Conferir documentos'),
  7, 'prazo = hoje + prazo_dias');
insert into public._test_results_scratch (resultado) select is(
  public.gerar_tarefas_da_etapa('c7000000-0000-0000-0000-0000000000d1'), 0, 'gerar de novo não duplica');

-- Outro consultor não gera tarefas em processo que não enxerga
select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ select public.gerar_tarefas_da_etapa('c7000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'quem não enxerga o processo não gera tarefas');

-- Concluir uma não avança; concluir todas avança
select set_config('request.jwt.claim.sub', 'c7000000-0000-0000-0000-000000000002', true);
update public.tasks set status = 'concluida'
where case_id = 'c7000000-0000-0000-0000-0000000000d1' and titulo = 'Pedir passaporte';
insert into public._test_results_scratch (resultado) select is(
  (select etapa_id from public.cases where id = 'c7000000-0000-0000-0000-0000000000d1'),
  'c7000000-0000-0000-0000-0000000000b1'::uuid, 'com tarefa pendente o processo fica na etapa');

update public.tasks set status = 'concluida'
where case_id = 'c7000000-0000-0000-0000-0000000000d1' and titulo = 'Conferir documentos';
insert into public._test_results_scratch (resultado) select is(
  (select etapa_id from public.cases where id = 'c7000000-0000-0000-0000-0000000000d1'),
  'c7000000-0000-0000-0000-0000000000b2'::uuid, 'concluídas todas, avança para a próxima etapa');
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.tasks
   where case_id = 'c7000000-0000-0000-0000-0000000000d1' and titulo = 'Enviar aplicação' and status = 'pendente'),
  1, 'a etapa nova ganha as tarefas dela');

-- Etapa 3 não tem tarefa padrão: avança até ela e para
update public.tasks set status = 'concluida'
where case_id = 'c7000000-0000-0000-0000-0000000000d1' and titulo = 'Enviar aplicação';
reset role;
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_status_history
   where case_id = 'c7000000-0000-0000-0000-0000000000d1' and campo = 'etapa'),
  2, 'os dois avanços entram no histórico (linha do tempo)');

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
