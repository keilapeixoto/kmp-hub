-- KMP Hub · Diagnóstico (descartável): tempo de cada consulta do Dashboard e
-- do Início, por função. Colar inteiro no SQL Editor. Só leitura, dentro de
-- begin/rollback. Usa usuários reais da equipe (um por função, o consultor
-- com mais processos) só para simular a sessão — não grava nada e mostra
-- apenas nome da consulta, função e tempos em ms (planejamento / execução).

begin;

create function pg_temp.diag_dashboard() returns table (funcao text, consulta text, planejamento_ms numeric, execucao_ms numeric)
language plpgsql as $diag$
declare
  v_funcao text;
  v_user uuid;
  v_nome text;
  v_sql text;
  l text;
  v_plan numeric;
  v_exec numeric;
  v_hoje text := to_char(now(), 'YYYY-MM-DD');
  v_30d text := to_char(now() - interval '30 days', 'YYYY-MM-DD');
  v_14d text := to_char(now() - interval '14 days', 'YYYY-MM-DD');
  consultas text[][] := array[
    ['leads 30d', format('select count(*) from public.leads where created_at >= %L', v_30d)],
    ['leads total', 'select count(*) from public.leads'],
    ['leads convertidos', $q$select count(*) from public.leads where status = 'convertido'$q$],
    ['clients', 'select count(*) from public.clients'],
    ['cases ativos', $q$select count(*) from public.cases where status = 'ativo'$q$],
    ['cases parados', format($q$select count(*) from public.cases where status = 'ativo' and updated_at < %L$q$, v_14d)],
    ['tarefas vencidas', format($q$select count(*) from public.tasks where status in ('pendente','em_andamento') and prazo < %L$q$, v_hoje)],
    ['checklist pendentes', $q$select count(*) from public.checklist_items where status in ('solicitado','aguardando_cliente','enviado','em_analise','rejeitado','reenvio_solicitado','reenviado','aguardando_aprovacao')$q$],
    ['agenda hoje', format($q$select * from public.appointments where inicio >= %L and inicio < %L::date + 1 order by inicio$q$, v_hoje, v_hoje)],
    ['cases por etapa', $q$select etapa_id from public.cases where status = 'ativo' and etapa_id is not null$q$],
    ['case_stages', 'select id, nome from public.case_stages'],
    ['carga tarefas', $q$select responsavel from public.tasks where status in ('pendente','em_andamento')$q$],
    ['equipe (rpc)', 'select * from public.list_staff_members()'],
    ['fila processos', $q$select status, prioridade, prazo from public.cases where status in ('ativo','pausado')$q$],
    ['formularios (Inicio)', $q$select c.id, st.case_form_template_id, (select json_agg(cf.status) from public.case_forms cf where cf.case_id = c.id)
                               from public.cases c left join public.service_types st on st.id = c.service_type_id where c.status = 'ativo'$q$],
    ['novidades', 'select * from public.immigration_news order by publicado_em desc limit 6'],
    ['perfil', 'select * from public.profiles where user_id = auth.uid()']
  ];
  i int;
begin
  foreach v_funcao in array array['sem RLS', 'admin', 'consultant', 'operations'] loop
    v_user := null;
    if v_funcao <> 'sem RLS' then
      select p.user_id into v_user
      from public.profiles p join public.roles r on r.id = p.role_id
      where r.nome = v_funcao and p.ativo
      order by (select count(*) from public.cases c where c.consultor_id = p.user_id or p.user_id = any(c.equipe)) desc
      limit 1;
      if v_user is null then
        funcao := v_funcao; consulta := '(ninguém com essa função)'; planejamento_ms := null; execucao_ms := null;
        return next;
        continue;
      end if;
    end if;

    for i in 1 .. array_length(consultas, 1) loop
      v_nome := consultas[i][1];
      v_sql := consultas[i][2];
      v_plan := null; v_exec := null;
      if v_user is not null then
        perform set_config('request.jwt.claim.sub', v_user::text, true);
        perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
      end if;
      begin
        for l in execute 'explain (analyze, summary) ' || v_sql loop
          if l like 'Planning Time:%' then v_plan := substring(l from '[0-9.]+')::numeric; end if;
          if l like 'Execution Time:%' then v_exec := substring(l from '[0-9.]+')::numeric; end if;
        end loop;
      exception when others then
        v_nome := v_nome || ' (erro ' || sqlstate || ')';
      end;
      execute 'reset role';
      funcao := v_funcao; consulta := v_nome;
      planejamento_ms := round(v_plan, 1); execucao_ms := round(v_exec, 1);
      return next;
    end loop;
  end loop;
end;
$diag$;

select * from pg_temp.diag_dashboard();

rollback;
