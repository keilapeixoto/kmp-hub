-- KMP Hub · Guias ganham anexo em PDF (biblioteca de materiais prontos que a
-- equipe já manda por e-mail, ex.: guias explicativos, passo a passo).
-- Convive com o conteúdo em texto (guides.conteudo) — um guia pode ter só
-- texto, só PDF, ou os dois; a UI mostra o que existir.

alter table public.guides add column pdf_storage_path text;

comment on column public.guides.pdf_storage_path is
  'Caminho no bucket privado "guides" (guide_id/arquivo.pdf) de um PDF pronto anexado a este guia — opcional, independente do conteúdo em texto.';

insert into storage.buckets (id, name, public)
values ('guides', 'guides', false)
on conflict (id) do nothing;

-- Mesmo padrão de permissão da tabela guides (guides_manage_admin /
-- guides_select_staff): guias não são específicos de cliente, então não há
-- policy de partner/client aqui (nunca aparecem no portal).

create policy guides_bucket_manage_admin on storage.objects
  for all
  using (bucket_id = 'guides' and public.get_user_role() = 'admin')
  with check (bucket_id = 'guides' and public.get_user_role() = 'admin');

create policy guides_bucket_select_staff on storage.objects
  for select
  using (
    bucket_id = 'guides'
    and public.get_user_role() in ('director', 'consultant', 'operations', 'finance')
  );
