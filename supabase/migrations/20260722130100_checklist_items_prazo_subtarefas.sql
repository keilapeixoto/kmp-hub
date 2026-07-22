-- KMP Hub · Personalização de pipelines (Parte 2/2) · prazo e subtarefas em
-- checklist_items.
--
-- prazo: data-limite editável pela equipe por item (não existia — só havia
-- validade_dias no TEMPLATE, informativo, sem data concreta por processo).
--
-- parent_item_id: permite subtarefas dentro de um item (ex.: "Aplicação
-- preparada" → subtarefas "Formulário revisado", "Taxas calculadas"). O
-- trigger de percentual passa a contar só itens de topo (parent_item_id is
-- null) — subtarefa é organização interna do item pai, não conta em dobro
-- no percentual do checklist.

alter table public.checklist_items
  add column prazo date,
  add column parent_item_id uuid references public.checklist_items (id) on delete cascade;

comment on column public.checklist_items.prazo is
  'Data-limite do item, definida pela equipe (controle de pipelines/checklists) — diferente de checklist_template_items.validade_dias, que é só informativo no template.';
comment on column public.checklist_items.parent_item_id is
  'Subtarefa de outro checklist_item. Null = item de topo (conta no percentual do checklist).';

create index checklist_items_parent_item_id_idx on public.checklist_items (parent_item_id);

create or replace function public.recalculate_checklist_percentual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checklist_id uuid;
  v_total int;
  v_aprovados int;
begin
  v_checklist_id := coalesce(new.checklist_id, old.checklist_id);

  select count(*), count(*) filter (where status = 'aprovado')
  into v_total, v_aprovados
  from public.checklist_items
  where checklist_id = v_checklist_id
    and parent_item_id is null;

  update public.checklists
  set percentual = case when v_total = 0 then 0 else round(100.0 * v_aprovados / v_total, 1) end
  where id = v_checklist_id;

  return coalesce(new, old);
end;
$$;

comment on function public.recalculate_checklist_percentual is
  'Mantém checklists.percentual em sincronia com checklist_items.status — só itens de topo (parent_item_id is null) contam, subtarefas não contam em dobro. SECURITY DEFINER para atualizar checklists independente das políticas de RLS de quem disparou a mudança.';
