-- KMP Hub · Sprint 3 · Conversão transacional de lead em cliente (seção 3 do plano)
--
-- Escopo desta função no Sprint 3: só cria o registro em clients e marca o
-- lead como 'convertido'. O fluxo completo do plano (serviço contratado,
-- processo, pasta de documentos, checklist a partir do template, tarefas
-- iniciais, registro financeiro, convite para o portal) entra conforme cada
-- peça for construída — processos no Sprint 4, checklists no Sprint 5,
-- tarefas no Sprint 6, financeiro na Fase 3, convite do portal na Fase 2.
--
-- SECURITY INVOKER (padrão): a função roda com o RLS de quem chama. Isso
-- garante que só quem já pode ler o lead e criar um client legitimamente
-- consegue convertê-lo — nenhum bypass de permissão embutido aqui.
-- Sendo uma única function PL/pgSQL, a operação é atômica: se qualquer parte
-- falhar, nada é gravado (não precisa de BEGIN/COMMIT manual).

create or replace function public.convert_lead_to_client(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.leads;
  v_client_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id;

  if v_lead.id is null then
    raise exception 'Lead não encontrado ou sem permissão de acesso.';
  end if;

  if v_lead.status = 'convertido' then
    raise exception 'Este lead já foi convertido em cliente.';
  end if;

  insert into public.clients (
    nome, telefone, email, rede_social, pais, cidade, consultor_id, lead_id
  ) values (
    v_lead.nome, v_lead.telefone, v_lead.email, v_lead.rede_social,
    v_lead.pais, v_lead.cidade, v_lead.consultor_id, v_lead.id
  )
  returning id into v_client_id;

  update public.leads set status = 'convertido' where id = p_lead_id;

  return v_client_id;
end;
$$;

comment on function public.convert_lead_to_client is
  'Cria o cliente a partir de um lead e marca o lead como convertido, em uma única transação (seção 3 do plano). Escopo do Sprint 3: só o registro de clients — processo/checklist/tarefas/financeiro/convite do portal chegam nos sprints seguintes.';
