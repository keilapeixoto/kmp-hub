-- KMP Hub · Painel de vencimento de vistos (docs/spec-vencimento-vistos.md)
-- Campos do visto que o cliente já possui e está usando agora — diferente do
-- processo em andamento em cases. Nomes de coluna seguem o padrão real deste
-- banco (português: clients.nome, clients.situacao, identity_documents.validade),
-- não os nomes em inglês sugeridos na primeira versão da spec.
--
-- Sem RLS nova nesta migração: RLS é por linha, não por coluna — as políticas
-- de public.clients (20260712121000_clients_rls.sql) já cobrem estas colunas
-- para todas as funções. Sem teste pgTAP novo pelo mesmo motivo: os testes de
-- 003_clients_rls.test.sql já verificam a visibilidade de linha de clients por
-- função via count(*); adicionar colunas não muda esse comportamento.

alter table public.clients
  add column visto_atual_subclasse text,
  add column visto_atual_validade date,
  add column visto_alerta_limite_dias integer;

comment on column public.clients.visto_atual_subclasse is
  'Subclasse do visto que o cliente já possui e está usando agora (ex.: "500", "485") — não é o processo em andamento (ver cases/service_types).';

comment on column public.clients.visto_atual_validade is
  'Data de vencimento do visto atual do cliente. Usada pelo painel /vencimentos para calcular dias restantes e urgência.';

comment on column public.clients.visto_alerta_limite_dias is
  'Override por cliente do limite padrão de alerta "crítico" (30 dias — ver VISA_ALERT_THRESHOLDS em lib/clients/constants.ts). NULL usa o padrão.';

create index clients_visto_atual_validade_idx on public.clients (visto_atual_validade);
