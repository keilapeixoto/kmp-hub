-- KMP Hub · Testes de permissão por função (RLS) de service_types,
-- case_stages, cases e case_status_history.
-- Referência: seção 5 (matriz de permissões, módulo "Processos" e
-- "Templates" para service_types/case_stages).
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.casos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Casos","role":"admin"}'),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.casos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor Casos","role":"director"}'),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.casos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Casos","role":"consultant"}'),
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.equipe@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Na Equipe","role":"operations"}'),
  ('c1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.fora.equipe@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Fora","role":"operations"}'),
  ('c1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'financeiro.casos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Financeiro Casos","role":"finance"}'),
  ('c1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.casos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Casos","role":"partner"}'),
  ('c1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.casos@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Casos","role":"client"}');

-- ---------------------------------------------------------------------------
-- Admin cadastra o tipo de serviço e duas etapas
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

with st as (
  insert into public.service_types (nome) values ('Subclass 500 Teste') returning id
)
select set_config('app.service_type_id', id::text, true) from st;

with e1 as (
  insert into public.case_stages (service_type_id, ordem, nome)
  values (current_setting('app.service_type_id', true)::uuid, 1, 'Documentação')
  returning id
)
select set_config('app.stage1_id', id::text, true) from e1;

with e2 as (
  insert into public.case_stages (service_type_id, ordem, nome)
  values (current_setting('app.service_type_id', true)::uuid, 2, 'Análise')
  returning id
)
select set_config('app.stage2_id', id::text, true) from e2;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.service_types where id = current_setting('app.service_type_id', true)::uuid),
  1,
  'diretor lê o tipo de serviço (papel "Templates")'
);
reset role;

-- ---------------------------------------------------------------------------
-- Consultora cria um cliente e um processo com operacional na equipe
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);

with cli as (
  insert into public.clients (nome) values ('Cliente Processo Teste') returning id
)
select set_config('app.client_id', id::text, true) from cli;

with cs as (
  insert into public.cases (client_id, service_type_id, etapa_id, equipe)
  values (
    current_setting('app.client_id', true)::uuid,
    current_setting('app.service_type_id', true)::uuid,
    current_setting('app.stage1_id', true)::uuid,
    array['c1000000-0000-0000-0000-000000000004']::uuid[]
  )
  returning id
)
select set_config('app.case_id', id::text, true) from cs;

select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  1,
  'consultora enxerga o próprio processo'
);
reset role;

-- ---------------------------------------------------------------------------
-- cases: visibilidade por função
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  1,
  'operacional na equipe enxerga o processo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  0,
  'operacional fora da equipe não enxerga o processo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  1,
  'financeiro lê qualquer processo (R sem qualificador na matriz)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  1,
  'admin enxerga qualquer processo'
);
reset role;

-- ---------------------------------------------------------------------------
-- client_access: parceiro e cliente só veem o processo se compartilhado
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000007', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  0,
  'parceiro sem vínculo não vê o processo'
);
reset role;

insert into public.client_access (client_id, partner_id)
values (current_setting('app.client_id', true)::uuid, 'c1000000-0000-0000-0000-000000000007');

insert into public.client_access (client_id, client_user_id)
values (current_setting('app.client_id', true)::uuid, 'c1000000-0000-0000-0000-000000000008');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000007', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  1,
  'parceiro com vínculo em client_access vê o processo compartilhado'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000008', true);
select is(
  (select count(*)::int from public.cases where id = current_setting('app.case_id', true)::uuid),
  1,
  'cliente do portal vê o andamento do próprio processo'
);
reset role;

-- ---------------------------------------------------------------------------
-- histórico automático: mudança de status e de etapa
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
update public.cases
set status = 'pausado'
where id = current_setting('app.case_id', true)::uuid;

select is(
  (
    select row(de, para)
    from public.case_status_history
    where case_id = current_setting('app.case_id', true)::uuid and campo = 'status'
  ),
  row('ativo', 'pausado'),
  'mudança de status gera evento automático com de/para corretos'
);

update public.cases
set etapa_id = current_setting('app.stage2_id', true)::uuid
where id = current_setting('app.case_id', true)::uuid;

select is(
  (
    select row(de, para)
    from public.case_status_history
    where case_id = current_setting('app.case_id', true)::uuid and campo = 'etapa'
  ),
  row('Documentação', 'Análise'),
  'mudança de etapa gera evento automático com os nomes das etapas'
);
reset role;

-- ---------------------------------------------------------------------------
-- operacional na equipe consegue atualizar o processo
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000004', true);
select lives_ok(
  format(
    $$ update public.cases set prioridade = 'alta' where id = %L $$,
    current_setting('app.case_id', true)
  ),
  'operacional na equipe consegue atualizar o processo'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
select is(
  (select prioridade from public.cases where id = current_setting('app.case_id', true)::uuid),
  'alta',
  'a atualização do operacional teve efeito de verdade'
);
reset role;

select * from finish();
rollback;
