-- KMP Hub · Documentos (Parte 1/1) · subpastas e status próprio.
--
-- pasta: organização livre dentro do processo (ex.: "Financeiro",
-- "Identidade") — texto simples, sem tabela de pastas separada; a equipe cria
-- o nome que quiser digitando.
--
-- status_revisao: documentos sem checklist_item_id vinculado (a maioria dos
-- 2.922 importados) não têm nenhum jeito de marcar aprovado/pendente/incorreto
-- hoje — esse status vive no checklist_item, não no documento. Novo campo
-- cobre exatamente esse caso; documentos COM checklist_item_id continuam
-- usando o status do item (esse campo fica seu complemento, não substitui).

alter table public.documents
  add column pasta text,
  add column status_revisao text not null default 'pendente'
    check (status_revisao in ('pendente', 'aprovado', 'incorreto'));

comment on column public.documents.pasta is
  'Subpasta dentro do processo, texto livre definido pela equipe (controle de documentos). Null = raiz do processo.';
comment on column public.documents.status_revisao is
  'Status de revisão do documento em si — relevante principalmente para documentos sem checklist_item_id (a maioria dos importados). Documentos vinculados a um checklist_item também têm o status do item; este campo é complementar, não substitui aquele.';
