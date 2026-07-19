-- KMP Hub · Testes de permissão por função (RLS) de checklists,
-- checklist_items, documents e document_versions.
-- Referência: seção 5 (matriz de permissões, módulos "Checklists" e
-- "Documentos") e seção 8, risco 3 (documentos sensíveis).
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
select plan(14);

create extension if not exists pgtap with schema extensions;

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Docs","role":"admin"}'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor Docs","role":"director"}'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Docs","role":"consultant"}'),
  ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.equipe.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Equipe","role":"operations"}'),
  ('d1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.fora.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Fora","role":"operations"}'),
  ('d1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Docs","role":"partner"}'),
  ('d1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.docs@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Docs","role":"client"}');

-- ---------------------------------------------------------------------------
-- Admin cadastra tipo de serviço + template de checklist com 2 itens
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

with st as (
  insert into public.service_types (nome) values ('Serviço Checklist Teste') returning id
)
select set_config('app.service_type_id', id::text, true) from st;

with ct as (
  insert into public.checklist_templates (service_type_id, nome)
  values (current_setting('app.service_type_id', true)::uuid, 'Template Teste')
  returning id
)
select set_config('app.template_id', id::text, true) from ct;

insert into public.checklist_template_items (checklist_template_id, ordem, nome)
values
  (current_setting('app.template_id', true)::uuid, 1, 'Passaporte'),
  (current_setting('app.template_id', true)::uuid, 2, 'Certidão de nascimento');
reset role;

-- ---------------------------------------------------------------------------
-- Consultora cria cliente, processo e instancia o checklist
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);

with cli as (
  insert into public.clients (nome) values ('Cliente Checklist Teste') returning id
)
select set_config('app.client_id', id::text, true) from cli;

with cs as (
  insert into public.cases (client_id, service_type_id)
  values (current_setting('app.client_id', true)::uuid, current_setting('app.service_type_id', true)::uuid)
  returning id
)
select set_config('app.case_id', id::text, true) from cs;

with cl as (
  insert into public.checklists (case_id, checklist_template_id)
  values (current_setting('app.case_id', true)::uuid, current_setting('app.template_id', true)::uuid)
  returning id
)
select set_config('app.checklist_id', id::text, true) from cl;

select is(
  (select count(*)::int from public.checklist_items where checklist_id = current_setting('app.checklist_id', true)::uuid),
  2,
  'instanciar o checklist copia os 2 itens do template'
);

select is(
  (select percentual from public.checklists where id = current_setting('app.checklist_id', true)::uuid),
  0::numeric,
  'percentual começa em 0'
);

with item as (
  select id from public.checklist_items
  where checklist_id = current_setting('app.checklist_id', true)::uuid
  order by created_at limit 1
)
select set_config('app.item_id', id::text, true) from item;

update public.checklist_items
set status = 'aprovado'
where id = current_setting('app.item_id', true)::uuid;

select is(
  (select percentual from public.checklists where id = current_setting('app.checklist_id', true)::uuid),
  50.0::numeric,
  'aprovar 1 de 2 itens recalcula o percentual para 50%'
);
reset role;

-- ---------------------------------------------------------------------------
-- checklists: visibilidade por função (equipe do processo)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.checklists where id = current_setting('app.checklist_id', true)::uuid),
  0,
  'operacional fora da equipe não vê o checklist'
);
reset role;

update public.cases
set equipe = array['d1000000-0000-0000-0000-000000000004']::uuid[]
where id = current_setting('app.case_id', true)::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.checklists where id = current_setting('app.checklist_id', true)::uuid),
  1,
  'operacional na equipe vê o checklist'
);
reset role;

insert into public.client_access (client_id, partner_id)
values (current_setting('app.client_id', true)::uuid, 'd1000000-0000-0000-0000-000000000006');

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_id', true)::uuid, 'd1000000-0000-0000-0000-000000000007');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.checklists where id = current_setting('app.checklist_id', true)::uuid),
  1,
  'parceiro com vínculo em client_access vê o checklist'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000007', true);
select is(
  (select count(*)::int from public.checklists where id = current_setting('app.checklist_id', true)::uuid),
  1,
  'cliente do portal vê o próprio checklist'
);
reset role;

-- ---------------------------------------------------------------------------
-- documents: versão inicial automática e visibilidade
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);

with doc as (
  insert into public.documents (client_id, case_id, storage_path, enviado_por)
  values (
    current_setting('app.client_id', true)::uuid,
    current_setting('app.case_id', true)::uuid,
    current_setting('app.client_id', true) || '/' || current_setting('app.case_id', true) || '/passaporte-v1.pdf',
    'd1000000-0000-0000-0000-000000000003'
  )
  returning id
)
select set_config('app.document_id', id::text, true) from doc;

select is(
  (select count(*)::int from public.document_versions where document_id = current_setting('app.document_id', true)::uuid),
  1,
  'criar um documento gera a versão 1 automaticamente'
);

insert into public.document_versions (document_id, versao, storage_path, autor)
values (
  current_setting('app.document_id', true)::uuid,
  2,
  current_setting('app.client_id', true) || '/' || current_setting('app.case_id', true) || '/passaporte-v2.pdf',
  'd1000000-0000-0000-0000-000000000003'
);

select is(
  (select count(*)::int from public.document_versions where document_id = current_setting('app.document_id', true)::uuid),
  2,
  'reenviar cria a versão 2'
);
reset role;

-- ---------------------------------------------------------------------------
-- documents: arquivamento (soft delete) — só admin acessa arquivados
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
update public.documents
set arquivado = true
where id = current_setting('app.document_id', true)::uuid;

select is(
  (select count(*)::int from public.documents where id = current_setting('app.document_id', true)::uuid),
  0,
  'depois de arquivado, nem a própria consultora vê mais o documento'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.documents where id = current_setting('app.document_id', true)::uuid),
  0,
  'diretor também não vê documento arquivado (só admin acessa arquivados)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.documents where id = current_setting('app.document_id', true)::uuid),
  1,
  'admin continua vendo o documento mesmo arquivado'
);
reset role;

-- ---------------------------------------------------------------------------
-- checklist_template_items: só equipe lê, parceiro/cliente sem acesso
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.checklist_template_items where checklist_template_id = current_setting('app.template_id', true)::uuid),
  0,
  'parceiro não lê itens de template de checklist (módulo Templates)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.checklist_template_items where checklist_template_id = current_setting('app.template_id', true)::uuid),
  2,
  'consultor lê os itens de template de checklist (módulo Templates)'
);
reset role;

select * from finish();
rollback;
