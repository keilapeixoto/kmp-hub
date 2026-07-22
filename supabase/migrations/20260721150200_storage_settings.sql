-- KMP Hub · Controle de armazenamento (Parte 2/6) · storage_settings.
--
-- Tabela singleton (uma linha só, id fixo) com os parâmetros que o admin
-- pode ajustar (seção "requisito 10"). Limite interno começa em 50 GB —
-- decisão da cliente, menor que a cota de 100 GB do plano Pro do Supabase
-- de propósito, pra alertar antes de qualquer custo extra aparecer na
-- fatura. bloqueio de formatos perigosos (executáveis) é sempre aplicado
-- no código independente do que estiver aqui — essa tabela só controla o
-- que é permitido além do bloqueio de segurança, nunca o contrário.

create table public.storage_settings (
  id boolean primary key default true,
  max_file_size_bytes bigint not null default 26214400, -- 25 MB
  allowed_extensions text[] not null default array[
    'pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp',
    'doc', 'docx', 'xls', 'xlsx', 'odt',
    'mp4', 'mov'
  ],
  alert_thresholds_pct integer[] not null default array[50, 70, 80, 90, 100],
  alert_emails text[] not null default array[]::text[],
  internal_limit_bytes bigint not null default 53687091200, -- 50 GB
  large_file_warning_bytes bigint not null default 20971520, -- 20 MB (seção "requisito 6")
  archived_case_review_days integer not null default 180,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  constraint storage_settings_singleton check (id)
);

comment on table public.storage_settings is
  'Configurações do controle de armazenamento (linha única, id sempre true). Editável só por admin/director em /configuracoes/armazenamento/ajustes.';
comment on column public.storage_settings.large_file_warning_bytes is
  'Acima disso, o painel só avisa que o arquivo está "acima do recomendado" — nunca comprime automaticamente documentos sensíveis (document_categories.sensivel).';

create trigger set_updated_at
  before update on public.storage_settings
  for each row execute function public.set_updated_at();

insert into public.storage_settings (id) values (true);
