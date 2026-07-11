-- KMP Hub · Testes de permissão por função (RLS) das tabelas de identidade e acesso.
-- Referência: seção 5 (matriz de permissões) e seção 8, risco 1, do plano.
--
-- Como rodar (requer Supabase CLI + Docker, não executado neste ambiente):
--   supabase test db
--
-- Convenção: cada bloco simula um usuário autenticado com
-- `set_config('request.jwt.claim.sub', <uuid>, true)` + `set local role authenticated`,
-- que é como `auth.uid()` resolve o usuário sob RLS no Postgres do Supabase.

begin;
select plan(10);

create extension if not exists pgtap with schema extensions;

-- ---------------------------------------------------------------------------
-- Usuários de teste, um por função relevante neste sprint
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.teste@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Teste","role":"admin"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.teste@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor Teste","role":"director"}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.teste@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Teste","role":"consultant"}'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.teste@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Teste","role":"client"}');

-- handle_new_user já criou a linha correspondente em public.profiles para cada um.

-- ---------------------------------------------------------------------------
-- get_user_role(): reflete a função atribuída na criação do usuário
-- ---------------------------------------------------------------------------

select is(
  public.get_user_role('11111111-1111-1111-1111-111111111111'),
  'admin',
  'get_user_role: admin'
);

select is(
  public.get_user_role('33333333-3333-3333-3333-333333333333'),
  'consultant',
  'get_user_role: consultant'
);

select is(
  public.get_user_role('44444444-4444-4444-4444-444444444444'),
  'client',
  'get_user_role: client'
);

-- ---------------------------------------------------------------------------
-- roles: só admin e diretor leem; demais funções não veem nada
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is((select count(*) from public.roles)::int, 7, 'admin lê as 7 funções em roles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is((select count(*) from public.roles)::int, 7, 'diretor lê as 7 funções em roles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select is((select count(*) from public.roles)::int, 0, 'consultor não lê a tabela roles');
reset role;

-- capturado como postgres (fora de RLS) para usar dentro do teste abaixo,
-- já que o consultant não enxerga a tabela roles para resolver o id sozinho.
select id as consultant_role_id from public.roles where nome = 'consultant' \gset

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select throws_ok(
  format(
    $$ insert into public.permissions (role_id, modulo, acao) values (%L, 'equipe', 'read') $$,
    :'consultant_role_id'
  ),
  'consultor não consegue inserir em permissions'
);
reset role;

-- ---------------------------------------------------------------------------
-- profiles: cada um só vê o próprio perfil; admin/diretor veem todos
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select results_eq(
  $$ select nome from public.profiles $$,
  $$ values ('Cliente Teste'::text) $$,
  'cliente só enxerga o próprio perfil'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is((select count(*) from public.profiles)::int, 4, 'admin enxerga os 4 perfis');
reset role;

-- ---------------------------------------------------------------------------
-- Guarda contra autopromoção: cliente não consegue virar admin
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select throws_ok(
  $$
    update public.profiles
    set role_id = (select id from public.roles where nome = 'admin')
    where user_id = '44444444-4444-4444-4444-444444444444'
  $$,
  'P0001',
  'Apenas admin pode alterar função ou status ativo de um perfil.',
  'cliente não pode se autopromover a admin'
);
reset role;

select * from finish();
rollback;
