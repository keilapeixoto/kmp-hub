-- KMP Hub · Teste de permissão (RLS) da tabela extension_tokens.
--
-- Mesmo padrão do teste de google_connections: RLS ativado SEM NENHUMA
-- política bloqueia completamente select/insert/update/delete pra
-- qualquer role "authenticated", inclusive admin. Só a secret key
-- (createAdminClient()) deve conseguir tocar nesta tabela.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.ext@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Ext","role":"admin"}');

insert into public.extension_tokens (user_id, token_hash, rotulo)
values (
  'f1000000-0000-0000-0000-000000000001',
  'hash-fake-nao-usar',
  'Extensão ImmiAccount - Chrome'
);

select is(
  (select count(*)::int from public.extension_tokens),
  1,
  'a linha existe (inserida sem RLS, simulando a secret key)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::int from public.extension_tokens),
  0,
  'admin não vê nenhum token via client normal (RLS bloqueia total)'
);

select throws_ok(
  $$ insert into public.extension_tokens (user_id, token_hash)
     values ('f1000000-0000-0000-0000-000000000001', 'tentativa-indevida') $$,
  '42501'
);

select lives_ok(
  $$ update public.extension_tokens set rotulo = 'tentativa indevida' $$,
  'update não dá erro, mas RLS filtra silenciosamente (0 linhas afetadas)'
);

select lives_ok(
  $$ delete from public.extension_tokens $$,
  'delete não dá erro, mas RLS filtra silenciosamente (0 linhas afetadas)'
);
reset role;

select is(
  (select rotulo from public.extension_tokens limit 1),
  'Extensão ImmiAccount - Chrome',
  'rótulo não mudou — update da role authenticated não teve efeito nenhum'
);

select * from finish();
rollback;
