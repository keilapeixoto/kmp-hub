-- KMP Hub · Controle de Documentos · classificação automática por IA
-- (docs/spec-controle-documentos.md). Estende a tabela documents já
-- existente (Sprint 5) em vez de criar tabelas paralelas — checklist_items
-- e documents/document_versions já cobrem o que a especificação original
-- propunha como case_checklist_items/case_documents.
--
-- nome_original: nome do arquivo como a equipe enviou, antes da renomeação
-- padronizada (nome já existe e vira o nome exibido/renomeado).
-- document_type: tipo classificado (passaporte, extrato_bancario, etc. —
-- ver lib/documents/constants.ts), seja pela IA ou por confirmação manual.
-- classification_confidence: 0 a 1, retornado pela API da Anthropic; null
-- quando não houve classificação automática (falha ou documento antigo).
-- revisao_classificacao_pendente: true enquanto a confiança ficou abaixo do
-- limite e a equipe ainda não confirmou o tipo manualmente.

alter table public.documents
  add column nome_original text,
  add column document_type text,
  add column classification_confidence numeric(3, 2),
  add column revisao_classificacao_pendente boolean not null default false;

alter table public.documents
  add constraint documents_classification_confidence_check
  check (
    classification_confidence is null
    or (classification_confidence >= 0 and classification_confidence <= 1)
  );

comment on column public.documents.nome_original is
  'Nome do arquivo como enviado pela equipe, antes da renomeação padronizada (documents.nome).';
comment on column public.documents.document_type is
  'Tipo de documento classificado (ver lib/documents/constants.ts) — pela IA ou confirmado manualmente.';
comment on column public.documents.classification_confidence is
  'Confiança (0 a 1) da classificação automática via API da Anthropic. Null = sem classificação automática.';
comment on column public.documents.revisao_classificacao_pendente is
  'True enquanto a confiança da classificação automática ficou abaixo do limite (lib/documents/constants.ts) e a equipe ainda não confirmou o tipo manualmente.';
