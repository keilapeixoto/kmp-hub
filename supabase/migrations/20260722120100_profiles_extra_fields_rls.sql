-- KMP Hub · Gestão de usuários (Parte 1/3, RLS) · bucket "avatars".
--
-- profiles.telefone/cargo/foto_url já ficam cobertos pelas policies
-- existentes (profiles_update_self / profiles_update_admin, Sprint 1) — são
-- só colunas novas na mesma tabela, sem policy nova necessária.
--
-- storage.objects do bucket "avatars": leitura é pública (bucket public=true
-- já serve os arquivos direto, sem checar RLS); só INSERT/UPDATE/DELETE
-- precisam de regra — cada usuário mexe só na própria pasta (user_id/...),
-- admin mexe em qualquer uma.

create policy avatars_manage_own on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_manage_admin on storage.objects
  for all
  using (bucket_id = 'avatars' and public.get_user_role() = 'admin')
  with check (bucket_id = 'avatars' and public.get_user_role() = 'admin');
