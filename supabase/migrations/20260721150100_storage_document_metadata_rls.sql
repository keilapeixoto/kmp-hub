-- KMP Hub · Controle de armazenamento (Parte 1/6, RLS) · document_categories.
--
-- Leitura ampla (toda função autenticada usa a lista pra escolher categoria
-- no upload, inclusive cliente no portal); escrita só admin/director — mesmo
-- padrão de service_types (Sprint 4).

alter table public.document_categories enable row level security;

create policy document_categories_select_authenticated on public.document_categories
  for select
  using (auth.uid() is not null);

create policy document_categories_manage_admin on public.document_categories
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy document_categories_manage_director on public.document_categories
  for all
  using (public.get_user_role() = 'director')
  with check (public.get_user_role() = 'director');
