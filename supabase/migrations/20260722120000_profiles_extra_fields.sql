-- KMP Hub · Gestão de usuários (Parte 1/3) · Campos novos em profiles.
--
-- Hoje profiles só tem nome/idioma/ativo — sem telefone, cargo nem foto. Sem
-- tela pra editar nada disso (pedido: "gestão de usuários"). Adiciona os
-- campos; a UI vem nas próximas migrações/páginas.
--
-- foto_url guarda a URL pública do bucket "avatars" (novo, público — foto de
-- perfil não tem a mesma sensibilidade de documento de cliente, então não
-- precisa de URL assinada de curta duração como em "documents").

alter table public.profiles
  add column telefone text,
  add column cargo text,
  add column foto_url text;

comment on column public.profiles.cargo is
  'Cargo/título exibido (ex.: "Consultora de Imigração") — livre, não confundir com profiles.role_id (nível de acesso).';
comment on column public.profiles.foto_url is
  'URL pública do bucket "avatars". Null = usa iniciais do nome como avatar padrão na interface.';

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
