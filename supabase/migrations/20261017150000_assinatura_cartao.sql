-- KMP Hub · Assinatura de e-mail em cartão (out/2026, modelo da Keila).
--
-- A assinatura que vai no fim dos e-mails enviados pelo Hub ganha o layout da
-- KMP: foto, nome, cargo, credencial, frase, logo, telefone, e-mail,
-- Instagram, botões e aviso de confidencialidade. Os campos novos ficam num
-- JSON só (assinatura_dados) para não abrir uma coluna por linha do cartão.
-- WhatsApp e Instagram continuam nas colunas que já existiam. A política RLS
-- de profiles (cada um edita o próprio perfil) já vale para a coluna nova.

alter table public.profiles
  add column if not exists assinatura_dados jsonb not null default '{}'::jsonb;

comment on column public.profiles.assinatura_dados is
  'Cartão da assinatura de e-mail: {cargo, credencial, slogan, telefone, email, foto_url, logo_url, aviso}.';

notify pgrst, 'reload schema';
