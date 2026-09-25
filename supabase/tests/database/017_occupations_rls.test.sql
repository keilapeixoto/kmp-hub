-- KMP Hub · Testes de permissão (RLS) da tabela occupations (docs/
-- superpowers/specs/2026-09-24-ocupacoes-design.md).
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Ocupações","role":"admin"}'),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Ocupações","role":"consultant"}'),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Ocupações","role":"client"}'),
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Ocupações","role":"partner"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

with ins as (
  insert into public.occupations
    (nome, codigo_anzsco, categoria, autoridade_avaliadora, nivel_habilidade, na_csol, na_mltssl_legada)
  values ('Ocupação Teste', '999901', 'Profissionais', 'VETASSESS', 1, true, true)
  returning id
)
select set_config('app.occupation_id', id::text, true) from ins;
reset role;

-- consultora lê a ocupação ativa, não edita
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  1,
  'consultora lê a ocupação ativa'
);

select lives_ok(
  format(
    $$ update public.occupations set nome = 'tentativa indevida' where id = %L $$,
    current_setting('app.occupation_id', true)
  ),
  'update da consultora não dá erro (RLS filtra a linha silenciosamente)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
select is(
  (select nome from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  'Ocupação Teste',
  'a ocupação não mudou — consultora não consegue editar'
);
reset role;

-- cliente lê a mesma ocupação ativa no portal (dado público de referência)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  1,
  'cliente lê a ocupação ativa no portal'
);
reset role;

-- parceiro não tem acesso a ocupações
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.occupations),
  0,
  'parceiro não vê nenhuma ocupação'
);
reset role;

-- arquivar: some para equipe e cliente, admin continua vendo
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
update public.occupations set status = 'arquivado' where id = current_setting('app.occupation_id', true)::uuid;
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  1,
  'admin continua vendo a ocupação arquivada'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  0,
  'ocupação arquivada não aparece para a equipe'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  0,
  'ocupação arquivada não aparece para o cliente'
);
reset role;

select * from finish();
rollback;
