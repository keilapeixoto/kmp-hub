-- KMP Hub · Controle de armazenamento (Parte 3/6) · monitoramento e alertas.
--
-- Três tabelas de apoio ao painel e à rotina diária (seções "requisito 3",
-- "requisito 4" e "requisito 5"):
--
-- storage_daily_snapshots — um retrato por dia (crescimento 30/90/365 dias
-- vem de comparar snapshots, sem precisar reprocessar documents toda vez).
--
-- storage_audit_runs — registro de cada execução da rotina diária (o que
-- ela encontrou), pra auditoria — nunca grava conteúdo de arquivo, só
-- contagens e totais.
--
-- storage_alert_events — um alerta de threshold cruzado, com o resultado do
-- envio de e-mail. Evita reenviar o mesmo alerta todo dia: só grava uma
-- linha nova quando o uso cruza um threshold que ainda não tinha sido
-- registrado desde a última vez que caiu abaixo dele.

create table public.storage_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  total_bytes bigint not null,
  total_bytes_ativos bigint not null,
  total_bytes_arquivados bigint not null,
  total_arquivos integer not null,
  por_categoria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.storage_daily_snapshots is
  'Um retrato por dia do uso de armazenamento (controle de armazenamento). Gerado pela rotina diária (Route Handler /api/cron/storage-check) — usado pra calcular crescimento em 30/90/365 dias sem reprocessar documents.';

create index storage_daily_snapshots_date_idx on public.storage_daily_snapshots (snapshot_date desc);

create table public.storage_audit_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  total_bytes bigint not null,
  orfaos_sem_processo integer not null default 0,
  duplicados_grupos integer not null default 0,
  duplicados_bytes bigint not null default 0,
  thresholds_cruzados integer[] not null default array[]::integer[],
  status text not null default 'ok' check (status in ('ok', 'erro')),
  detalhe text,
  duracao_ms integer
);

comment on table public.storage_audit_runs is
  'Auditoria de cada execução da rotina diária de armazenamento (controle de armazenamento). Só contagens/totais — nunca nome de arquivo nem conteúdo.';

create index storage_audit_runs_run_at_idx on public.storage_audit_runs (run_at desc);

create table public.storage_alert_events (
  id uuid primary key default gen_random_uuid(),
  threshold_pct integer not null,
  triggered_at timestamptz not null default now(),
  total_bytes bigint not null,
  emails_sent_to text[] not null default array[]::text[],
  email_status text not null default 'pendente' check (email_status in ('pendente', 'enviado', 'falhou', 'sem_destinatario')),
  detalhe text,
  reconhecido_em timestamptz,
  reconhecido_por uuid references auth.users (id)
);

comment on table public.storage_alert_events is
  'Um alerta de limite de armazenamento cruzado (50/70/80/90/100%, controle de armazenamento) e o resultado do envio de e-mail via Resend. reconhecido_em marca quando um admin viu o alerta no painel.';

create index storage_alert_events_triggered_at_idx on public.storage_alert_events (triggered_at desc);
