-- KMP Hub · Testes de permissão por função (RLS) de clients, client_relations,
-- identity_documents e da function convert_lead_to_client.
-- Referência: seção 5 (matriz de permissões, módulos "Clientes" e
-- "Documentos") e seção 3 (conversão transacional).
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.clientes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Clientes","role":"admin"}'),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.clientes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor Clientes","role":"director"}'),
  ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.clientes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora A","role":"consultant"}'),
  ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultorb.clientes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor B","role":"consultant"}'),
  ('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.clientes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Clientes","role":"operations"}'),
  ('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.clientes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Teste","role":"partner"}'),
  ('b1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.portal@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Portal","role":"client"}');

-- ---------------------------------------------------------------------------
-- Consultora A cadastra um lead e converte em cliente
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);

with ins as (
  insert into public.leads (nome, pais, origem, servico_interesse)
  values ('Cliente Convertido Teste', 'Brasil', 'Indicação', 'Subclass 189')
  returning id
)
select set_config('app.lead_id', id::text, true) from ins;

select set_config(
  'app.client_id',
  (select public.convert_lead_to_client(current_setting('app.lead_id', true)::uuid))::text,
  true
);

select is(
  (select consultor_id from public.clients where id = current_setting('app.client_id', true)::uuid),
  'b1000000-0000-0000-0000-000000000003'::uuid,
  'cliente criado pela conversão fica com o consultor do lead de origem'
);

select is(
  (select status from public.leads where id = current_setting('app.lead_id', true)::uuid),
  'convertido',
  'conversão marca o lead como convertido'
);

select throws_ok(
  format(
    $$ select public.convert_lead_to_client(%L) $$,
    current_setting('app.lead_id', true)
  ),
  'P0001',
  'Este lead já foi convertido em cliente.',
  'converter o mesmo lead de novo é bloqueado'
);
reset role;

-- ---------------------------------------------------------------------------
-- clients: visibilidade por função (consultor só nos próprios, sem compartilhar)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.clients where id = current_setting('app.client_id', true)::uuid),
  0,
  'outro consultor não vê o cliente da colega (sem compartilhamento, diferente de leads)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.clients where id = current_setting('app.client_id', true)::uuid),
  1,
  'admin enxerga o cliente de qualquer consultor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.clients where id = current_setting('app.client_id', true)::uuid),
  1,
  'diretor também enxerga o cliente de qualquer consultor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.clients)::int,
  0,
  'função operations não enxerga nenhum cliente'
);
reset role;

-- ---------------------------------------------------------------------------
-- client_access: parceiro e cliente só veem o que está vinculado via client_access
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.clients where id = current_setting('app.client_id', true)::uuid),
  0,
  'parceiro sem vínculo em client_access não vê o cliente'
);
reset role;

insert into public.client_access (client_id, partner_id)
values (current_setting('app.client_id', true)::uuid, 'b1000000-0000-0000-0000-000000000006');

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_id', true)::uuid, 'b1000000-0000-0000-0000-000000000007');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.clients where id = current_setting('app.client_id', true)::uuid),
  1,
  'parceiro com vínculo em client_access vê o cliente compartilhado'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000007', true);
select is(
  (select count(*)::int from public.clients where id = current_setting('app.client_id', true)::uuid),
  1,
  'cliente do portal vê o próprio perfil via client_access'
);
reset role;

-- ---------------------------------------------------------------------------
-- client_relations: dependente cadastrado pela mesma consultora
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);

with dep as (
  insert into public.clients (nome, pais)
  values ('Dependente Teste', 'Brasil')
  returning id
), rel as (
  insert into public.client_relations (client_id, related_client_id, tipo)
  select current_setting('app.client_id', true)::uuid, dep.id, 'filho' from dep
  returning id
)
select set_config('app.relation_id', id::text, true) from rel;

select is(
  (select count(*)::int from public.client_relations where id = current_setting('app.relation_id', true)::uuid),
  1,
  'consultora enxerga a relação de dependente que criou'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.client_relations where id = current_setting('app.relation_id', true)::uuid),
  0,
  'outro consultor não vê a relação de dependente da colega'
);
reset role;

-- ---------------------------------------------------------------------------
-- identity_documents: visibilidade e arquivamento (soft delete)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);

with ins as (
  insert into public.identity_documents (client_id, tipo, numero, validade)
  values (current_setting('app.client_id', true)::uuid, 'passaporte', 'AB123456', current_date + interval '90 days')
  returning id
)
select set_config('app.document_id', id::text, true) from ins;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.identity_documents where id = current_setting('app.document_id', true)::uuid),
  0,
  'outro consultor não vê o documento de identidade do cliente da colega'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);
update public.identity_documents
set arquivado = true
where id = current_setting('app.document_id', true)::uuid;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.identity_documents where id = current_setting('app.document_id', true)::uuid),
  0,
  'depois de arquivado, nem a própria consultora vê mais o documento'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.identity_documents where id = current_setting('app.document_id', true)::uuid),
  0,
  'diretor também não vê documento arquivado (só admin acessa arquivados)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.identity_documents where id = current_setting('app.document_id', true)::uuid),
  1,
  'admin continua vendo o documento mesmo arquivado'
);
reset role;

select * from finish();
rollback;
