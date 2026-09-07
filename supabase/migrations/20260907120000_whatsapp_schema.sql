-- KMP Hub · WhatsApp — Kanban de conversas por etapa + biblioteca de
-- templates de texto/áudio (docs/spec-whatsapp.md).
--
-- Primeira parte desta frente: schema + Kanban no Hub, com dados de
-- demonstração (scripts/seed-demo.mjs). A extensão de navegador que liga de
-- verdade com o WhatsApp Web da Keila (lendo/mandando mensagens de verdade)
-- é uma frente seguinte, que escreve nestas mesmas tabelas.
--
-- Mesma decisão de "Kanban compartilhado entre consultores" já tomada para
-- leads (20260711140000) — não é a matriz padrão da seção 5, é o jeito que a
-- Keila já usa o Hub hoje. Sem nenhuma política para operations/finance/
-- partner/client: conversas de WhatsApp são ferramenta comercial da equipe
-- de consultoria, nunca visível no portal do cliente.

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  case_id uuid references public.cases (id) on delete set null,
  telefone text not null,
  nome_contato text not null,
  etapa text not null default 'novo_contato' check (
    etapa in (
      'novo_contato',
      'aguardando_resposta_cliente',
      'aguardando_resposta_equipe',
      'pendencia_documento',
      'agendamento',
      'resolvido'
    )
  ),
  ultima_mensagem_em timestamptz,
  ultima_mensagem_preview text,
  nao_lida boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.whatsapp_conversations is
  'Uma conversa de WhatsApp por contato, organizada em Kanban por etapa (lib/whatsapp/constants.ts). Ferramenta interna da equipe comercial — nunca visível no portal do cliente.';

create index whatsapp_conversations_client_id_idx on public.whatsapp_conversations (client_id);
create index whatsapp_conversations_case_id_idx on public.whatsapp_conversations (case_id);
create index whatsapp_conversations_etapa_idx on public.whatsapp_conversations (etapa);

create trigger set_updated_at
  before update on public.whatsapp_conversations
  for each row execute function public.set_updated_at();

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  direcao text not null check (direcao in ('enviada', 'recebida')),
  tipo text not null default 'texto' check (tipo in ('texto', 'audio', 'imagem', 'documento', 'outro')),
  conteudo text,
  midia_storage_path text,
  enviado_por uuid references auth.users (id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_messages is
  'Histórico append-only de mensagens de uma conversa de WhatsApp — sem update/delete, igual audit_logs/lead_events.';

create index whatsapp_messages_conversation_id_idx on public.whatsapp_messages (conversation_id);

create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'texto' check (tipo in ('texto', 'audio')),
  conteudo text,
  audio_storage_path text,
  autor uuid references auth.users (id) default auth.uid(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.whatsapp_templates is
  'Mensagens e áudios prontos para reenviar no WhatsApp sem reescrever/regravar a mesma explicação toda vez.';

create trigger set_updated_at
  before update on public.whatsapp_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mesmo padrão de leads_manage_staff/leads_select_consultant (Kanban
-- compartilhado): admin/diretor gerenciam tudo; qualquer consultor lê/escreve
-- em qualquer conversa (sem exclusão); sem policy nenhuma para
-- operations/finance/partner/client.
-- ---------------------------------------------------------------------------

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_templates enable row level security;

create policy whatsapp_conversations_manage_staff on public.whatsapp_conversations
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy whatsapp_conversations_select_consultant on public.whatsapp_conversations
  for select
  using (public.get_user_role() = 'consultant');

create policy whatsapp_conversations_insert_consultant on public.whatsapp_conversations
  for insert
  with check (public.get_user_role() = 'consultant');

create policy whatsapp_conversations_update_consultant on public.whatsapp_conversations
  for update
  using (public.get_user_role() = 'consultant')
  with check (public.get_user_role() = 'consultant');

-- Sem policy de delete para consultant — exclusão só via admin/diretor,
-- coerente com o resto do Hub preferir não apagar histórico de conversa.

create policy whatsapp_messages_select_staff on public.whatsapp_messages
  for select
  using (public.get_user_role() in ('admin', 'director'));

create policy whatsapp_messages_select_consultant on public.whatsapp_messages
  for select
  using (public.get_user_role() = 'consultant');

create policy whatsapp_messages_insert_staff on public.whatsapp_messages
  for insert
  with check (public.get_user_role() in ('admin', 'director'));

create policy whatsapp_messages_insert_consultant on public.whatsapp_messages
  for insert
  with check (public.get_user_role() = 'consultant');

-- Templates (mesma matriz de message_templates, seção 5): Admin G · equipe R.

create policy whatsapp_templates_manage_admin on public.whatsapp_templates
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy whatsapp_templates_select_staff on public.whatsapp_templates
  for select
  using (public.get_user_role() in ('director', 'consultant', 'operations', 'finance'));
