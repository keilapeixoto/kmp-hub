# 4. Database Architecture

## Convenções (aplicam-se a toda tabela nova, sem exceção)

- **Schema em inglês** (`nome`, `descricao`, `arquivado` são exceção
  proposital — ver nota abaixo), interface em português.
- Toda tabela tem `id uuid primary key default gen_random_uuid()`,
  `created_at timestamptz not null default now()`. Tabelas mutáveis também
  têm `updated_at`, mantida por um trigger `set_updated_at` (genérico, uma
  função reutilizada por todas as tabelas).
- **RLS habilitada desde a migração que cria a tabela** — nunca uma migração
  separada "depois". Uma tabela sem RLS não é aceita em revisão.
- **Nunca excluir dados operacionais.** O padrão é uma coluna
  `arquivado boolean not null default false` (documents, cases,
  service_types) — soft delete, filtra da listagem padrão, nunca remove a
  linha. Removê-la de verdade é uma ação administrativa separada e rara
  (ex.: remoção de usuário via `auth.admin.deleteUser`, que propaga por
  `on delete cascade` deliberadamente).
- **Nomes em português para campos de domínio, inglês para infraestrutura.**
  Isto é uma decisão consciente e já em produção — `nome`, `descricao`,
  `arquivado`, `prazo`, `pasta`, `status_revisao` ficam em português porque
  são exatamente os termos que a documentação de negócio (o plano original)
  usa, e a equipe de produto lê SQL sem tradução mental. Nomes estruturais
  (`id`, `created_at`, `user_id`, `client_id`) ficam em inglês porque são
  convenção universal de Postgres/Supabase. **Não misture os dois dentro do
  mesmo conceito** — se um campo já existe em português num domínio
  (`checklist_items.observacao_equipe`), o campo análogo em outra tabela do
  mesmo domínio segue em português, não vira `notes` por preferência pessoal
  de quem está codando naquele dia.
- **Toda policy de RLS consulta `public.get_user_role()`**, nunca lê o JWT
  diretamente nem duplica lógica de função em cada tabela. Essa é a única
  fonte de verdade sobre "qual é a função deste usuário".
- **Cálculo derivado que precisa estar sempre certo vive em trigger
  `security definer`**, não em Server Action (percentual de checklist, cópia
  do histórico de status, criação da versão inicial de documento).
- **Nenhuma tabela nova sem teste pgTAP de RLS** cobrindo pelo menos: admin
  vê tudo, a função mais restrita não vazia dado de outro dono, e (quando
  aplicável) o cliente não escala privilégio.

## Domínios e tabelas (estado atual)

### Identidade e acesso

| Tabela | Papel |
|---|---|
| `roles` | Lista fechada de 7 funções (admin, director, consultant, operations, finance, partner, client). |
| `profiles` | Um por usuário `auth.users`. `role_id`, `nome`, `idioma`, `ativo`, `telefone`, `cargo`, `foto_url`. Criada automaticamente por trigger `handle_new_user` na criação do `auth.users` (lê `role` de `raw_user_meta_data`). |
| `permissions` | Granularidade fina de permissão além da função (pouco usada hoje — reservada para exceções). |
| `client_access` | Ponte cliente↔usuário de portal e parceiro↔cliente. Uma linha por vínculo, é o que a maioria das policies de RLS de cliente/parceiro faz `join`/`exists` contra. |

**Trigger de guarda**: `prevent_self_role_escalation` bloqueia qualquer
usuário não-admin de mudar o próprio `role_id`/`ativo` — só admin edita a
função/status de outra pessoa (via `profiles_update_admin`).

### Comercial

| Tabela | Papel |
|---|---|
| `leads` | Pipeline Kanban compartilhado entre consultores (decisão de produto: sem dono exclusivo, diferente da matriz de permissão original). |
| `lead_events` | Histórico append-only de mudanças do lead. |
| `clients` | Cliente convertido de lead (ou importado). `consultor_id` define o dono para RLS de função `consultant`. |
| `client_relations` | Dependentes/vínculos familiares do cliente. |
| `identity_documents` | Documentos de identidade (passaporte, RG) — **sem upload de arquivo aqui de propósito**; arquivo real vive só em `documents`/Storage. |

### Processos (o núcleo do produto)

| Tabela | Papel |
|---|---|
| `service_types` | Um "tipo de serviço" = uma **pipeline configurável** (ex.: "Subclass 485 — Couple"). `arquivado` permite descontinuar sem quebrar processos que já usam. |
| `case_stages` | Etapas de uma pipeline, com `ordem` — cada `service_type` define as próprias etapas. |
| `cases` | Um processo = um serviço para um cliente. `status` (ativo/pausado/concluido/cancelado/**arquivado**) é o estado macro; `etapa_id` é a etapa dentro da pipeline. `consultor_id not null` (todo processo tem dono). |
| `case_status_history` | Histórico append-only de mudança de `status`/`etapa_id`, gerado por trigger — nunca escrito manualmente. |

**Por que `service_types` e não `pipelines`?** Nome herdado da seção 4 do
plano original ("tipos de serviço"). Do ponto de vista de arquitetura, é
exatamente o conceito de "pipeline" que um usuário de CRM esperaria — a
interface já usa a palavra "Pipeline" (ver `CLAUDE.md`); o schema mantém o
nome original para não quebrar FKs em produção sem necessidade. Não renomeie
a tabela só por estética — o custo (migração + todo código dependente) não
compensa o ganho.

### Checklists

| Tabela | Papel |
|---|---|
| `checklist_templates` | Um template por `service_type` (via `service_types.checklist_template_id`), reutilizável. |
| `checklist_template_items` | Itens do template: nome, formato esperado, `validade_dias` (informativo), `obrigatorio`, `condicional`. |
| `checklists` | Instância de um template num `case` específico. `percentual` mantido por trigger, nunca editado direto. |
| `checklist_items` | Instância de um item. `nome`/`descricao` são **cópia** (snapshot) do template no momento da criação — continuam existindo mesmo se o template mudar depois. `status` tem 10 valores (nao_solicitado → aprovado). `responsavel`, `prazo` (data), `parent_item_id` (subtarefa — não conta em dobro no percentual, só itens de topo contam). |

### Documentos

| Tabela | Papel |
|---|---|
| `document_categories` | Lista fixa mantida pelo admin (Passaporte, Extrato bancário, etc.). `sensivel=true` marca categorias que nunca podem ser comprimidas automaticamente. |
| `documents` | Um arquivo. `client_id` (dono sempre), `case_id`/`checklist_item_id` (opcionais — nem todo documento nasce de um processo), `categoria_id`, `pasta` (subpasta livre), `status_revisao` (pendente/aprovado/incorreto — complementar ao status do checklist_item, não substitui), `tamanho_bytes`/`formato`/`hash_sha256` (metadados de armazenamento), `arquivado` (soft delete). |
| `document_versions` | Histórico append-only de versões — reenviar um arquivo gera uma nova linha aqui e atualiza `documents.storage_path`. |

**Trigger de integridade**: `validate_document_checklist_item` garante que
`checklist_item_id` referenciado realmente pertence ao mesmo `case_id` do
documento — fechando uma classe de brecha onde a RLS de `client_id` sozinha
não detectaria uma referência cruzada entre processos.

### Formulários de coleta de dados

| Tabela | Papel |
|---|---|
| `case_form_templates` | Um template por `service_type` (`service_types.case_form_template_id`). |
| `case_form_steps` / `case_form_fields` | Etapas e campos do template (tipo: text/textarea/select/date/radio/checkbox). |
| `case_forms` | Instância por processo. `status` (em_preenchimento/enviado/em_analise/aprovado), `enviado_em`. Criada **só no primeiro save** do cliente (não na simples abertura da página). |
| `case_form_responses` | Uma linha por campo respondido. |
| `case_form_views` | Rastreio de "abriu a página, ainda não preencheu" — existe separado de `case_forms` exatamente porque `case_forms` só nasce no primeiro save; sem esta tabela não dava para distinguir "nunca abriu" de "abriu e não fez nada". |

**Trigger de integridade**: `validate_case_form_response_field` garante que
o campo respondido pertence ao mesmo template do formulário — mesmo padrão
de `documents`.

### Tarefas e Agenda

| Tabela | Papel |
|---|---|
| `tasks` / `task_comments` | Tarefa com responsável; comentários em thread. |
| `appointments` / `appointment_summaries` | Compromisso com fuso horário armazenado em UTC (conversão só na interface); resumo pós-consulta obrigatório (regra de produto, não de banco ainda — ver risco em [13](./13-architectural-risks.md)). |

### Biblioteca e Auditoria

| Tabela | Papel |
|---|---|
| `guides` | Guias versionados, editáveis só por admin. |
| `message_templates` | Templates de mensagem com variáveis, copiáveis pela equipe. |
| `timeline_events` | Linha do tempo agregada do cliente (gerada a partir de eventos de outras tabelas). |
| `audit_logs` | Log de ações sensíveis. **Só admin acessa** — nem diretor. |

### Controle de Armazenamento

| Tabela | Papel |
|---|---|
| `storage_settings` | Singleton (`id boolean primary key default true`, `check (id)`) — um único registro de configuração (tamanho máx., formatos permitidos, limite interno, e-mails de alerta). |
| `storage_daily_snapshots` | Um retrato por dia do uso total — base para os gráficos de crescimento 30/90/365 dias sem reprocessar `documents` toda vez. |
| `storage_audit_runs` | Log de cada execução da rotina diária (contagens, nunca conteúdo). |
| `storage_alert_events` | Um alerta de limite (50/70/80/90/100%) cruzado + resultado do envio de e-mail. |

### Gestão de Usuários

Não há tabela própria — `profiles` (Identidade e acesso, acima) já cobre
nome/cargo/telefone/foto/função/ativo. Criação de usuário passa por
`auth.admin.inviteUserByEmail`, nunca um INSERT direto em `profiles`
(a linha nasce via trigger `handle_new_user`).

## Diagrama de relacionamento (simplificado, só as FKs que importam para RLS)

```
auth.users ──1:1── profiles ──N:1── roles
    │
    └──N:1── client_access ──N:1── clients ──N:1── leads
                                       │
                                       ├──1:N── client_relations
                                       ├──1:N── identity_documents
                                       └──1:N── cases ──N:1── service_types ──1:N── case_stages
                                                  │                 │
                                                  │                 └──1:1── checklist_templates ──1:N── checklist_template_items
                                                  │                 └──1:1── case_form_templates  ──1:N── case_form_steps ──1:N── case_form_fields
                                                  ├──1:1── checklists ──1:N── checklist_items (self-FK: parent_item_id)
                                                  ├──1:1── case_forms  ──1:N── case_form_responses
                                                  ├──1:1── case_form_views
                                                  ├──1:N── documents ──1:N── document_versions
                                                  │              └──N:1── document_categories
                                                  ├──1:N── tasks
                                                  ├──1:N── appointments ──1:1── appointment_summaries
                                                  └──1:N── case_status_history
```

## Caminho para multi-tenant (não implementado — ver documento 12)

Nenhuma tabela hoje tem `organization_id`/`tenant_id`. A decisão consciente
foi **não adicionar isso especulativamente antes de haver um segundo
cliente real** — adicionar uma coluna de tenant a ~25 tabelas e reescrever
toda policy de RLS para incluir `and organization_id = current_organization()`
é um trabalho mecânico e bem entendido; fazer isso agora, sem um segundo
tenant real para validar o modelo, arriscaria errar a modelagem por falta de
caso de uso concreto. O documento 12 detalha a estratégia de migração quando
esse momento chegar (isolamento por RLS com `organization_id`, não por
schema/banco separado — mais barato de operar em escala).

### Regra arquitetural vinculante: quais entidades ganham `organization_id`

Esta regra **já vale hoje para decisões de design**, mesmo que a coluna em
si não seja adicionada agora: **nenhuma tabela nova deve ser modelada de um
jeito que impeça adicionar `organization_id` depois sem quebrar a semântica
existente.** Na migração multi-tenant (documento 12), toda entidade que
representa dado **pertencente a uma empresa cliente específica** ganha
`organization_id uuid not null references organizations(id)`. Mapeamento
entre os termos genéricos de SaaS e as tabelas reais deste projeto:

| Conceito genérico | Tabela(s) real(is) neste projeto | Ganha `organization_id`? |
|---|---|---|
| `users` | `profiles` (todo usuário — equipe **e** cliente de portal) | Sim |
| `clients` | `clients`, `client_relations`, `identity_documents` | Sim |
| `processes` | `cases`, `case_status_history` | Sim |
| `documents` | `documents`, `document_versions`, `document_categories` | Sim — inclusive `document_categories`, que hoje é uma lista global única; no modelo multi-tenant, categorias padrão continuam existindo como um conjunto "semente" copiado por organização, mas cada organização pode ter as próprias. |
| `pipelines` | `service_types`, `case_stages` | Sim |
| `checklists` | `checklist_templates`, `checklist_template_items`, `checklists`, `checklist_items` | Sim |
| `forms` | `case_form_templates`, `case_form_steps`, `case_form_fields`, `case_forms`, `case_form_responses`, `case_form_views` | Sim |
| `invoices` | Não existe ainda (Fase 3) | Sim, desde a primeira migração que criar essas tabelas — nasce **já** com `organization_id`, nunca como retrofit. |
| `notes` | Campos livres como `cases.riscos`, `checklist_items.observacao_equipe/observacao_cliente` | Indiretamente — herdam o isolamento da tabela-pai (`cases`, `checklist_items`), não precisam de coluna própria. |
| `activities` | `lead_events`, `case_status_history`, `timeline_events`, `audit_logs` | Sim |
| `automations` | Não existe ainda (Fase 2) | Sim, desde a primeira migração. |
| — | `leads`, `tasks`, `task_comments`, `appointments`, `appointment_summaries`, `guides`, `guide_versions`, `message_templates`, `client_access` | Sim (todas representam dado de uma empresa específica). |
| — | `storage_settings`, `storage_daily_snapshots`, `storage_audit_runs`, `storage_alert_events` | Sim — hoje `storage_settings` é singleton global; no multi-tenant vira uma linha por organização (chave primária composta ou `organization_id` + unique). |
| — | `roles`, `permissions` | **Não** — são vocabulário fixo do sistema, compartilhado por todas as organizações. |
| — | `document_categories` (conjunto "semente") | Ambíguo por design — ver nota na linha `documents` acima: existe uma versão global (template) e versões por organização (cópia customizável). |

**Regra de decisão para toda tabela nova a partir de agora**: ao desenhar
uma tabela, pergunte "isso pertence a uma empresa cliente, ou é vocabulário
do sistema compartilhado por todas?". Se a resposta for "pertence a uma
empresa", desenhe pensando que uma coluna `organization_id` será adicionada
depois sem drama — ou seja, não crie `unique` constraints que assumiriam
unicidade **global** quando deveriam ser únicas **por organização** (ex.: um
`unique(nome)` em `service_types` hoje é global; no multi-tenant precisaria
virar `unique(organization_id, nome)` — ao criar uma constraint de
unicidade nova, já pense nesses termos, mesmo sem a coluna existir ainda).

**Não alterar o banco agora só para adicionar essas colunas.** Esta seção é
regra de design para decisões futuras, não uma tarefa pendente de
implementação — a implementação real acontece só quando o gatilho descrito
em [12 — Future Scalability](./12-future-scalability.md) (segundo cliente
real do produto) existir.
