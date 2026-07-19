-- KMP Hub · Testes de permissão por função (RLS) de leads e lead_events.
-- Referência: seção 5 (matriz de permissões, módulo "Leads") e a decisão do
-- cliente em 20260711140000_leads_rls_consultores_compartilhado.sql — leads
-- são compartilhados entre todos os consultores (não só o "A (E)" original da
-- seção 5); operations/finance/partner/client continuam sem acesso algum.
--
-- Como rodar:
--   1) Sem instalar nada: cole no SQL Editor do painel Supabase (projeto de
--      dev) e rode. Tudo acontece dentro de um begin/rollback — nada fica
--      gravado no banco depois.
--   2) Com Supabase CLI + Docker: `supabase test db`.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

-- ---------------------------------------------------------------------------
-- Usuários de teste: admin, diretor, dois consultores e um sem acesso a leads
-- ---------------------------------------------------------------------------

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.leads@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Leads","role":"admin"}'),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'diretor.leads@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Diretor Leads","role":"director"}'),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.leads@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora A","role":"consultant"}'),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultorb.leads@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultor B","role":"consultant"}'),
  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'operacional.leads@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Operacional Leads","role":"operations"}');

-- ---------------------------------------------------------------------------
-- Consultora A cadastra um lead (consultor_id assume default auth.uid())
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000003', true);

with ins as (
  insert into public.leads (nome, pais, origem, servico_interesse)
  values ('Maria Teste', 'Brasil', 'Instagram', 'Subclass 500')
  returning id
)
select set_config('app.lead_id', id::text, true) from ins;

select is(
  (select consultor_id from public.leads where id = current_setting('app.lead_id', true)::uuid),
  'a1000000-0000-0000-0000-000000000003'::uuid,
  'lead criado fica com consultor_id = quem criou (default auth.uid())'
);

select is(
  (
    select count(*)::int from public.lead_events
    where lead_id = current_setting('app.lead_id', true)::uuid and tipo = 'criacao'
  ),
  1,
  'trigger gera evento de criação automaticamente'
);

reset role;

-- ---------------------------------------------------------------------------
-- leads: visibilidade por função — consultores compartilham todos os leads
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.leads where id = current_setting('app.lead_id', true)::uuid),
  1,
  'outro consultor também vê o lead da colega (visibilidade compartilhada)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::int from public.leads where id = current_setting('app.lead_id', true)::uuid),
  1,
  'admin enxerga o lead de qualquer consultor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.leads where id = current_setting('app.lead_id', true)::uuid),
  1,
  'diretor também enxerga o lead de qualquer consultor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000005', true);
select is(
  (select count(*)::int from public.leads)::int,
  0,
  'função operations não enxerga nenhum lead'
);
reset role;

-- ---------------------------------------------------------------------------
-- leads: consultor consegue editar lead de outro consultor
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000004', true);
select lives_ok(
  format(
    $$ update public.leads set status = 'perdido' where id = %L $$,
    current_setting('app.lead_id', true)
  ),
  'consultor B consegue atualizar o lead da consultora A sem erro'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select is(
  (select status from public.leads where id = current_setting('app.lead_id', true)::uuid),
  'perdido',
  'o update do consultor B teve efeito de verdade (visibilidade compartilhada)'
);
reset role;

-- ---------------------------------------------------------------------------
-- lead_events: consultora A muda o status de volta e gera mais um evento
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000003', true);
update public.leads
set status = 'contato_iniciado'
where id = current_setting('app.lead_id', true)::uuid;

select is(
  (
    select count(*)::int from public.lead_events
    where lead_id = current_setting('app.lead_id', true)::uuid and tipo = 'mudanca_status'
  ),
  2,
  'cada mudança de status (consultor B e depois consultora A) gera um evento automático'
);
reset role;

-- ---------------------------------------------------------------------------
-- lead_events: consultor B registra um contato manual no lead da colega
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000004', true);
select lives_ok(
  format(
    $$ insert into public.lead_events (lead_id, tipo, descricao) values (%L, 'contato', 'contato registrado por outro consultor') $$,
    current_setting('app.lead_id', true)
  ),
  'consultor B consegue registrar contato manual no lead da colega'
);
reset role;

select is(
  (
    select count(*)::int from public.lead_events
    where lead_id = current_setting('app.lead_id', true)::uuid and tipo = 'contato'
  ),
  1,
  'o evento de contato manual foi de fato gravado'
);

select * from finish();
rollback;
