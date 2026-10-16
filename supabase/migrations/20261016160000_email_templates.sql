-- KMP Hub · E-mail com templates, anexos e assinatura (out/2026, pedido da
-- Keila: "templates automáticos dos processos, com anexos automáticos, e com
-- as assinaturas de e-mail salvas").
--
-- 1. Assinatura por pessoa da equipe (profiles): imagem pronta (PNG/JPG no
--    bucket público "avatars", pasta do próprio usuário — mesma regra da foto
--    de perfil), frase de fecho opcional e links clicáveis (WhatsApp e
--    Instagram; botões dentro de imagem não são clicáveis no e-mail). As
--    políticas de profiles já cobrem as colunas novas (cada um edita o seu,
--    admin edita qualquer um).
-- 2. Template ligado a um tipo de serviço (opcional): aparece primeiro ao
--    escrever para cliente com processo desse tipo.
-- 3. Anexos fixos do template: message_template_attachments + bucket privado
--    "email-anexos". Só admin cadastra/remove (mesma regra dos templates);
--    a equipe lê para poder enviar. Nada disso é visível para cliente ou
--    parceiro.

-- ---------------------------------------------------------------------------
-- 1. Assinatura
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column assinatura_url text,
  add column assinatura_fecho text,
  add column assinatura_whatsapp text,
  add column assinatura_instagram text;

comment on column public.profiles.assinatura_url is
  'Imagem da assinatura de e-mail (URL pública do bucket avatars, pasta do usuário). Vai no fim dos e-mails enviados pelo Hub.';
comment on column public.profiles.assinatura_fecho is
  'Frase antes da assinatura (ex.: "Atenciosamente,"). Opcional.';
comment on column public.profiles.assinatura_whatsapp is
  'Número para o link clicável de WhatsApp abaixo da assinatura (só dígitos com DDI). Opcional.';
comment on column public.profiles.assinatura_instagram is
  'Usuário do Instagram (sem @) para o link clicável abaixo da assinatura. Opcional.';

-- ---------------------------------------------------------------------------
-- 2. Template por tipo de serviço
-- ---------------------------------------------------------------------------

alter table public.message_templates
  add column service_type_id uuid references public.service_types (id) on delete set null;

comment on column public.message_templates.service_type_id is
  'Tipo de serviço (visto) ao qual o template se aplica. Null = geral, aparece para qualquer cliente.';

create index message_templates_service_type_id_idx on public.message_templates (service_type_id);

-- ---------------------------------------------------------------------------
-- 3. Anexos fixos do template
-- ---------------------------------------------------------------------------

create table public.message_template_attachments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.message_templates (id) on delete cascade,
  nome text not null,
  storage_path text not null unique,
  tamanho bigint not null default 0,
  content_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.message_template_attachments is
  'Arquivos que vão junto sempre que o template é usado (bucket privado email-anexos). Só admin gerencia; equipe lê para enviar.';

create index message_template_attachments_template_id_idx
  on public.message_template_attachments (template_id);

create trigger set_updated_at
  before update on public.message_template_attachments
  for each row execute function public.set_updated_at();

create trigger audit
  after insert or update or delete on public.message_template_attachments
  for each row execute function public.audit();

alter table public.message_template_attachments enable row level security;

create policy message_template_attachments_manage_admin on public.message_template_attachments
  for all
  using ((select public.get_user_role()) = 'admin')
  with check ((select public.get_user_role()) = 'admin');

create policy message_template_attachments_select_staff on public.message_template_attachments
  for select
  using ((select public.get_user_role()) in ('director', 'consultant', 'operations', 'finance'));

insert into storage.buckets (id, name, public)
values ('email-anexos', 'email-anexos', false)
on conflict (id) do nothing;

create policy email_anexos_select_staff on storage.objects
  for select
  using (
    bucket_id = 'email-anexos'
    and (select public.get_user_role()) in ('admin', 'director', 'consultant', 'operations', 'finance')
  );

create policy email_anexos_manage_admin on storage.objects
  for all
  using (bucket_id = 'email-anexos' and (select public.get_user_role()) = 'admin')
  with check (bucket_id = 'email-anexos' and (select public.get_user_role()) = 'admin');

notify pgrst, 'reload schema';

-- Verificação (resultado do SQL Editor): RLS ligado, 2 políticas na tabela,
-- 2 no bucket, 4 colunas de assinatura.
select
  (select relrowsecurity from pg_class where oid = 'public.message_template_attachments'::regclass) as rls_ligado,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'message_template_attachments') as politicas_tabela,
  (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'email_anexos_%') as politicas_bucket,
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name like 'assinatura_%') as colunas_assinatura;
