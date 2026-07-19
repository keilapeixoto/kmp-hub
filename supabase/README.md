# Supabase — KMP Hub

Migrações do KMP Hub, entregues sprint a sprint (seção 10 do plano).

## Sprint 1 — Identidade e acesso (seção 4 do plano)

Já aplicadas com sucesso no projeto Supabase de desenvolvimento.

- `migrations/20260710120000_identity_access_schema.sql` — tabelas `roles`,
  `profiles`, `permissions`, `client_access`; função `get_user_role()`; trigger
  `handle_new_user` (cria o profile ao criar um usuário em `auth.users`); trigger
  `prevent_self_role_escalation` (ninguém muda a própria `role_id`/`ativo` exceto admin).
- `migrations/20260710121000_identity_access_rls.sql` — RLS ativado nas 4 tabelas,
  políticas seguindo a matriz de permissões da seção 5 (módulo "Equipe/Config":
  admin gestão total, diretor leitura, demais funções sem acesso).
- `seed.sql` — insere as 7 funções (`admin`, `director`, `consultant`, `operations`,
  `finance`, `partner`, `client`).
- `tests/database/001_identity_access_rls.test.sql` — testes pgTAP simulando um
  usuário de cada função e checando o que cada um consegue ler/escrever.

## Sprint 2 — Leads (seção 4 do plano, fluxo comercial da seção 3)

Já aplicadas com sucesso no projeto Supabase de desenvolvimento.

- `migrations/20260711130000_leads_schema.sql` — tabelas `leads` e `lead_events`;
  trigger `log_lead_event` gera o histórico automático (criação, mudança de
  status, reatribuição de consultor).
- `migrations/20260711131000_leads_rls.sql` — RLS seguindo a matriz da seção 5
  (módulo "Leads"): admin/diretor gestão total, consultor só nos próprios leads
  (leitura + escrita, sem exclusão), demais funções sem acesso. **Substituída
  em parte pela migração seguinte.**
- `migrations/20260711140000_leads_rls_consultores_compartilhado.sql` —
  **decisão do cliente, diverge da seção 5**: qualquer consultor vê e edita
  leads de qualquer outro consultor, não só os próprios ("não tem problema um
  ver a lead do outro"). Substitui as políticas `*_own_consultant` da migração
  anterior por políticas sem filtro de `consultor_id`. Operations/finance/
  partner/client continuam sem nenhum acesso; exclusão continua só para
  admin/diretor.
- `tests/database/002_leads_rls.test.sql` — testes pgTAP já atualizados para a
  visibilidade compartilhada (refletem o estado depois das três migrações
  acima).

**Decisão assumida — pipeline de 10 status**: o plano não lista as 10 etapas do
funil de leads (só cita as "9 etapas" do CRM antigo, seção 0, e "10 status" dos
itens de checklist, seção 4 — conceito diferente). Usei uma lista provisória em
`leads.status` (CHECK constraint) e em `lib/leads/constants.ts`:
`novo → contato_iniciado → qualificacao → consulta_agendada →
consulta_realizada → proposta_enviada → negociacao → aguardando_decisao →
convertido/perdido`. Trocar os nomes é uma migração pequena (`ALTER TABLE ...
DROP CONSTRAINT ... ADD CONSTRAINT ...` + atualizar o array em
`constants.ts`) — sem risco para dados existentes.

## Sprint 3 — Clientes, dependentes e documentos de identidade (seção 4 do plano)

**Ainda não aplicadas** — aplicar no SQL Editor do projeto de dev, nesta ordem,
antes de testar as telas de `/clientes`.

- `migrations/20260712120000_clients_schema.sql` — tabelas `clients`,
  `client_relations` (dependentes — cada um é um `clients` completo, só o
  vínculo e o tipo ficam aqui) e `identity_documents`; adiciona a FK
  `client_access.client_id → clients(id)` que ficou pendente desde o Sprint 1.
- `migrations/20260712121000_clients_rls.sql` — RLS seguindo a seção 5
  (módulos "Clientes" e "Documentos"): admin/diretor gestão total, consultor
  só nos próprios clientes (**sem** a visibilidade compartilhada que você
  pediu para leads — avise se quiser o mesmo aqui), parceiro/cliente via
  `client_access`. Operations/finance ficaram sem policy: a matriz pede "R
  autorizados"/"R necessário", mas a tabela que definiria quem é autorizado
  (equipe do processo) só existe a partir do Sprint 4.
- `migrations/20260712122000_convert_lead_to_client.sql` — function
  `convert_lead_to_client(p_lead_id)`: cria o cliente e marca o lead como
  convertido numa única transação. Escopo do Sprint 3: só isso — processo,
  checklist, tarefas, financeiro e convite do portal (que a seção 3 também
  lista na conversão) chegam junto com cada um desses módulos.
- `migrations/20260712123000_add_client_dependent.sql` — function
  `add_client_dependent(p_client_id, p_nome, p_tipo)`: cria o cliente-dependente
  e o vínculo em `client_relations` numa única transação.
- `tests/database/003_clients_rls.test.sql` — testes pgTAP cobrindo conversão,
  visibilidade por função, `client_access` (parceiro/cliente) e arquivamento
  de documentos.

**Soft delete em identity_documents**: seguindo a convenção do CLAUDE.md
("documentos: soft delete apenas... só admin acessa arquivados"), arquivar um
documento (`arquivado = true`) o esconde de todo mundo, inclusive diretor —
só admin continua vendo. Não há exclusão permanente pela UI.

## Sprint 4 — Processos: tipos de serviço, etapas configuráveis, histórico (seção 4 do plano)

**Ainda não aplicadas** — aplicar no SQL Editor do projeto de dev, nesta ordem,
antes de testar `/processos` e `/configuracoes/servicos`.

- `migrations/20260713120000_cases_schema.sql` — tabelas `service_types`,
  `case_stages` (etapas configuráveis por tipo de serviço, com `regras` jsonb
  para a automação "criar tarefa e notificar ao mudar de etapa" da seção 6 —
  só armazenada, a execução depende de tasks/notifications dos Sprints 6/7),
  `cases` (`status` macro + `etapa_id` dentro do pipeline do service_type são
  colunas separadas) e `case_status_history`; trigger `log_case_status_change`
  gera o histórico automático. `guia_id`/`checklist_template_id` em
  `service_types` ficam sem FK até guides (Sprint 7) e checklist_templates
  (Sprint 5) existirem.
- `migrations/20260713121000_cases_rls.sql` — RLS seguindo a seção 5 (módulos
  "Processos" e "Templates" para service_types/case_stages): admin/diretor
  gestão total, consultor nos próprios (**sem compartilhamento**, mesma
  decisão do Sprint 3), operacional só nos processos em que está na
  `equipe` (array de `auth.users` na própria tabela `cases`), financeiro lê
  tudo, parceiro/cliente via `client_access`. Fecha o pendente do Sprint 3:
  agora que `cases.equipe` existe, adiciona a leitura de `clients`/
  `identity_documents` para operacional autorizado.
- `migrations/20260713122000_list_team_members.sql` — function
  `list_team_members()`: diretório de consultores + operacionais para o
  seletor de equipe do processo (mesmo padrão de `list_consultants()` do
  Sprint 2).
- `tests/database/004_cases_rls.test.sql` — testes pgTAP cobrindo o histórico
  automático (status e etapa), visibilidade por função e acesso via `equipe`.

**Decisão assumida — consultor não compartilha processos**: segui o mesmo
padrão do Sprint 3 (não o de leads). Avise se quiser mudar.

## Sprint 5 — Checklists e documentos (seção 4 do plano)

**Ainda não aplicadas** — aplicar no SQL Editor do projeto de dev, nesta
ordem, antes de testar o checklist em `/processos/[id]` e a aba de
templates em `/configuracoes/servicos/[id]`.

- `migrations/20260714120000_checklists_schema.sql` — tabelas
  `checklist_templates`, `checklist_template_items`, `checklists`,
  `checklist_items`; trigger `instantiate_checklist_items` copia os itens do
  template ao criar um checklist; trigger `recalculate_checklist_percentual`
  mantém `checklists.percentual` sempre em sincronia com o status dos itens.
  Adiciona a FK `service_types.checklist_template_id → checklist_templates(id)`
  pendente desde o Sprint 4.
- `migrations/20260714130000_documents_schema.sql` — cria o bucket privado
  `documents` no Storage e as tabelas `documents`/`document_versions`;
  trigger `create_initial_document_version` grava a versão 1 automaticamente.
- `migrations/20260714121000_checklists_rls.sql` e
  `migrations/20260714131000_documents_rls.sql` — RLS seguindo a seção 5
  (módulos "Checklists" e "Documentos"), incluindo políticas no próprio
  `storage.objects` (o caminho no bucket é `client_id/case_id/arquivo`, e as
  políticas usam `storage.foldername(name)` para checar o `client_id` do
  primeiro segmento). Financeiro fica sem acesso a documentos por enquanto —
  "R vinculados" da matriz dependeria de invoices (Fase 3).
- `tests/database/005_checklists_documents_rls.test.sql` — testes pgTAP
  cobrindo a instanciação do checklist, o recálculo do percentual, a
  visibilidade por função e o arquivamento de documentos.

**Decisão assumida — pipeline de 10 status dos itens de checklist**: o plano
só diz "não solicitado → aprovado, 10 status" sem listar os 8 do meio. Lista
provisória em `lib/checklists/constants.ts`: `nao_solicitado → solicitado →
aguardando_cliente → enviado → em_analise → rejeitado → reenvio_solicitado →
reenviado → aguardando_aprovacao → aprovado`. Mesma observação de sempre:
trocar os nomes é uma migração pequena.

**Sem upload real de arquivo até agora** — este sprint é o primeiro que
efetivamente sobe arquivo pro Storage (bucket `documents`, privado). As
URLs de download são assinadas com 5 minutos de validade
(`lib/documents/data.ts`), geradas a cada carregamento da página — não ficam
guardadas em lugar nenhum.

## Sprint 6 — Tarefas e agenda (seção 4 do plano)

**Ainda não aplicadas** — aplicar no SQL Editor do projeto de dev, nesta
ordem, antes de testar `/tarefas` e `/agenda`.

- `migrations/20260717120000_tasks_appointments_schema.sql` — tabelas `tasks`
  (com `criado_por`, necessário para a regra "próprias + criadas" da seção 5),
  `task_comments` (append-only), `appointments` (tudo em UTC; conversão
  BR/Sydney/Brisbane só na interface) e `appointment_summaries` (resumo
  obrigatório pós-consulta — obrigatoriedade aplicada pela UI via alerta);
  function `list_staff_members()` para o seletor de responsável.
- `migrations/20260717121000_tasks_appointments_rls.sql` — RLS seguindo a
  matriz da seção 5. Ponto crítico: `appointment_summaries` contém `riscos`
  (nota interna) e **não tem nenhuma política para client/partner** — cliente
  vê o próprio compromisso, nunca o resumo (seção 8, risco 2).
- `tests/database/006_tasks_appointments_rls.test.sql` — testes pgTAP,
  incluindo o teste de que o cliente vê o compromisso mas não o resumo.

## Sprint 7 — Guias, templates de mensagem, timeline e auditoria (seções 4/8/15/20/22)

**Ainda não aplicada** — um arquivo único
(`migrations/20260717140000_guides_templates_audit.sql`, schema + RLS juntos):

- `guides`/`guide_versions` — guias internos versionados: editar o conteúdo
  arquiva a versão anterior automaticamente (trigger `save_guide_version`).
  Adiciona a FK `service_types.guia_id` pendente do Sprint 4. Guia arquivado:
  só admin vê.
- `message_templates` — templates com variáveis `{{nome_cliente}}`; envio
  manual por cópia na Fase 1.
- `timeline_events` — eventos explícitos de linha do tempo; a timeline da
  Fase 1 agrega também as tabelas de histórico já existentes.
- `audit_logs` + function `audit()` — trigger de auditoria em TODAS as
  tabelas principais (19 tabelas), append-only, **só admin lê**; ninguém
  edita (sem política de update/delete; escrita só pelo trigger SECURITY
  DEFINER).
- `tests/database/007_guides_templates_audit_rls.test.sql` — testes pgTAP.

## Variáveis de ambiente

Este projeto usa o formato novo de chaves do Supabase (Settings > API Keys):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) — substitui a antiga anon key.
- `SUPABASE_SECRET_KEY` (`sb_secret_...`) — **somente servidor**, substitui a antiga
  service role key.

Ver `.env.example` na raiz do repositório para o nome exato de cada variável.

## Rodando os testes de permissão

**Sem instalar nada** — abra o projeto de dev no painel Supabase, vá em SQL
Editor, cole o conteúdo de um dos arquivos em `tests/database/` (`001_...`
identidade/acesso, `002_...` leads, `003_...` clientes, `004_...` processos,
`005_...` checklists/documentos — cada um só depois de aplicar as migrações
do sprint correspondente) e rode. Cada arquivo roda dentro de um
`begin ... rollback`, então os usuários e dados de teste que ele cria somem
ao final; nada fica gravado no banco. O resultado de cada
`select is(...)`/`throws_ok(...)` aparece como uma linha de saída
(`ok 1 - ...` / `not ok 2 - ...`).

**Com Supabase CLI + Docker instalados**:

```
supabase test db
```

Isso recria o banco do zero a partir das migrações + seed (num Postgres local
descartável, não no projeto de dev) e roda todos os arquivos em
`tests/database/`.
