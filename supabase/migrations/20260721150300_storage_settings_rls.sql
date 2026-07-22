-- KMP Hub · Controle de armazenamento (Parte 2/6, RLS) · storage_settings.
--
-- Só admin/director acessam a tabela diretamente (painel e página de
-- configurações são admin/director only — seção "requisito 9": "administradores
-- podem visualizar o consumo geral"). As Server Actions de upload leem os
-- limites via lib/supabase/admin.ts (chave secreta, só servidor) — não expõe
-- a tabela pra outras funções, então consultor/operations nunca veem
-- alert_emails nem precisam de policy própria aqui.

alter table public.storage_settings enable row level security;

create policy storage_settings_manage_admin on public.storage_settings
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy storage_settings_manage_director on public.storage_settings
  for all
  using (public.get_user_role() = 'director')
  with check (public.get_user_role() = 'director');
