-- KMP Hub · Desempenho das políticas de RLS (out/2026).
--
-- Problema medido: gravar em case_form_responses com a sessão do cliente
-- levava ~4–7 s por linha e às vezes estourava o tempo do banco (57014); com
-- a secret key, o mesmo upsert levava ~150 ms. A equipe também já tinha
-- batido no 57014 editando respostas.
--
-- Causa: as políticas chamam public.get_user_role() e auth.uid() direto na
-- expressão, então o Postgres reavalia as duas para cada linha examinada —
-- e get_user_role() é uma consulta (profiles + roles). Pior: as políticas de
-- case_form_responses têm EXISTS em case_forms/cases/client_access, e o RLS
-- dessas tabelas também roda dentro do EXISTS, multiplicando as chamadas.
--
-- Correção (padrão recomendado pelo Supabase): envolver as chamadas num
-- sub-select — (select public.get_user_role()) / (select auth.uid()). O
-- Postgres passa a calcular cada uma UMA vez por comando (initPlan) e
-- reaproveita o valor em todas as linhas, inclusive dentro dos EXISTS.
--
-- Mesma permissão, exatamente: as duas funções são STABLE (mesmo valor
-- durante todo o comando), então trocar "f()" por "(select f())" não muda o
-- resultado de nenhuma política. Nada é recriado do zero: cada política
-- existente é lida do catálogo (pg_policy) e só recebe ALTER POLICY com o
-- mesmo texto, trocando apenas essas duas chamadas. Nome, comando (select/
-- insert/...), funções (roles) e o tipo permissivo continuam iguais.
-- Políticas criadas nesta migração em diante devem já nascer com o padrão
-- (ver docs/architecture/08-security-guide.md); o teste
-- 022_rls_initplan.test.sql acusa qualquer uma que escapar.
--
-- Pode rodar mais de uma vez: o que já está envolvido não é envolvido de
-- novo (a troca ignora chamadas que já vêm depois de "SELECT ").

do $$
declare
  p record;
  v_padrao constant text :=
    '(?<!SELECT )((?:public\.)?get_user_role\(\)|auth\.uid\(\))';
  v_using text;
  v_check text;
  v_sql text;
  v_alteradas int := 0;
  v_falhas int := 0;
begin
  -- Com search_path = public, o catálogo devolve "get_user_role()" sem
  -- schema e "auth.uid()" com schema — o mesmo search_path é usado para ler
  -- o texto de volta no ALTER POLICY, então os nomes resolvem igual.
  perform set_config('search_path', 'public', true);

  for p in
    select
      pol.polname,
      n.nspname,
      c.relname,
      pg_get_expr(pol.polqual, pol.polrelid) as qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'storage')
    order by n.nspname, c.relname, pol.polname
  loop
    v_using := regexp_replace(p.qual, v_padrao, '( SELECT \1)', 'g');
    v_check := regexp_replace(p.with_check, v_padrao, '( SELECT \1)', 'g');

    if v_using is not distinct from p.qual
       and v_check is not distinct from p.with_check then
      continue;
    end if;

    v_sql := format('alter policy %I on %I.%I', p.polname, p.nspname, p.relname);
    if p.qual is not null then
      v_sql := v_sql || format(' using (%s)', v_using);
    end if;
    if p.with_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;

    begin
      execute v_sql;
      v_alteradas := v_alteradas + 1;
    exception when insufficient_privilege then
      -- storage.objects pertence a supabase_storage_admin em alguns
      -- projetos; se o SQL Editor não puder alterar, a política fica como
      -- está (continua correta, só sem o ganho) e aparece na verificação.
      v_falhas := v_falhas + 1;
      raise warning 'Sem permissão para alterar %.%: %', p.nspname, p.relname, p.polname;
    end;
  end loop;

  raise notice 'Políticas alteradas: %, sem permissão: %', v_alteradas, v_falhas;
end $$;

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
-- As colunas de junção usadas pelas políticas já têm índice simples desde
-- as migrações de origem (client_access.client_id/partner_id/client_user_id,
-- case_forms.case_id, cases.client_id/consultor_id, gin em cases.equipe).
-- O que faltava são índices compostos para o EXISTS mais repetido do portal
-- ("existe acesso deste usuário a este cliente?"), que passa a ser
-- respondido só pelo índice, sem ler a tabela.

create index if not exists client_access_client_user_id_client_id_idx
  on public.client_access (client_user_id, client_id);

create index if not exists client_access_partner_id_client_id_idx
  on public.client_access (partner_id, client_id);

-- ---------------------------------------------------------------------------
-- Verificação (é o resultado que o SQL Editor mostra): uma linha por schema,
-- com "fora_do_padrao" = 0. Um resultado vazio quer dizer que esta parte não
-- rodou — rode o arquivo inteiro de novo, sem nada selecionado.
-- ---------------------------------------------------------------------------

select
  schemaname,
  count(*) filter (where coalesce(qual, '') || coalesce(with_check, '') ~ '\( SELECT ') as no_padrao,
  count(*) filter (where
    coalesce(qual, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))'
    or coalesce(with_check, '') ~ '(?<!SELECT )((public\.)?get_user_role\(\)|auth\.uid\(\))'
  ) as fora_do_padrao
from pg_policies
where schemaname in ('public', 'storage')
group by schemaname
order by schemaname;
