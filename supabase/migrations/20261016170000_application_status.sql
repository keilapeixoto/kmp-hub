-- KMP Hub · Andamento da aplicação e do skills assessment no processo
-- (out/2026, pedido da Keila: "visualizar se está em análise, com request for
-- more information, os skills assessments aplicados").
--
-- cases.status continua sendo o estado do processo na KMP (ativo, pausado,
-- concluído...); estas colunas dizem em que pé está a aplicação no
-- Department e o skills assessment. O pedido de informação em si (RFI, com
-- prazo de 28 dias) continua em case_deadlines (aba Prazos) — aqui só o
-- status. Sem política nova: RLS é por linha e as políticas de cases já
-- cobrem as colunas novas (quem edita o processo edita o andamento).

alter table public.cases
  add column aplicacao_status text not null default 'nao_enviada' check (
    aplicacao_status in ('nao_enviada', 'enviada', 'em_analise', 'pedido_informacao', 'concedida', 'recusada', 'retirada')
  ),
  add column aplicacao_enviada_em date,
  add column aplicacao_decidida_em date,
  add column skills_status text not null default 'nao_se_aplica' check (
    skills_status in ('nao_se_aplica', 'a_aplicar', 'aplicado', 'aprovado', 'negado')
  ),
  add column skills_orgao text,
  add column skills_aplicado_em date;

comment on column public.cases.aplicacao_status is
  'Andamento da aplicação no Department: nao_enviada, enviada (lodged), em_analise, pedido_informacao (RFI), concedida, recusada, retirada.';
comment on column public.cases.skills_status is
  'Skills assessment do processo: nao_se_aplica, a_aplicar, aplicado, aprovado, negado. Órgão em skills_orgao (ex.: VETASSESS, ACS, Engineers Australia).';

create index cases_aplicacao_status_idx on public.cases (aplicacao_status);

notify pgrst, 'reload schema';

-- Verificação (resultado do SQL Editor): 6 colunas novas.
select count(*) as colunas_novas
from information_schema.columns
where table_schema = 'public' and table_name = 'cases'
  and column_name in ('aplicacao_status', 'aplicacao_enviada_em', 'aplicacao_decidida_em',
                      'skills_status', 'skills_orgao', 'skills_aplicado_em');
