-- KMP Hub · Teste de permissão (RLS) da tabela google_connections.
--
-- Esta tabela guarda refresh_token do Google (Calendar/Gmail) — o teste
-- confirma que RLS ativado SEM NENHUMA política bloqueia completamente
-- select/insert/update/delete pra qualquer role "authenticated", inclusive
-- admin. Só a secret key (que ignora RLS, usada via createAdminClient())
-- deve conseguir tocar nesta tabela.
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
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.google@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Google","role":"admin"}');

-- linha criada como superuser do teste (equivalente ao createAdminClient(),
-- que usa a secret key e ignora RLS).
insert into public.google_connections (user_id, google_email, refresh_token, scope)
values (
  'e1000000-0000-0000-0000-000000000001',
  'keila@kmpconsulting.com.au',
  'refresh-token-fake-nao-usar',
  'calendar.readonly gmail.readonly gmail.send'
);

select is(
  (select count(*)::int from public.google_connections),
  1,
  'a linha existe (inserida sem RLS, simulando a secret key)'
);

-- admin autenticado via client normal não enxerga nada — RLS ativado sem
-- política nenhuma bloqueia total.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::int from public.google_connections),
  0,
  'admin não vê nenhuma conexão via client normal (RLS bloqueia total)'
);

select throws_ok(
  $$ insert into public.google_connections (user_id, refresh_token, scope)
     values ('e1000000-0000-0000-0000-000000000001', 'tentativa-indevida', 'x') $$,
  '42501'
);

select lives_ok(
  $$ update public.google_connections set google_email = 'tentativa@indevida.com' $$,
  'update não dá erro, mas RLS filtra silenciosamente (0 linhas afetadas)'
);

select lives_ok(
  $$ delete from public.google_connections $$,
  'delete não dá erro, mas RLS filtra silenciosamente (0 linhas afetadas)'
);
reset role;

-- confirma que o update/delete acima realmente não afetaram nada (fora do
-- contexto RLS, de volta como superuser do teste).
select is(
  (select google_email from public.google_connections limit 1),
  'keila@kmpconsulting.com.au',
  'e-mail não mudou — update da role authenticated não teve efeito nenhum'
);

select * from finish();
rollback;
