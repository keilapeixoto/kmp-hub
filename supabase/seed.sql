-- KMP Hub · Dados de seed para desenvolvimento local
-- Roda automaticamente após as migrações em `supabase db reset` / `supabase start`.

insert into public.roles (nome) values
  ('admin'),
  ('director'),
  ('consultant'),
  ('operations'),
  ('finance'),
  ('partner'),
  ('client')
on conflict (nome) do nothing;
