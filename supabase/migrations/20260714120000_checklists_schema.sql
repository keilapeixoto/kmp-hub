-- KMP Hub · Sprint 5 · Checklists (seção 4 do plano). RLS na migração
-- seguinte (20260714121000_checklists_rls.sql).

-- ---------------------------------------------------------------------------
-- checklist_templates / checklist_template_items
-- ---------------------------------------------------------------------------

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references public.service_types (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checklist_templates is
  'Template de checklist por tipo de serviço (seção 4). Referenciado por service_types.checklist_template_id (FK adicionada nesta migração, pendente desde o Sprint 4).';

create index checklist_templates_service_type_id_idx on public.checklist_templates (service_type_id);

create trigger set_updated_at
  before update on public.checklist_templates
  for each row execute function public.set_updated_at();

alter table public.service_types
  add constraint service_types_checklist_template_id_fkey
  foreign key (checklist_template_id) references public.checklist_templates (id);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  checklist_template_id uuid not null references public.checklist_templates (id) on delete cascade,
  ordem integer not null,
  nome text not null,
  descricao text,
  exemplo text,
  formato text,
  validade_dias integer,
  obrigatorio boolean not null default true,
  condicional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_template_id, ordem)
);

comment on table public.checklist_template_items is
  'Itens de um template de checklist (seção 4). validade_dias é informativo (quantos dias o documento costuma valer, ex.: antecedente criminal); condicional marca itens que só se aplicam em certas situações — sem motor de condição automático nesta fase, é só um indicador visual.';

create index checklist_template_items_template_id_idx on public.checklist_template_items (checklist_template_id);

create trigger set_updated_at
  before update on public.checklist_template_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- checklists (instância por processo) e checklist_items
-- ---------------------------------------------------------------------------
--
-- status: o plano diz "não solicitado → aprovado, 10 status" sem listar os 8
-- do meio. Lista provisória cobrindo o fluxo da seção 3 (equipe libera,
-- cliente envia, equipe aprova/rejeita com motivo, cliente corrige): ver
-- comentário da coluna. Fácil de renomear depois (é só um CHECK).

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  checklist_template_id uuid not null references public.checklist_templates (id),
  percentual numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checklists is
  'Checklist de um processo, instanciado a partir de um checklist_template (seção 4). percentual é recalculado automaticamente pelo trigger recalculate_checklist_percentual sempre que um item muda de status — nunca editado manualmente.';

create index checklists_case_id_idx on public.checklists (case_id);

create trigger set_updated_at
  before update on public.checklists
  for each row execute function public.set_updated_at();

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  template_item_id uuid references public.checklist_template_items (id) on delete set null,
  nome text not null,
  descricao text,
  status text not null default 'nao_solicitado' check (
    status in (
      'nao_solicitado',
      'solicitado',
      'aguardando_cliente',
      'enviado',
      'em_analise',
      'rejeitado',
      'reenvio_solicitado',
      'reenviado',
      'aguardando_aprovacao',
      'aprovado'
    )
  ),
  responsavel uuid references auth.users (id),
  observacao_equipe text,
  observacao_cliente text,
  motivo_rejeicao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checklist_items is
  'Itens de um checklist instanciado. nome/descricao são copiados do template_item na criação (snapshot) — continuam existindo mesmo se o item do template for editado ou removido depois.';

create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id);
create index checklist_items_status_idx on public.checklist_items (status);

create trigger set_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Recalcula o percentual do checklist a cada mudança nos itens
-- ---------------------------------------------------------------------------

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
  where checklist_id = v_checklist_id;

  update public.checklists
  set percentual = case when v_total = 0 then 0 else round(100.0 * v_aprovados / v_total, 1) end
  where id = v_checklist_id;

  return coalesce(new, old);
end;
$$;

comment on function public.recalculate_checklist_percentual is
  'Mantém checklists.percentual em sincronia com checklist_items.status. SECURITY DEFINER para atualizar checklists independente das políticas de RLS de quem disparou a mudança.';

create trigger recalculate_checklist_percentual
  after insert or update or delete on public.checklist_items
  for each row execute function public.recalculate_checklist_percentual();

-- ---------------------------------------------------------------------------
-- Cria os checklist_items a partir do template ao instanciar um checklist
-- ---------------------------------------------------------------------------

create or replace function public.instantiate_checklist_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.checklist_items (checklist_id, template_item_id, nome, descricao)
  select new.id, cti.id, cti.nome, cti.descricao
  from public.checklist_template_items cti
  where cti.checklist_template_id = new.checklist_template_id
  order by cti.ordem;

  return new;
end;
$$;

comment on function public.instantiate_checklist_items is
  'Copia os itens do template para checklist_items assim que um checklist é criado. SECURITY DEFINER pelo mesmo motivo do trigger de percentual.';

create trigger instantiate_checklist_items
  after insert on public.checklists
  for each row execute function public.instantiate_checklist_items();
