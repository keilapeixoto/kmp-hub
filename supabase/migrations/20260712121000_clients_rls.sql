-- KMP Hub · Sprint 3 · RLS de clients, client_relations e identity_documents
-- Referência: seção 5 do plano (matriz de permissões), módulos "Clientes" e
-- "Documentos". Operacional/financeiro ficam sem policy por enquanto: a
-- matriz define "R autorizados"/"R necessário", mas ainda não existe a tabela
-- de vínculo (equipe do processo) que definiria quem é "autorizado" — isso
-- chega no Sprint 4 (processos). Parceiro e cliente usam client_access,
-- criada no Sprint 1 e ligada a clients nesta migração de schema.

alter table public.clients enable row level security;
alter table public.client_relations enable row level security;
alter table public.identity_documents enable row level security;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create policy clients_manage_staff on public.clients
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy clients_select_own_consultant on public.clients
  for select
  using (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

create policy clients_insert_own_consultant on public.clients
  for insert
  with check (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

create policy clients_update_own_consultant on public.clients
  for update
  using (public.get_user_role() = 'consultant' and consultor_id = auth.uid())
  with check (public.get_user_role() = 'consultant' and consultor_id = auth.uid());

-- Parceiro: "R compartilhados" via client_access (partner_id). Somente leitura.
create policy clients_select_partner on public.clients
  for select
  using (
    public.get_user_role() = 'partner'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = clients.id and ca.partner_id = auth.uid()
    )
  );

-- Cliente: "próprio perfil" via client_access (client_user_id). Somente
-- leitura nesta fase — edição pelo próprio cliente é portal, Fase 2.
create policy clients_select_client on public.clients
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = clients.id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- client_relations (dependentes)
-- Visibilidade/escrita segue quem pode gerenciar o cliente "titular"
-- (client_id) — o dependente (related_client_id) normalmente já pertence ao
-- mesmo consultor por ter sido criado a partir do mesmo fluxo.
-- ---------------------------------------------------------------------------

create policy client_relations_manage_staff on public.client_relations
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy client_relations_manage_consultant on public.client_relations
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id = client_relations.client_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id = client_relations.client_id and c.consultor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- identity_documents
-- Soft delete: arquivado=true. Convenção do CLAUDE.md — só admin acessa
-- arquivados, mesmo diretor (que tem "G" na matriz da seção 5) só vê/edita os
-- ativos.
-- ---------------------------------------------------------------------------

create policy identity_documents_manage_admin on public.identity_documents
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy identity_documents_manage_director on public.identity_documents
  for all
  using (public.get_user_role() = 'director' and not arquivado)
  with check (public.get_user_role() = 'director');

create policy identity_documents_select_consultant on public.identity_documents
  for select
  using (
    public.get_user_role() = 'consultant'
    and not arquivado
    and exists (
      select 1 from public.clients c
      where c.id = identity_documents.client_id and c.consultor_id = auth.uid()
    )
  );

create policy identity_documents_insert_consultant on public.identity_documents
  for insert
  with check (
    public.get_user_role() = 'consultant'
    and not arquivado
    and exists (
      select 1 from public.clients c
      where c.id = identity_documents.client_id and c.consultor_id = auth.uid()
    )
  );

create policy identity_documents_update_consultant on public.identity_documents
  for update
  using (
    public.get_user_role() = 'consultant'
    and not arquivado
    and exists (
      select 1 from public.clients c
      where c.id = identity_documents.client_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id = identity_documents.client_id and c.consultor_id = auth.uid()
    )
  );

-- Parceiro e cliente: leitura dos documentos não arquivados dos clientes
-- compartilhados/próprios (mesma base de client_access das policies de clients).
create policy identity_documents_select_partner on public.identity_documents
  for select
  using (
    public.get_user_role() = 'partner'
    and not arquivado
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = identity_documents.client_id and ca.partner_id = auth.uid()
    )
  );

create policy identity_documents_select_client on public.identity_documents
  for select
  using (
    public.get_user_role() = 'client'
    and not arquivado
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = identity_documents.client_id and ca.client_user_id = auth.uid()
    )
  );
