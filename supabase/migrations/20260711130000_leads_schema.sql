-- KMP Hub · Sprint 2 · Leads (seção 4 do plano, fluxo comercial da seção 3)
-- Tabelas: leads, lead_events.
-- RLS é ativado na migração seguinte (20260711131000_leads_rls.sql).

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
--
-- status: o plano não enumera as 10 etapas do pipeline de leads (só cita as
-- "9 etapas" do CRM antigo, seção 0, e separadamente "10 status" dos itens de
-- checklist, seção 4 — conceito diferente). A lista abaixo é uma proposta
-- cobrindo do primeiro contato até o fechamento (ganho ou perdido); é só um
-- CHECK CONSTRAINT, então renomear/reordenar depois é uma migração pequena,
-- sem risco para os dados.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  rede_social text,
  pais text,
  cidade text,
  origem text,
  servico_interesse text,
  consultor_id uuid not null references auth.users (id) default auth.uid(),
  status text not null default 'novo' check (
    status in (
      'novo',
      'contato_iniciado',
      'qualificacao',
      'consulta_agendada',
      'consulta_realizada',
      'proposta_enviada',
      'negociacao',
      'aguardando_decisao',
      'convertido',
      'perdido'
    )
  ),
  ultimo_contato timestamptz,
  proxima_acao text,
  proxima_acao_data date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.leads is
  'Leads do funil comercial (seção 3 do plano). servico_interesse é texto livre até a tabela service_types existir (Sprint 4), quando ganha FK. consultor_id segue o mesmo padrão de client_access.partner_id do Sprint 1: referencia auth.users diretamente.';

comment on column public.leads.status is
  'Pipeline de 10 etapas — lista provisória (ver comentário da tabela). Ajustar o CHECK e os rótulos em lib/leads/constants.ts se a KMP usar outros nomes.';

create index leads_consultor_id_idx on public.leads (consultor_id);
create index leads_status_idx on public.leads (status);
create index leads_created_at_idx on public.leads (created_at);

create trigger set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lead_events (histórico automático, seção 4 do plano)
-- ---------------------------------------------------------------------------

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  tipo text not null check (
    tipo in ('criacao', 'mudanca_status', 'atribuicao', 'contato', 'observacao')
  ),
  descricao text not null,
  autor uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.lead_events is
  'Histórico append-only de um lead. Linhas de criacao/mudanca_status/atribuicao vêm do trigger log_lead_event; contato/observacao vêm de ações do usuário (ex.: "Registrar contato"). Sem updated_at e sem política de update/delete — igual ao espírito de audit_logs (seção 4).';

create index lead_events_lead_id_idx on public.lead_events (lead_id);

-- ---------------------------------------------------------------------------
-- Histórico automático: criação, mudança de status, reatribuição de consultor
-- ---------------------------------------------------------------------------

create or replace function public.log_lead_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_events (lead_id, tipo, descricao, autor)
    values (new.id, 'criacao', 'Lead cadastrado', auth.uid());
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.lead_events (lead_id, tipo, descricao, autor)
      values (
        new.id,
        'mudanca_status',
        format('Status alterado de %s para %s', old.status, new.status),
        auth.uid()
      );
    end if;

    if new.consultor_id is distinct from old.consultor_id then
      insert into public.lead_events (lead_id, tipo, descricao, autor)
      values (new.id, 'atribuicao', 'Consultor responsável alterado', auth.uid());
    end if;

    return new;
  end if;

  return null;
end;
$$;

comment on function public.log_lead_event is
  'Gera o histórico automático em lead_events. SECURITY DEFINER para inserir independente das políticas de RLS de lead_events (mesmo padrão de handle_new_user no Sprint 1).';

create trigger log_lead_event
  after insert or update on public.leads
  for each row execute function public.log_lead_event();
