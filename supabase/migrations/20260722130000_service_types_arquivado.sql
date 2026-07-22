-- KMP Hub · Personalização de pipelines (Parte 1/2) · arquivar tipo de serviço.
--
-- "Excluir" pipeline de verdade é arriscado — processos reais (cases) têm FK
-- pra service_types, então uma pipeline usada não pode ser removida sem
-- quebrar histórico. Soft delete (arquivado=true) segue a mesma convenção já
-- usada em documents/cases: nunca excluir, só marcar e esconder da lista
-- padrão.

alter table public.service_types
  add column arquivado boolean not null default false;

comment on column public.service_types.arquivado is
  'Pipeline arquivada não aparece na lista padrão nem no "novo processo" — mas processos que já usam ela continuam funcionando normalmente (RLS/relacionamentos inalterados).';
