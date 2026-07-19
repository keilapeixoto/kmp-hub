-- KMP Hub · Formulários de coleta de dados (Fase 2 antecipada) · Testes de
-- permissão e integridade. Cobre: 20260719130000/131000/132000.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker. Os resultados de cada teste ficam
-- guardados numa tabela temporária e só aparecem todos juntos no final,
-- porque o SQL Editor só mostra o resultado da ÚLTIMA instrução do script.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(9);

-- ---------------------------------------------------------------------------
-- Setup: admin cria template com 1 etapa/1 campo + 2 clientes/casos
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.forms@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Forms","role":"admin"}'),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.a.forms@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente A Forms","role":"client"}'),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.b.forms@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente B Forms","role":"client"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);

with st as (
  insert into public.service_types (nome) values ('Serviço Forms Teste') returning id
)
select set_config('app.service_type_id', id::text, true) from st;

with tpl as (
  insert into public.case_form_templates (service_type_id, nome)
  values (current_setting('app.service_type_id', true)::uuid, 'Template Forms Teste')
  returning id
)
select set_config('app.template_id', id::text, true) from tpl;

with step as (
  insert into public.case_form_steps (template_id, ordem, titulo)
  values (current_setting('app.template_id', true)::uuid, 1, 'Etapa 1')
  returning id
)
select set_config('app.step_id', id::text, true) from step;

with field as (
  insert into public.case_form_fields (step_id, ordem, label, tipo)
  values (current_setting('app.step_id', true)::uuid, 1, 'Nome completo', 'text')
  returning id
)
select set_config('app.field_id', id::text, true) from field;

-- template "estranho" (de outro service_type), usado no teste de validação
with st2 as (
  insert into public.service_types (nome) values ('Serviço Forms Teste B') returning id
)
select set_config('app.service_type_b_id', id::text, true) from st2;

with tpl2 as (
  insert into public.case_form_templates (service_type_id, nome)
  values (current_setting('app.service_type_b_id', true)::uuid, 'Template Forms Teste B')
  returning id
)
select set_config('app.template_b_id', id::text, true) from tpl2;

with step2 as (
  insert into public.case_form_steps (template_id, ordem, titulo)
  values (current_setting('app.template_b_id', true)::uuid, 1, 'Etapa 1 B')
  returning id
)
select set_config('app.step_b_id', id::text, true) from step2;

with field2 as (
  insert into public.case_form_fields (step_id, ordem, label, tipo)
  values (current_setting('app.step_b_id', true)::uuid, 1, 'Campo de outro template', 'text')
  returning id
)
select set_config('app.field_b_id', id::text, true) from field2;

with cli_a as (
  insert into public.clients (nome) values ('Cliente A Forms Teste') returning id
)
select set_config('app.client_a_id', id::text, true) from cli_a;

with cli_b as (
  insert into public.clients (nome) values ('Cliente B Forms Teste') returning id
)
select set_config('app.client_b_id', id::text, true) from cli_b;

with case_a as (
  insert into public.cases (client_id, service_type_id)
  values (current_setting('app.client_a_id', true)::uuid, current_setting('app.service_type_id', true)::uuid)
  returning id
)
select set_config('app.case_a_id', id::text, true) from case_a;

with case_b as (
  insert into public.cases (client_id, service_type_id)
  values (current_setting('app.client_b_id', true)::uuid, current_setting('app.service_type_id', true)::uuid)
  returning id
)
select set_config('app.case_b_id', id::text, true) from case_b;

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_a_id', true)::uuid, 'a1000000-0000-0000-0000-000000000002');

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_b_id', true)::uuid, 'a1000000-0000-0000-0000-000000000003');

reset role;

-- ---------------------------------------------------------------------------
-- Cliente A inicia o próprio formulário e responde o campo
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);

with cf as (
  insert into public.case_forms (case_id, template_id, status)
  values (current_setting('app.case_a_id', true)::uuid, current_setting('app.template_id', true)::uuid, 'em_preenchimento')
  returning id
)
select set_config('app.case_form_a_id', id::text, true) from cf;

insert into public._test_results_scratch (resultado) select ok(
  current_setting('app.case_form_a_id', true) is not null,
  'cliente consegue iniciar o próprio formulário (status em_preenchimento)'
);

insert into public.case_form_responses (case_form_id, field_id, valor)
values (current_setting('app.case_form_a_id', true)::uuid, current_setting('app.field_id', true)::uuid, 'Fernanda Soares');

insert into public._test_results_scratch (resultado) select is(
  (select valor from public.case_form_responses where case_form_id = current_setting('app.case_form_a_id', true)::uuid),
  'Fernanda Soares',
  'cliente consegue responder o próprio campo'
);

update public.case_form_responses
set valor = 'Fernanda Soares Corrigido'
where case_form_id = current_setting('app.case_form_a_id', true)::uuid;

insert into public._test_results_scratch (resultado) select is(
  (select valor from public.case_form_responses where case_form_id = current_setting('app.case_form_a_id', true)::uuid),
  'Fernanda Soares Corrigido',
  'cliente consegue corrigir a própria resposta'
);

-- Cliente pode avançar para "enviado"...
update public.case_forms
set status = 'enviado'
where id = current_setting('app.case_form_a_id', true)::uuid;

insert into public._test_results_scratch (resultado) select is(
  (select status from public.case_forms where id = current_setting('app.case_form_a_id', true)::uuid),
  'enviado',
  'cliente consegue marcar o próprio formulário como enviado'
);

-- ...mas NÃO pode se auto-aprovar
insert into public._test_results_scratch (resultado) select throws_ok(
  format(
    $tst$ update public.case_forms set status = 'aprovado' where id = %L $tst$,
    current_setting('app.case_form_a_id', true)
  ),
  '42501',
  null,
  'cliente não consegue mover o próprio formulário para aprovado'
);

-- ---------------------------------------------------------------------------
-- Cliente A NÃO consegue responder um campo de outro template (mesmo com
-- case_form_id próprio) — trigger de validação bloqueia
-- ---------------------------------------------------------------------------

insert into public._test_results_scratch (resultado) select throws_ok(
  format(
    $tst$
      insert into public.case_form_responses (case_form_id, field_id, valor)
      values (%L, %L, 'tentativa invalida')
    $tst$,
    current_setting('app.case_form_a_id', true),
    current_setting('app.field_b_id', true)
  ),
  'P0001',
  'field_id não pertence ao template deste formulário.',
  'cliente não consegue responder campo de outro template'
);

reset role;

-- ---------------------------------------------------------------------------
-- Isolamento entre clientes
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000003', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_forms where id = current_setting('app.case_form_a_id', true)::uuid),
  0,
  'cliente B não enxerga o formulário do cliente A'
);

insert into public._test_results_scratch (resultado) select throws_ok(
  format(
    $tst$
      insert into public.case_form_responses (case_form_id, field_id, valor)
      values (%L, %L, 'tentativa de cliente B')
    $tst$,
    current_setting('app.case_form_a_id', true),
    current_setting('app.field_id', true)
  ),
  '42501',
  null,
  'cliente B não consegue inserir resposta no formulário do cliente A'
);

reset role;

-- ---------------------------------------------------------------------------
-- Admin enxerga tudo
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);

insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.case_form_responses where case_form_id = current_setting('app.case_form_a_id', true)::uuid),
  1,
  'admin enxerga a resposta do cliente A'
);

reset role;

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;

rollback;
