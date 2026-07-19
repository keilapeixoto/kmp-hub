-- KMP Hub · Sprint 5 · Documentos e Storage (seção 4 do plano). RLS
-- (incluindo storage.objects) na migração seguinte
-- (20260714131000_documents_rls.sql).

-- ---------------------------------------------------------------------------
-- Bucket privado — acesso só por URL assinada de curta duração (seção 1)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- documents / document_versions
-- ---------------------------------------------------------------------------
--
-- storage_path segue a convenção do plano: cliente_id/processo_id/arquivo.
-- Em documents, storage_path sempre aponta para a versão mais recente;
-- document_versions guarda o histórico completo.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  case_id uuid references public.cases (id),
  checklist_item_id uuid references public.checklist_items (id),
  categoria text,
  storage_path text not null,
  enviado_por uuid references auth.users (id),
  analisado_por uuid references auth.users (id),
  validade date,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.documents is
  'Documentos enviados (seção 4). Soft delete apenas — arquivado=true, nunca exclusão permanente; só admin acessa arquivados (mesma convenção de identity_documents, seção 8 risco 3).';

create index documents_client_id_idx on public.documents (client_id);
create index documents_case_id_idx on public.documents (case_id);
create index documents_checklist_item_id_idx on public.documents (checklist_item_id);

create trigger set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  versao integer not null,
  storage_path text not null,
  autor uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (document_id, versao)
);

comment on table public.document_versions is
  'Histórico append-only de versões de um documento (seção 4). Sem update/delete — reenviar gera uma nova linha e atualiza documents.storage_path/updated_at.';

create index document_versions_document_id_idx on public.document_versions (document_id);

create or replace function public.create_initial_document_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.document_versions (document_id, versao, storage_path, autor)
  values (new.id, 1, new.storage_path, new.enviado_por);
  return new;
end;
$$;

comment on function public.create_initial_document_version is
  'Cria a versão 1 em document_versions ao criar um documento. SECURITY DEFINER para inserir independente das políticas de RLS de document_versions.';

create trigger create_initial_document_version
  after insert on public.documents
  for each row execute function public.create_initial_document_version();
