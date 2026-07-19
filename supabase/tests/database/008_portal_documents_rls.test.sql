-- KMP Hub · Portal do cliente (Fase 2 antecipada) · Testes de permissão e
-- integridade do fluxo de upload de documento pelo próprio cliente.
-- Cobre: migração 20260719120000_portal_documents_trigger.sql.
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

-- ---------------------------------------------------------------------------
-- Usuários de teste: admin + 2 clientes distintos (isolamento entre eles)
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.portal@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Portal","role":"admin"}'),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.a.portal@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente A Portal","role":"client"}'),
  ('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.b.portal@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente B Portal","role":"client"}');

-- ---------------------------------------------------------------------------
-- Admin cadastra tipo de serviço + template com 1 item + 2 clientes/casos
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

with st as (
  insert into public.service_types (nome) values ('Serviço Portal Teste') returning id
)
select set_config('app.service_type_id', id::text, true) from st;

with ct as (
  insert into public.checklist_templates (service_type_id, nome)
  values (current_setting('app.service_type_id', true)::uuid, 'Template Portal Teste')
  returning id
)
select set_config('app.template_id', id::text, true) from ct;

insert into public.checklist_template_items (checklist_template_id, ordem, nome)
values (current_setting('app.template_id', true)::uuid, 1, 'Passaporte');

with cli_a as (
  insert into public.clients (nome) values ('Cliente A Portal Teste') returning id
)
select set_config('app.client_a_id', id::text, true) from cli_a;

with cli_b as (
  insert into public.clients (nome) values ('Cliente B Portal Teste') returning id
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

with cl_a as (
  insert into public.checklists (case_id, checklist_template_id)
  values (current_setting('app.case_a_id', true)::uuid, current_setting('app.template_id', true)::uuid)
  returning id
)
select set_config('app.checklist_a_id', id::text, true) from cl_a;

with cl_b as (
  insert into public.checklists (case_id, checklist_template_id)
  values (current_setting('app.case_b_id', true)::uuid, current_setting('app.template_id', true)::uuid)
  returning id
)
select set_config('app.checklist_b_id', id::text, true) from cl_b;

select set_config(
  'app.item_a_id',
  (select id::text from public.checklist_items where checklist_id = current_setting('app.checklist_a_id', true)::uuid),
  true
);
select set_config(
  'app.item_b_id',
  (select id::text from public.checklist_items where checklist_id = current_setting('app.checklist_b_id', true)::uuid),
  true
);

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_a_id', true)::uuid, 'e1000000-0000-0000-0000-000000000002');

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_b_id', true)::uuid, 'e1000000-0000-0000-0000-000000000003');

reset role;

-- ---------------------------------------------------------------------------
-- Cliente A envia o próprio documento — sobe e o item avança de status
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);

insert into public.documents (client_id, case_id, checklist_item_id, storage_path, enviado_por)
values (
  current_setting('app.client_a_id', true)::uuid,
  current_setting('app.case_a_id', true)::uuid,
  current_setting('app.item_a_id', true)::uuid,
  current_setting('app.client_a_id', true) || '/' || current_setting('app.case_a_id', true) || '/passaporte.pdf',
  'e1000000-0000-0000-0000-000000000002'
);

select is(
  (select status from public.checklist_items where id = current_setting('app.item_a_id', true)::uuid),
  'enviado',
  'trigger avança nao_solicitado -> enviado quando o cliente sobe o documento'
);

-- ---------------------------------------------------------------------------
-- Cliente A NÃO consegue atualizar o próprio checklist_item diretamente
-- (sem policy de UPDATE para client — só o trigger, via documento, pode)
-- ---------------------------------------------------------------------------

update public.checklist_items
set status = 'aprovado'
where id = current_setting('app.item_a_id', true)::uuid;

select is(
  (select status from public.checklist_items where id = current_setting('app.item_a_id', true)::uuid),
  'enviado',
  'cliente não tem policy de UPDATE em checklist_items — update direto não altera nada'
);

-- ---------------------------------------------------------------------------
-- Cliente A NÃO consegue inserir documento apontando checklist_item de B
-- (mesmo usando o próprio client_id/case_id — bloqueado pela trigger de
-- validação, não só pela RLS de leitura)
-- ---------------------------------------------------------------------------

select throws_ok(
  format(
    $$
      insert into public.documents (client_id, case_id, checklist_item_id, storage_path, enviado_por)
      values (%L, %L, %L, 'x/y/z.pdf', 'e1000000-0000-0000-0000-000000000002')
    $$,
    current_setting('app.client_a_id', true),
    current_setting('app.case_a_id', true),
    current_setting('app.item_b_id', true)
  ),
  'P0001',
  'checklist_item_id não pertence ao case_id informado.',
  'cliente A não consegue vincular documento ao checklist_item do cliente B'
);

-- ---------------------------------------------------------------------------
-- Cliente A NÃO consegue inserir documento com case_id de B mesmo mantendo
-- o próprio client_id (RLS de client_id sozinha não bastaria para pegar isso)
-- ---------------------------------------------------------------------------

select throws_ok(
  format(
    $$
      insert into public.documents (client_id, case_id, storage_path, enviado_por)
      values (%L, %L, 'x/y/z.pdf', 'e1000000-0000-0000-0000-000000000002')
    $$,
    current_setting('app.client_a_id', true),
    current_setting('app.case_b_id', true)
  ),
  'P0001',
  'case_id informado não pertence ao client_id informado.',
  'cliente A não consegue vincular documento ao case_id do cliente B'
);

-- ---------------------------------------------------------------------------
-- Cliente A não enxerga nem consegue tocar em nada do cliente B (RLS básica,
-- reconfirmada aqui no contexto do fluxo do portal)
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.checklist_items where id = current_setting('app.item_b_id', true)::uuid),
  0,
  'cliente A não enxerga o checklist_item do cliente B'
);

select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_b_id', true)::uuid),
  0,
  'cliente A não enxerga o case do cliente B'
);

reset role;

-- ---------------------------------------------------------------------------
-- Reenvio após rejeição: reenvio_solicitado -> reenviado
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
update public.checklist_items
set status = 'reenvio_solicitado'
where id = current_setting('app.item_a_id', true)::uuid;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);
insert into public.documents (client_id, case_id, checklist_item_id, storage_path, enviado_por)
values (
  current_setting('app.client_a_id', true)::uuid,
  current_setting('app.case_a_id', true)::uuid,
  current_setting('app.item_a_id', true)::uuid,
  current_setting('app.client_a_id', true) || '/' || current_setting('app.case_a_id', true) || '/passaporte-v2.pdf',
  'e1000000-0000-0000-0000-000000000002'
);
select is(
  (select status from public.checklist_items where id = current_setting('app.item_a_id', true)::uuid),
  'reenviado',
  'trigger avança reenvio_solicitado -> reenviado no reenvio do cliente'
);
reset role;

-- ---------------------------------------------------------------------------
-- Cliente B consegue enviar o próprio documento normalmente (fluxo positivo)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);
insert into public.documents (client_id, case_id, checklist_item_id, storage_path, enviado_por)
values (
  current_setting('app.client_b_id', true)::uuid,
  current_setting('app.case_b_id', true)::uuid,
  current_setting('app.item_b_id', true)::uuid,
  current_setting('app.client_b_id', true) || '/' || current_setting('app.case_b_id', true) || '/passaporte.pdf',
  'e1000000-0000-0000-0000-000000000003'
);
select is(
  (select status from public.checklist_items where id = current_setting('app.item_b_id', true)::uuid),
  'enviado',
  'cliente B consegue enviar o próprio documento e o item avança normalmente'
);
reset role;

select * from finish();
rollback;
