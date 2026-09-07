-- KMP Hub · Testes de permissão por função (RLS) de whatsapp_conversations,
-- whatsapp_messages e whatsapp_templates (docs/spec-whatsapp.md).
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

-- ---------------------------------------------------------------------------
-- Usuários de teste
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.whatsapp@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin WhatsApp","role":"admin"}'),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.whatsapp@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor WhatsApp","role":"director"}'),
  ('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.whatsapp@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora WhatsApp","role":"consultant"}'),
  ('e1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.whatsapp.outra@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Outra Consultora","role":"consultant"}'),
  ('e1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.whatsapp@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional WhatsApp","role":"operations"}'),
  ('e1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.whatsapp@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro WhatsApp","role":"partner"}'),
  ('e1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.whatsapp@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente WhatsApp","role":"client"}');

-- ---------------------------------------------------------------------------
-- Consultora A cria uma conversa + uma mensagem
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);

with conv as (
  insert into public.whatsapp_conversations (telefone, nome_contato)
  values ('+61 400 000 000', 'Contato Teste WhatsApp')
  returning id
)
select set_config('app.conversation_id', id::text, true) from conv;

insert into public.whatsapp_messages (conversation_id, direcao, conteudo)
values (current_setting('app.conversation_id', true)::uuid, 'recebida', 'Oi, bom dia!');

select is(
  (select count(*)::int from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  1,
  'consultora enxerga a conversa que ela mesma criou'
);
reset role;

-- ---------------------------------------------------------------------------
-- whatsapp_conversations: Kanban compartilhado entre consultores
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  1,
  'outra consultora também vê a conversa (Kanban compartilhado, igual leads)'
);

update public.whatsapp_conversations
set etapa = 'agendamento'
where id = current_setting('app.conversation_id', true)::uuid;

select is(
  (select etapa from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  'agendamento',
  'outra consultora consegue arrastar a conversa para outra etapa'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  0,
  'operacional não vê conversas de WhatsApp (ferramenta comercial da equipe de consultoria)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000006', true);
select is(
  (select count(*)::int from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  0,
  'parceiro nunca vê conversas de WhatsApp'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000007', true);
select is(
  (select count(*)::int from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  0,
  'cliente do portal nunca vê conversas de WhatsApp'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.whatsapp_conversations where id = current_setting('app.conversation_id', true)::uuid),
  1,
  'admin vê qualquer conversa'
);
reset role;

-- ---------------------------------------------------------------------------
-- whatsapp_messages: mesma visibilidade
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.whatsapp_messages where conversation_id = current_setting('app.conversation_id', true)::uuid),
  1,
  'outra consultora vê as mensagens da conversa compartilhada'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.whatsapp_messages where conversation_id = current_setting('app.conversation_id', true)::uuid),
  0,
  'operacional não vê mensagens de WhatsApp'
);
reset role;

-- ---------------------------------------------------------------------------
-- whatsapp_templates: admin gerencia, equipe só lê
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
insert into public.whatsapp_templates (nome, tipo, conteudo)
values ('Template Teste', 'texto', 'Olá {{nome_cliente}}');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.whatsapp_templates where nome = 'Template Teste'),
  1,
  'consultora lê os templates de WhatsApp'
);

select throws_ok(
  $$ insert into public.whatsapp_templates (nome, tipo, conteudo) values ('Sem permissão', 'texto', 'x') $$,
  '42501',
  null,
  'consultora não consegue criar template de WhatsApp (só admin)'
);
reset role;

select * from finish();
rollback;
