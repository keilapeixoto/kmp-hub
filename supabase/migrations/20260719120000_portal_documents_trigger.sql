-- KMP Hub · Portal do cliente (Fase 2 antecipada) · Sincronização automática
--
-- Quando um documento chega vinculado a um checklist_item (seja pelo cliente,
-- via portal, seja pela equipe), o item avança de status sozinho — o cliente
-- não tem (e não deve ter, por RLS) permissão de UPDATE em checklist_items,
-- então essa transição só pode acontecer via trigger, executado com o
-- privilégio do dono da função (security definer), igual ao padrão já usado
-- em audit() e set_updated_at().
--
-- Regra: só avança quem está "esperando o cliente" (nao_solicitado,
-- solicitado, aguardando_cliente → enviado; rejeitado, reenvio_solicitado →
-- reenviado). Itens já em análise/aprovados não regridem com um reenvio
-- acidental duplicado.

-- A policy de INSERT em documents confere apenas se client_id é do próprio
-- cliente — não confere se checklist_item_id realmente pertence ao mesmo
-- case_id/cliente. Sem essa validação, um cliente poderia enviar um
-- documento com o próprio client_id/case_id mas apontando checklist_item_id
-- de OUTRO cliente, contaminando o checklist alheio (o trigger de
-- sincronização abaixo herdaria esse mesmo problema). Bloqueado aqui antes
-- do insert, para admin/staff e portal igualmente.

create or replace function public.validate_document_checklist_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_case_client_id uuid;
begin
  if new.case_id is not null then
    select client_id into v_case_client_id
    from public.cases
    where id = new.case_id;

    if v_case_client_id is null or v_case_client_id is distinct from new.client_id then
      raise exception 'case_id informado não pertence ao client_id informado.';
    end if;
  end if;

  if new.checklist_item_id is null then
    return new;
  end if;

  select cl.case_id into v_case_id
  from public.checklist_items ci
  join public.checklists cl on cl.id = ci.checklist_id
  where ci.id = new.checklist_item_id;

  if v_case_id is null or v_case_id is distinct from new.case_id then
    raise exception 'checklist_item_id não pertence ao case_id informado.';
  end if;

  return new;
end;
$$;

create trigger validate_document_checklist_item
  before insert or update on public.documents
  for each row execute function public.validate_document_checklist_item();

create or replace function public.sync_checklist_item_on_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.checklist_item_id is null then
    return new;
  end if;

  update public.checklist_items
  set status = case
    when status in ('nao_solicitado', 'solicitado', 'aguardando_cliente') then 'enviado'
    when status in ('rejeitado', 'reenvio_solicitado') then 'reenviado'
    else status
  end
  where id = new.checklist_item_id;

  return new;
end;
$$;

create trigger sync_checklist_item_on_document
  after insert on public.documents
  for each row execute function public.sync_checklist_item_on_document();
