-- KMP Hub · Portal de entrada (tela "Início") — seção "novidades de
-- imigração" tipo jornal, pedida pela Keila. Conteúdo manual por enquanto
-- (admin/diretor publica); puxar automaticamente de sites oficiais é Fase 2
-- (sem feed confiável confirmado — ver docs/architecture/10-ai-development-guide.md
-- se/quando isso for retomado).

create table public.immigration_news (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  link text,
  fonte text,
  publicado_em date not null default current_date,
  criado_por uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.immigration_news is
  'Novidades de imigração exibidas na tela "Início" (portal de entrada), estilo jornal. Conteúdo publicado manualmente por admin/diretor — não é puxado automaticamente de nenhuma fonte externa ainda.';

create index immigration_news_publicado_em_idx
  on public.immigration_news (publicado_em desc);

create trigger set_updated_at
  before update on public.immigration_news
  for each row execute function public.set_updated_at();

alter table public.immigration_news enable row level security;

-- Mesmo padrão de guias: admin/diretor publicam, toda a equipe lê.
create policy immigration_news_manage_admin on public.immigration_news
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy immigration_news_select_staff on public.immigration_news
  for select
  using (
    public.get_user_role() in ('admin', 'director', 'consultant', 'operations', 'finance')
  );
