-- KMP Hub · E-mail: anexos de template e assinatura. Cobre:
-- 20261016160000_email_templates.sql.
--
-- Anexos fixos de template: só admin cadastra (tabela e bucket privado
-- email-anexos); equipe lê para enviar; cliente nunca vê. Assinatura: cada um
-- edita a própria (colunas novas em profiles, políticas já existentes).
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

create table public._test_results_scratch (n int generated always as identity, resultado text);
grant insert, select on public._test_results_scratch to authenticated;

select plan(7);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c8000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.email@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Email","role":"admin"}'),
  ('c8000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultor.email@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor Email","role":"consultant"}'),
  ('c8000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.email@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Email","role":"client"}');

insert into public.message_templates (id, nome, corpo)
values ('c8000000-0000-0000-0000-0000000000a1', 'Template Email Teste', 'Olá {{primeiro_nome}}');
insert into storage.objects (bucket_id, name)
values ('email-anexos', 'c8000000-0000-0000-0000-0000000000a1/teste.pdf');

set local role authenticated;

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000001', true);
insert into public._test_results_scratch (resultado) select lives_ok(
  $$ insert into public.message_template_attachments (template_id, nome, storage_path)
     values ('c8000000-0000-0000-0000-0000000000a1', 'Contrato.pdf', 'c8000000-0000-0000-0000-0000000000a1/teste.pdf') $$,
  'admin cadastra anexo de template');

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000002', true);
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into public.message_template_attachments (template_id, nome, storage_path)
     values ('c8000000-0000-0000-0000-0000000000a1', 'x', 'c8000000-0000-0000-0000-0000000000a1/x.pdf') $$,
  '42501', null, 'consultor não cadastra anexo de template');
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.message_template_attachments), 1, 'consultor lê os anexos para enviar');
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from storage.objects where bucket_id = 'email-anexos'), 1, 'consultor lê o arquivo no bucket');
insert into public._test_results_scratch (resultado) select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('email-anexos', 'qualquer/coisa.pdf') $$,
  '42501', null, 'consultor não grava no bucket de anexos');
update public.profiles set assinatura_fecho = 'Abraços' where user_id = 'c8000000-0000-0000-0000-000000000002';

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000003', true);
insert into public._test_results_scratch (resultado) select is(
  (select count(*)::int from public.message_template_attachments)
    + (select count(*)::int from storage.objects where bucket_id = 'email-anexos'),
  0, 'cliente não vê anexos de template (tabela nem bucket)');

reset role;
insert into public._test_results_scratch (resultado) select is(
  (select assinatura_fecho from public.profiles where user_id = 'c8000000-0000-0000-0000-000000000002'),
  'Abraços', 'cada um edita a própria assinatura');

insert into public._test_results_scratch (resultado) select * from finish();

select resultado from public._test_results_scratch order by n;
rollback;
