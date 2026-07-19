-- KMP Hub · Sprint 3 · Clientes, dependentes e documentos de identidade
-- (seção 4 do plano). RLS é ativado na migração seguinte
-- (20260712121000_clients_rls.sql).

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date,
  nacionalidade text,
  telefone text,
  email text,
  rede_social text,
  pais text,
  cidade text,
  fuso_horario text,
  idioma_preferencial text not null default 'pt' check (idioma_preferencial in ('pt', 'en')),
  situacao text,
  objetivos text,
  consultor_id uuid not null references auth.users (id) default auth.uid(),
  lead_id uuid references public.leads (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clients is
  'Clientes (seção 4 do plano). idioma_preferencial controla o idioma do portal do cliente (Fase 2), independente do idioma da equipe. lead_id aponta para o lead de origem quando o cliente vem de conversão.';

create index clients_consultor_id_idx on public.clients (consultor_id);
create index clients_lead_id_idx on public.clients (lead_id);
create index clients_pais_idx on public.clients (pais);

create trigger set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- client_relations (dependentes — cada pessoa tem cadastro próprio em clients)
-- ---------------------------------------------------------------------------

create table public.client_relations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  related_client_id uuid not null references public.clients (id) on delete cascade,
  tipo text not null check (tipo in ('conjuge', 'filho', 'pai_mae', 'outro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_relations_no_self_relation check (client_id <> related_client_id),
  unique (client_id, related_client_id)
);

comment on table public.client_relations is
  'Vínculo entre um cliente e um dependente (seção 4 do plano). O dependente é um cliente completo em public.clients; esta tabela só guarda o relacionamento e o tipo (cônjuge, filho, pai/mãe, outro).';

create index client_relations_client_id_idx on public.client_relations (client_id);
create index client_relations_related_client_id_idx on public.client_relations (related_client_id);

create trigger set_updated_at
  before update on public.client_relations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- identity_documents
-- ---------------------------------------------------------------------------
--
-- Sem upload de arquivo aqui de propósito: o sistema de Storage com bucket
-- privado e versões (tabelas documents/document_versions) é escopo do
-- Sprint 5. Por enquanto isto só registra o dado estruturado do documento
-- (tipo, número, validade) para o alerta de vencimento.

create table public.identity_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  tipo text not null,
  numero text,
  validade date,
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.identity_documents is
  'Documentos de identidade (passaporte etc.) com alerta de vencimento (seção 4). Soft delete apenas — arquivado=true, nunca exclusão permanente (convenção geral de documentos do CLAUDE.md); só admin acessa arquivados.';

create index identity_documents_client_id_idx on public.identity_documents (client_id);
create index identity_documents_validade_idx on public.identity_documents (validade);

create trigger set_updated_at
  before update on public.identity_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- client_access: FK pendente desde o Sprint 1, agora que clients existe
-- ---------------------------------------------------------------------------

alter table public.client_access
  add constraint client_access_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete cascade;
