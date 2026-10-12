-- KMP Hub · Testes de permissão (RLS) da tabela immigration_news (tela
-- "Início" / portal de entrada).
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
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.news@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin News","role":"admin"}'),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.news@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora News","role":"consultant"}'),
  ('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.news@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente News","role":"client"}'),
  ('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.news@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro News","role":"partner"}');

-- admin publica uma novidade
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
with ins as (
  insert into public.immigration_news (titulo, link, fonte)
  values ('Novo teste de inglês aceito para visto 189', 'https://example.com', 'Home Affairs')
  returning id
)
select set_config('app.news_id', id::text, true) from ins;
reset role;

-- consultora lê, mas não consegue editar nem publicar
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.immigration_news where id = current_setting('app.news_id', true)::uuid),
  1,
  'consultora lê a novidade publicada'
);

select lives_ok(
  format(
    $$ update public.immigration_news set titulo = 'tentativa indevida' where id = %L $$,
    current_setting('app.news_id', true)
  ),
  'update da consultora não dá erro (RLS filtra a linha silenciosamente)'
);

select throws_ok(
  $$ insert into public.immigration_news (titulo) values ('tentativa indevida') $$,
  '42501'
);
reset role;

-- título não mudou (consultora não editou de fato)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select is(
  (select titulo from public.immigration_news where id = current_setting('app.news_id', true)::uuid),
  'Novo teste de inglês aceito para visto 189',
  'título não mudou — consultora não conseguiu editar'
);
reset role;

-- cliente (portal) não vê novidades internas
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.immigration_news),
  0,
  'cliente não vê nenhuma novidade'
);
reset role;

-- parceiro não tem acesso
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.immigration_news),
  0,
  'parceiro não vê nenhuma novidade'
);
reset role;

-- admin consegue excluir
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
delete from public.immigration_news where id = current_setting('app.news_id', true)::uuid;
select is(
  (select count(*)::int from public.immigration_news where id = current_setting('app.news_id', true)::uuid),
  0,
  'admin consegue excluir a novidade'
);
reset role;

select * from finish();
rollback;
