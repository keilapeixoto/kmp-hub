-- KMP Hub · Testes de permissão (RLS) de guides, guide_versions,
-- message_templates e audit_logs + versionamento automático de guias.
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
select plan(11);

create extension if not exists pgtap with schema extensions;

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.guias@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Guias","role":"admin"}'),
  ('f1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.guias@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Guias","role":"consultant"}'),
  ('f1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.guias@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Guias","role":"partner"}');

-- ---------------------------------------------------------------------------
-- guides: admin cria e edita (versionamento automático)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);

with ins as (
  insert into public.guides (titulo, conteudo)
  values ('Procedimento 485', 'Versão inicial do procedimento.')
  returning id
)
select set_config('app.guide_id', id::text, true) from ins;

update public.guides
set conteudo = 'Procedimento revisado com novos passos.'
where id = current_setting('app.guide_id', true)::uuid;

select is(
  (select versao from public.guides where id = current_setting('app.guide_id', true)::uuid),
  2,
  'editar o conteúdo incrementa a versão do guia'
);

select is(
  (
    select conteudo from public.guide_versions
    where guide_id = current_setting('app.guide_id', true)::uuid and versao = 1
  ),
  'Versão inicial do procedimento.',
  'a versão anterior fica arquivada em guide_versions'
);
reset role;

-- consultora lê guia ativo, não edita
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.guides where id = current_setting('app.guide_id', true)::uuid),
  1,
  'consultora lê o guia ativo'
);

select lives_ok(
  format(
    $$ update public.guides set conteudo = 'tentativa indevida' where id = %L $$,
    current_setting('app.guide_id', true)
  ),
  'update da consultora não dá erro (RLS filtra a linha silenciosamente)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);
select is(
  (select versao from public.guides where id = current_setting('app.guide_id', true)::uuid),
  2,
  'o guia não mudou — consultora não consegue editar'
);

-- guia arquivado some para a equipe
update public.guides
set status = 'arquivado'
where id = current_setting('app.guide_id', true)::uuid;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.guides where id = current_setting('app.guide_id', true)::uuid),
  0,
  'guia arquivado não aparece para a equipe (só admin)'
);
reset role;

-- parceiro não vê guia nenhum
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.guides),
  0::int,
  'parceiro não vê nenhum guia'
);
reset role;

-- ---------------------------------------------------------------------------
-- message_templates
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);
insert into public.message_templates (nome, canal, idioma, corpo)
values ('Boas-vindas', 'email', 'pt', 'Olá {{nome_cliente}}, bem-vindo(a) à KMP!');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.message_templates where nome = 'Boas-vindas'),
  1,
  'consultora lê templates de mensagem'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.message_templates),
  0::int,
  'parceiro não vê templates'
);
reset role;

-- ---------------------------------------------------------------------------
-- audit_logs: mutações geram log; só admin lê
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);
select ok(
  (
    select count(*) >= 2 from public.audit_logs
    where tabela = 'guides' and registro_id = current_setting('app.guide_id', true)::uuid
  ),
  'as mutações no guia geraram registros de auditoria'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.audit_logs),
  0,
  'consultora não lê a auditoria (só admin)'
);
reset role;

select * from finish();
rollback;
