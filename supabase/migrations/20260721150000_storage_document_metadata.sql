-- KMP Hub · Controle de armazenamento (Parte 1/6) · Metadados de documentos.
--
-- Hoje public.documents só guarda storage_path/client_id/case_id/categoria
-- (texto livre, nunca preenchido) — sem tamanho, formato ou hash. Esta
-- migração adiciona o que falta pra dar suporte a validação de upload
-- (duplicidade por hash, tamanho máximo) e ao painel de armazenamento
-- (agregação por categoria/cliente/processo, lista de maiores arquivos).
--
-- Os 2.922 documentos já existentes ficam com as colunas novas em null até
-- o backfill (script separado, só leitura do Storage + UPDATE, rodado com
-- confirmação explícita — não faz parte desta migração).

-- ---------------------------------------------------------------------------
-- document_categories — substitui o texto livre documents.categoria (nunca
-- usado na prática) por uma lista fixa que a equipe pode manter. sensivel
-- marca categorias que nunca devem ser comprimidas automaticamente
-- (passaporte, documento oficial, extrato bancário, tradução certificada).
-- ---------------------------------------------------------------------------

create table public.document_categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  sensivel boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_categories is
  'Categorias de documento (controle de armazenamento). sensivel=true impede compressão automática (passaporte, documento oficial, extrato bancário, tradução certificada) — só um aviso de tamanho é mostrado, nunca compressão.';

create trigger set_updated_at
  before update on public.document_categories
  for each row execute function public.set_updated_at();

insert into public.document_categories (nome, sensivel, ordem) values
  ('Passaporte', true, 1),
  ('Documento oficial (RG, certidão, etc.)', true, 2),
  ('Extrato bancário', true, 3),
  ('Tradução certificada', true, 4),
  ('Comprovante de residência', false, 5),
  ('Comprovante financeiro', false, 6),
  ('Certificado / diploma', false, 7),
  ('Foto', false, 8),
  ('Formulário preenchido', false, 9),
  ('Outro', false, 99);

-- ---------------------------------------------------------------------------
-- documents — colunas novas de metadados (seção "requisito 1")
-- ---------------------------------------------------------------------------

alter table public.documents
  add column categoria_id uuid references public.document_categories (id),
  add column tamanho_bytes bigint,
  add column formato text,
  add column hash_sha256 text;

comment on column public.documents.categoria_id is
  'Categoria do documento (document_categories). Substitui a coluna categoria (texto livre, nunca preenchida) sem removê-la — mantida por compatibilidade.';
comment on column public.documents.tamanho_bytes is
  'Tamanho do arquivo em bytes no momento do upload. Populado no upload novo; documentos antigos recebem o valor via script de backfill (lê o Storage, não grava nada sem confirmação).';
comment on column public.documents.formato is
  'Extensão do arquivo em minúsculas, sem ponto (ex.: "pdf", "jpg").';
comment on column public.documents.hash_sha256 is
  'SHA-256 do conteúdo do arquivo, calculado no upload — usado para detectar duplicidade. Nunca o conteúdo em si.';

create index documents_hash_sha256_idx on public.documents (hash_sha256);
create index documents_categoria_id_idx on public.documents (categoria_id);

-- document_versions também ganha tamanho/hash — cada versão é um arquivo
-- diferente no Storage, com seu próprio tamanho e hash.
alter table public.document_versions
  add column tamanho_bytes bigint,
  add column formato text,
  add column hash_sha256 text;

create index document_versions_hash_sha256_idx on public.document_versions (hash_sha256);
