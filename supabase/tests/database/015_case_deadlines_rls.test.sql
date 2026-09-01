-- KMP Hub · Testes de permissão por função (RLS) de case_deadlines e
-- case_deadline_reminders (prazo de 28 dias — docs/spec-prazo-28-dias.md).
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Prazos","role":"admin"}'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor Prazos","role":"director"}'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Prazos","role":"consultant"}'),
  ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.prazos.outra@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outra Consultora","role":"consultant"}'),
  ('d1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.equipe.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Na Equipe","role":"operations"}'),
  ('d1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.fora.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Fora","role":"operations"}'),
  ('d1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Prazos","role":"partner"}'),
  ('d1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.prazos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Prazos","role":"client"}');

-- ---------------------------------------------------------------------------
-- Consultora cria cliente + processo (com operacional na equipe), e o prazo
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);

with st as (
  insert into public.service_types (nome) values ('Subclass 500 Prazos Teste') returning id
)
select set_config('app.service_type_id', id::text, true) from st;

with cli as (
  insert into public.clients (nome) values ('Cliente Prazo Teste') returning id
)
select set_config('app.client_id', id::text, true) from cli;

with cs as (
  insert into public.cases (client_id, service_type_id, equipe)
  values (
    current_setting('app.client_id', true)::uuid,
    current_setting('app.service_type_id', true)::uuid,
    array['d1000000-0000-0000-0000-000000000005']::uuid[]
  )
  returning id
)
select set_config('app.case_id', id::text, true) from cs;

with dl as (
  insert into public.case_deadlines (case_id, tipo_pedido, data_pedido, prazo_final)
  values (
    current_setting('app.case_id', true)::uuid,
    'exame_medico',
    current_date,
    current_date + interval '28 days'
  )
  returning id
)
select set_config('app.deadline_id', id::text, true) from dl;

select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  1,
  'consultora enxerga o prazo do próprio processo'
);
reset role;

-- ---------------------------------------------------------------------------
-- case_deadlines: visibilidade por função
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  0,
  'outra consultora (sem vínculo com o processo) não vê o prazo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  1,
  'operacional na equipe do processo vê o prazo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  0,
  'operacional fora da equipe não vê o prazo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  1,
  'admin vê qualquer prazo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  1,
  'diretor vê qualquer prazo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000007', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  0,
  'parceiro nunca vê prazos (acompanhamento interno da equipe)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000008', true);
select is(
  (select count(*)::int from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  0,
  'cliente do portal nunca vê prazos (acompanhamento interno da equipe)'
);
reset role;

-- ---------------------------------------------------------------------------
-- Consultora marca o documento como recebido (atualização própria)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
update public.case_deadlines
set status = 'documento_recebido', documento_recebido_em = current_date
where id = current_setting('app.deadline_id', true)::uuid;

select is(
  (select status from public.case_deadlines where id = current_setting('app.deadline_id', true)::uuid),
  'documento_recebido',
  'consultora consegue marcar o próprio prazo como documento recebido'
);
reset role;

-- ---------------------------------------------------------------------------
-- case_deadline_reminders: só admin/diretor leem; ninguém insere via RLS
-- ---------------------------------------------------------------------------

insert into public.case_deadline_reminders (case_deadline_id, marco_dias, destinatario)
values (current_setting('app.deadline_id', true)::uuid, 14, 'cliente@teste.com');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.case_deadline_reminders where case_deadline_id = current_setting('app.deadline_id', true)::uuid),
  0,
  'consultora não vê o histórico de lembretes (só admin/diretor auditam)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.case_deadline_reminders where case_deadline_id = current_setting('app.deadline_id', true)::uuid),
  1,
  'admin vê o histórico de lembretes enviados'
);
reset role;

select * from finish();
rollback;
