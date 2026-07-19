-- KMP Hub · Testes de permissão por função (RLS) de tasks, task_comments,
-- appointments e appointment_summaries.
-- Referência: seção 5 (matriz, módulos "Tarefas" e "Agenda") e seção 8,
-- risco 2 (resumo contém riscos — cliente nunca vê).
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
select plan(12);

create extension if not exists pgtap with schema extensions;

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.tarefas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Tarefas","role":"admin"}'),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.tarefas@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Tarefas","role":"consultant"}'),
  ('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.participante@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Participante","role":"operations"}'),
  ('e1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'financeiro.fora@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Financeiro Fora","role":"finance"}'),
  ('e1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.agenda@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Agenda","role":"client"}');

-- ---------------------------------------------------------------------------
-- tasks: consultora cria tarefa com operacional como participante
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);

with ins as (
  insert into public.tasks (titulo, participantes)
  values ('Revisar documentos do 485', array['e1000000-0000-0000-0000-000000000003']::uuid[])
  returning id
)
select set_config('app.task_id', id::text, true) from ins;

select is(
  (select count(*)::int from public.tasks where id = current_setting('app.task_id', true)::uuid),
  1,
  'consultora vê a tarefa que criou (responsável e criadora)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.tasks where id = current_setting('app.task_id', true)::uuid),
  1,
  'operacional participante vê a tarefa'
);

select lives_ok(
  format(
    $$ insert into public.task_comments (task_id, autor, texto) values (%L, 'e1000000-0000-0000-0000-000000000003', 'comentário do participante') $$,
    current_setting('app.task_id', true)
  ),
  'participante consegue comentar na tarefa'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.tasks where id = current_setting('app.task_id', true)::uuid),
  0,
  'financeiro sem vínculo não vê a tarefa alheia'
);

select is(
  (select count(*)::int from public.task_comments where task_id = current_setting('app.task_id', true)::uuid),
  0,
  'financeiro sem vínculo também não vê os comentários'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.tasks where id = current_setting('app.task_id', true)::uuid),
  1,
  'admin vê qualquer tarefa'
);
reset role;

-- ---------------------------------------------------------------------------
-- appointments: consultora cria compromisso vinculado a um cliente dela
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);

with cli as (
  insert into public.clients (nome) values ('Cliente Agenda Teste') returning id
)
select set_config('app.client_id', id::text, true) from cli;

with ap as (
  insert into public.appointments (titulo, tipo, client_id, inicio, fim)
  values (
    'Consulta inicial',
    'consulta',
    current_setting('app.client_id', true)::uuid,
    now() - interval '2 hours',
    now() - interval '1 hour'
  )
  returning id
)
select set_config('app.appointment_id', id::text, true) from ap;

select is(
  (select count(*)::int from public.appointments where id = current_setting('app.appointment_id', true)::uuid),
  1,
  'consultora vê o próprio compromisso'
);

insert into public.appointment_summaries (appointment_id, resumo, riscos)
values (
  current_setting('app.appointment_id', true)::uuid,
  'Cliente decidiu aplicar para o 485.',
  'Passaporte vence em 5 meses — risco de atraso.'
);

select is(
  (select count(*)::int from public.appointment_summaries where appointment_id = current_setting('app.appointment_id', true)::uuid),
  1,
  'consultora registra e vê o resumo pós-consulta'
);
reset role;

-- Cliente do portal: vê o compromisso, mas NUNCA o resumo (riscos)
insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_id', true)::uuid, 'e1000000-0000-0000-0000-000000000005');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.appointments where id = current_setting('app.appointment_id', true)::uuid),
  1,
  'cliente vê o próprio compromisso via client_access'
);

select is(
  (select count(*)::int from public.appointment_summaries where appointment_id = current_setting('app.appointment_id', true)::uuid),
  0,
  'cliente NUNCA vê o resumo pós-consulta (contém riscos — nota interna)'
);
reset role;

-- Financeiro sem vínculo: não vê agenda alheia
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.appointments where id = current_setting('app.appointment_id', true)::uuid),
  0,
  'financeiro não vê compromisso de outra pessoa'
);
reset role;

-- list_staff_members: retorna as 4 pessoas de equipe (sem o cliente)
select is(
  (select count(*)::int from public.list_staff_members()),
  4,
  'list_staff_members lista só as funções de equipe'
);

select * from finish();
rollback;
