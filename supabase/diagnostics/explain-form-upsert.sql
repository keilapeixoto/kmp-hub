-- KMP Hub · Diagnóstico (descartável): onde vai o tempo do upsert de
-- case_form_responses com a sessão de um cliente. Colar inteiro no SQL
-- Editor. Roda em begin/rollback: o usuário, o acesso, o formulário e as
-- respostas de teste somem no final. Usa só um processo demo (is_demo) e
-- mostra só tempos e nomes de políticas/triggers, nenhum dado de cliente.

begin;

create function pg_temp.diag() returns setof text
language plpgsql as $diag$
declare
  v_user uuid := 'd1a90000-0000-0000-0000-000000000001';
  v_tpl uuid;
  v_case uuid;
  v_client uuid;
  v_form uuid;
  v_sql text;
  l text;
  m text[];
begin
  -- Estrutura que pode diferir do repositório
  return query
    select 'politicas ' || tablename || ': ' || count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('case_form_responses', 'case_forms', 'cases', 'client_access', 'profiles', 'roles')
    group by tablename order by tablename;
  return query
    select 'trigger case_form_responses: ' || tgname || ' -> ' || tgfoid::regproc::text
    from pg_trigger where tgrelid = 'public.case_form_responses'::regclass and not tgisinternal;
  return query
    select 'politicas fora do padrao: ' || count(*)
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))'
        or coalesce(with_check, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))');
  return query
    select 'auth.uid: ' || lg.lanname || ' ' || p.provolatile::text
    from pg_proc p join pg_language lg on lg.oid = p.prolang
    where p.oid = 'auth.uid'::regproc;
  return query
    select 'statement_timeout authenticated: ' || coalesce(
      (select string_agg(c, ',') from pg_db_role_setting s, unnest(s.setconfig) c
       where s.setrole = 'authenticated'::regrole), '(padrao)');

  -- Montagem: cliente temporário com acesso a um processo demo
  select id into v_tpl from public.case_form_templates
  where nome = 'Formulário Visto de Turista (Subclass 600) — Coleta de Dados';
  select id, client_id into v_case, v_client from public.cases where is_demo limit 1;
  if v_case is null then
    return next 'sem processo demo — rode scripts/seed-demo.mjs';
    return;
  end if;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'diag.rls@kmp.test', '', now(), '{"nome":"Diag RLS","role":"client"}');
  insert into public.client_access (client_id, client_user_id) values (v_client, v_user);
  select id into v_form from public.case_forms where case_id = v_case and template_id = v_tpl;
  if v_form is null then
    insert into public.case_forms (case_id, template_id, status)
    values (v_case, v_tpl, 'em_preenchimento') returning id into v_form;
  end if;

  v_sql := format($q$
    insert into public.case_form_responses (case_form_id, field_id, valor)
    select %L::uuid, f.id, 'diag ' || f.ordem
    from public.case_form_fields f
    join public.case_form_steps s on s.id = f.step_id
    where s.template_id = %L::uuid and f.tipo = 'text'
    order by s.ordem, f.ordem limit 8
    on conflict (case_form_id, field_id) do update set valor = excluded.valor
    returning id $q$, v_form, v_tpl);

  -- Mesmo upsert como dono das tabelas (sem RLS), para comparar
  for l in execute 'explain (analyze) ' || v_sql loop
    if l ~ 'Time:' then return next 'sem RLS | ' || l; end if;
  end loop;

  -- Agora como o cliente
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'set local statement_timeout = 0';

  for l in execute 'explain (analyze, buffers) ' || v_sql loop
    -- Só as linhas que importam: tempos totais, triggers e nós caros (> 50 ms)
    m := regexp_match(l, 'actual time=[0-9.]+\.\.([0-9.]+) rows=[0-9]+ loops=([0-9]+)');
    if l ~ 'Time:|Trigger'
       or (m is not null and m[1]::numeric * m[2]::numeric > 50) then
      return next 'cliente | ' || l;
    end if;
  end loop;
end;
$diag$;

select * from pg_temp.diag();

rollback;
