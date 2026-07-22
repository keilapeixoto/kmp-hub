-- KMP Hub · Controle de armazenamento (Parte 3/6, RLS) · monitoramento.
--
-- Mesma regra de storage_settings: só admin/director, visualização e
-- reconhecimento de alerta (update de reconhecido_em/reconhecido_por). A
-- rotina diária (Route Handler) grava usando lib/supabase/admin.ts, então
-- não precisa de policy de insert pra nenhuma função — só leitura/ack.

alter table public.storage_daily_snapshots enable row level security;
alter table public.storage_audit_runs enable row level security;
alter table public.storage_alert_events enable row level security;

create policy storage_daily_snapshots_select_admin on public.storage_daily_snapshots
  for select using (public.get_user_role() = 'admin');

create policy storage_daily_snapshots_select_director on public.storage_daily_snapshots
  for select using (public.get_user_role() = 'director');

create policy storage_audit_runs_select_admin on public.storage_audit_runs
  for select using (public.get_user_role() = 'admin');

create policy storage_audit_runs_select_director on public.storage_audit_runs
  for select using (public.get_user_role() = 'director');

create policy storage_alert_events_select_admin on public.storage_alert_events
  for select using (public.get_user_role() = 'admin');

create policy storage_alert_events_select_director on public.storage_alert_events
  for select using (public.get_user_role() = 'director');

-- Reconhecer um alerta (marcar como visto) — só campos de reconhecimento,
-- mas RLS não restringe coluna por coluna, então o with check repete a
-- mesma condição de acesso.
create policy storage_alert_events_ack_admin on public.storage_alert_events
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy storage_alert_events_ack_director on public.storage_alert_events
  for update
  using (public.get_user_role() = 'director')
  with check (public.get_user_role() = 'director');
