-- KMP Hub · Perfil do cliente mais completo (out/2026, pedido da Keila).
--
-- - nomes / sobrenome: o passaporte separa "Given names" de "Family name" e o
--   ImmiAccount também. "nome" continua sendo o nome completo de exibição (a
--   tela grava os três juntos); clientes antigos ficam com nomes/sobrenome
--   vazios até alguém editar.
-- - endereco_origem / endereco_australia: endereço no país de origem e na
--   Austrália, em texto livre (rua, número, cidade, estado, CEP/postcode).
-- - foto_path: foto do cliente no bucket privado "documents"
--   (cliente_id/perfil/...), aberta só por URL assinada — mesma regra de
--   acesso dos documentos do cliente.
-- - visto_aplicado / visto_aplicado_origem: o visto que o cliente aplicou ou
--   vai aplicar, preenchido a partir da pasta da KEY MIGRATION
--   (scripts/visto-da-key-migration.mjs) ou à mão; aparece na lista de
--   clientes quando ainda não há processo no Hub.
--
-- Só colunas novas em clients: as políticas RLS da tabela já valem para elas.

alter table public.clients
  add column if not exists nomes text,
  add column if not exists sobrenome text,
  add column if not exists endereco_origem text,
  add column if not exists endereco_australia text,
  add column if not exists foto_path text,
  add column if not exists visto_aplicado text,
  add column if not exists visto_aplicado_origem text;

comment on column public.clients.nomes is 'Nome(s) próprio(s), como no passaporte (Given names).';
comment on column public.clients.sobrenome is 'Sobrenome, como no passaporte (Family name).';
comment on column public.clients.foto_path is 'Caminho da foto no bucket documents (cliente_id/perfil/...).';
comment on column public.clients.visto_aplicado is 'Visto aplicado ou a aplicar (ex.: "485 · aplicado"), quando ainda não há processo no Hub.';
comment on column public.clients.visto_aplicado_origem is 'De onde veio visto_aplicado (ex.: pasta da KEY MIGRATION).';

notify pgrst, 'reload schema';
