-- KMP Hub · Sprint 3 · Criar dependente em uma transação
--
-- O dependente é um cliente completo (seção 4: "cada pessoa tem cadastro
-- próprio"). Criar o registro em clients e o vínculo em client_relations em
-- duas chamadas separadas do Server Action deixaria uma janela onde o
-- primeiro insert vinga e o segundo falha (RLS, rede etc.), sobrando um
-- cliente órfão sem relação. Esta função faz as duas coisas em uma única
-- transação, com SECURITY INVOKER — roda com o RLS de quem chama, sem
-- bypass de permissão.

create or replace function public.add_client_dependent(
  p_client_id uuid,
  p_nome text,
  p_tipo text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_dependent_id uuid;
begin
  insert into public.clients (nome) values (p_nome) returning id into v_dependent_id;

  insert into public.client_relations (client_id, related_client_id, tipo)
  values (p_client_id, v_dependent_id, p_tipo);

  return v_dependent_id;
end;
$$;

comment on function public.add_client_dependent is
  'Cria o cliente-dependente e o vínculo em client_relations numa única transação. p_tipo deve ser um dos valores aceitos pelo CHECK de client_relations (conjuge, filho, pai_mae, outro).';
