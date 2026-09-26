-- KMP Hub · Testes de permissão (RLS) de invoices/invoice_items.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.invoices@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Invoices","role":"admin"}'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'finance.invoices@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Finance Invoices","role":"finance"}'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.invoices@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Invoices","role":"consultant"}'),
  ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.invoices@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Invoices","role":"client"}');

-- cliente de teste, criado como admin (dono do processo/fatura)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);

with cli as (
  insert into public.clients (nome, consultor_id)
  values ('Cliente Teste Invoices', 'd1000000-0000-0000-0000-000000000003')
  returning id
)
select set_config('app.client_id', id::text, true) from cli;

-- admin cria a invoice
with ins as (
  insert into public.invoices (client_id, servico_referente)
  values (current_setting('app.client_id', true)::uuid, 'Visto de teste')
  returning id, numero
)
select set_config('app.invoice_id', id::text, true) from ins;
reset role;

-- admin lê a invoice recém-criada
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.invoices where id = current_setting('app.invoice_id', true)::uuid),
  1,
  'admin vê a invoice criada'
);
reset role;

-- número gerado automaticamente, formato INV-<ano>-####
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select matches(
  (select numero from public.invoices where id = current_setting('app.invoice_id', true)::uuid),
  '^INV-[0-9]{4}-[0-9]{4}$',
  'número da invoice é gerado automaticamente no formato INV-ano-sequencial'
);
reset role;

-- finance também vê e edita
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.invoices where id = current_setting('app.invoice_id', true)::uuid),
  1,
  'finance vê a invoice'
);

select lives_ok(
  format(
    $$ update public.invoices set status = 'enviada' where id = %L $$,
    current_setting('app.invoice_id', true)
  ),
  'finance consegue atualizar status da invoice'
);
reset role;

select is(
  (select status from public.invoices where id = (select current_setting('app.invoice_id', true))::uuid),
  'enviada',
  'status foi mesmo atualizado pela finance'
);

-- consultor não vê invoices (nem as do próprio processo/cliente)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.invoices),
  0,
  'consultor não vê nenhuma invoice'
);
reset role;

-- cliente não vê a própria invoice (v1 é só uso interno da equipe)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.invoices),
  0,
  'cliente não vê nenhuma invoice (portal fica pra depois)'
);
reset role;

-- invoice_items segue a mesma regra
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
insert into public.invoice_items (invoice_id, descricao, quantidade, valor_unitario)
values (current_setting('app.invoice_id', true)::uuid, 'Taxa de serviço', 1, 500);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.invoice_items
   where invoice_id = current_setting('app.invoice_id', true)::uuid),
  1,
  'finance vê os itens da invoice'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.invoice_items),
  0,
  'consultor não vê nenhum item de invoice'
);
reset role;

select * from finish();
rollback;
