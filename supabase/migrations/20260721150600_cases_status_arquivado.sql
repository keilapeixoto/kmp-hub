-- KMP Hub · Controle de armazenamento (Parte 4/6) · arquivamento de processos.
--
-- Seção "requisito 8": permitir arquivar um processo finalizado sem excluir
-- nada. cases já tem status ('ativo'|'pausado'|'concluido'|'cancelado') com
-- histórico automático em case_status_history (trigger log_case_status_change,
-- Sprint 4) — só falta o valor 'arquivado' no check constraint. Arquivar não
-- muda nada em documents: os documentos do processo continuam com as mesmas
-- policies de sempre (RLS de documents não olha pra cases.status).

alter table public.cases
  drop constraint if exists cases_status_check;

alter table public.cases
  add constraint cases_status_check
  check (status in ('ativo', 'pausado', 'concluido', 'cancelado', 'arquivado'));

comment on column public.cases.status is
  'Estado macro do processo. "arquivado" (controle de armazenamento, requisito 8) é diferente de "concluido"/"cancelado": marca que a equipe já revisou e guardou o processo — documentos continuam acessíveis normalmente, histórico completo em case_status_history.';
