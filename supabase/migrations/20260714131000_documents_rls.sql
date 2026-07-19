-- KMP Hub · Sprint 5 · RLS de documents, document_versions e do bucket
-- "documents" em storage.objects. Referência: seção 5 (módulo "Documentos")
-- e seção 8, risco 3 ("nunca URLs públicas... log de acesso"). Financeiro
-- fica sem acesso por enquanto — "R vinculados" da matriz não tem uma tabela
-- de vínculo concreta ainda (seria ligado a invoices, Fase 3).

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

-- Soft delete: arquivado=true. Convenção do CLAUDE.md — só admin acessa
-- arquivados, mesmo diretor (que tem "G" na matriz da seção 5) só vê/edita os
-- ativos (mesmo padrão de identity_documents no Sprint 3).

create policy documents_manage_admin on public.documents
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy documents_manage_director on public.documents
  for all
  using (public.get_user_role() = 'director' and not arquivado)
  with check (public.get_user_role() = 'director');

create policy documents_manage_consultant on public.documents
  for all
  using (
    public.get_user_role() = 'consultant'
    and not arquivado
    and exists (
      select 1 from public.clients cl
      where cl.id = documents.client_id and cl.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients cl
      where cl.id = documents.client_id and cl.consultor_id = auth.uid()
    )
  );

create policy documents_manage_operations on public.documents
  for all
  using (
    public.get_user_role() = 'operations'
    and not arquivado
    and documents.case_id is not null
    and exists (
      select 1 from public.cases c
      where c.id = documents.case_id and auth.uid() = any(c.equipe)
    )
  )
  with check (
    public.get_user_role() = 'operations'
    and documents.case_id is not null
    and exists (
      select 1 from public.cases c
      where c.id = documents.case_id and auth.uid() = any(c.equipe)
    )
  );

create policy documents_select_partner on public.documents
  for select
  using (
    public.get_user_role() = 'partner'
    and not arquivado
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = documents.client_id and ca.partner_id = auth.uid()
    )
  );

-- Cliente: "próprios + upload" (seção 5) — leitura e envio de novos
-- documentos do próprio client_id. UI real fica pro portal (Fase 2); a
-- policy já existe para quando a tela existir.
create policy documents_select_client on public.documents
  for select
  using (
    public.get_user_role() = 'client'
    and not arquivado
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = documents.client_id and ca.client_user_id = auth.uid()
    )
  );

create policy documents_insert_client on public.documents
  for insert
  with check (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = documents.client_id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- document_versions — mesma visibilidade de documents; sem update/delete
-- (append-only). Insert manual (nova versão) só para quem edita o documento.
-- ---------------------------------------------------------------------------

create policy document_versions_select_staff on public.document_versions
  for select
  using (
    public.get_user_role() in ('admin', 'director')
    or (
      public.get_user_role() in ('consultant', 'operations', 'partner', 'client')
      and exists (
        select 1 from public.documents d where d.id = document_versions.document_id
      )
    )
  );

comment on policy document_versions_select_staff on public.document_versions is
  'A visibilidade real de quem não é admin/diretor já é filtrada pelo RLS de documents no EXISTS — se a linha de documents não é visível para o usuário, o EXISTS falha.';

create policy document_versions_insert_staff on public.document_versions
  for insert
  with check (
    public.get_user_role() in ('admin', 'director', 'consultant', 'operations')
    and exists (
      select 1 from public.documents d where d.id = document_versions.document_id
    )
  );

-- ---------------------------------------------------------------------------
-- storage.objects (bucket "documents")
-- Caminho: client_id/case_id/arquivo — storage.foldername(name) retorna os
-- segmentos da pasta; [1] é o client_id.
-- ---------------------------------------------------------------------------

create policy documents_bucket_manage_staff on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and public.get_user_role() in ('admin', 'director')
  )
  with check (
    bucket_id = 'documents'
    and public.get_user_role() in ('admin', 'director')
  );

create policy documents_bucket_manage_consultant on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id::text = (storage.foldername(name))[1] and c.consultor_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documents'
    and public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id::text = (storage.foldername(name))[1] and c.consultor_id = auth.uid()
    )
  );

create policy documents_bucket_select_partner on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and public.get_user_role() = 'partner'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id::text = (storage.foldername(name))[1] and ca.partner_id = auth.uid()
    )
  );

create policy documents_bucket_select_client on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and public.get_user_role() = 'client'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id::text = (storage.foldername(name))[1] and ca.client_user_id = auth.uid()
    )
  );

create policy documents_bucket_insert_client on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and public.get_user_role() = 'client'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id::text = (storage.foldername(name))[1] and ca.client_user_id = auth.uid()
    )
  );
