# KMP Hub — Plano de Arquitetura e Desenvolvimento

**Versão 1.0 · Julho 2026 · Preparado para KMP Consulting**

Este documento responde à seção 33 do briefing: arquitetura, mapa de páginas, fluxos dos usuários, modelo do banco de dados, matriz de permissões, lista de funcionalidades da Fase 1, wireframes das principais telas, riscos técnicos, integrações necessárias e plano de desenvolvimento.

---

## 0. Decisão inicial: evoluir o CRM atual ou começar limpo

Já existe um CRM da KMP Consulting em Next.js + Supabase + Vercel, com pipeline Kanban de 9 etapas e 11 subclasses de visto, apontando para crm.kmpconsulting.com.au.

**Recomendação: novo repositório e novo schema, mesma conta Supabase e mesmo domínio.**

Motivos:

1. O KMP Hub exige um modelo de permissões por função implementado no banco (Row Level Security) desde a primeira migração. Adaptar RLS a um schema existente costuma gerar brechas silenciosas.
2. O escopo cresceu de pipeline comercial para plataforma operacional completa. O modelo de dados novo (processos, checklists, documentos versionados, auditoria) é estruturalmente diferente.
3. Os dados atuais do Kanban podem ser migrados com um script simples ao final da Fase 1 (leads e clientes mapeiam diretamente para as novas tabelas).

O domínio crm.kmpconsulting.com.au passa a apontar para o novo projeto quando a Fase 1 estiver validada.

---

## 1. Arquitetura do sistema

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel (hosting)                    │
│  ┌──────────────────────┐   ┌─────────────────────────┐ │
│  │   App da Equipe       │   │   Portal do Cliente     │ │
│  │   Next.js App Router  │   │   mesmas rotas, layout  │ │
│  │   /app/(staff)/...    │   │   /app/(portal)/...     │ │
│  └──────────┬───────────┘   └───────────┬─────────────┘ │
│             │        Server Actions      │               │
└─────────────┼────────────────────────────┼───────────────┘
              │                            │
┌─────────────▼────────────────────────────▼───────────────┐
│                        Supabase                           │
│  Auth (e mail + senha, MFA TOTP, magic link p/ cliente)  │
│  PostgreSQL com Row Level Security em todas as tabelas   │
│  Storage (bucket privado por cliente, URLs assinadas)    │
│  Edge Functions (automações, lembretes, webhooks)        │
│  pg_cron (alertas de vencimento, processos parados)      │
└─────────────┬────────────────────────────────────────────┘
              │
   Integrações externas (Fases 2 a 4)
   Google Calendar API · Resend (e mail) · Stripe · Xero
   WhatsApp Business API (estrutura preparada, sem envio)
```

**Princípios**

- Um único projeto Next.js com dois grupos de rotas: `(staff)` e `(portal)`. Isso evita duplicação de componentes e mantém um só deploy.
- Toda regra de permissão vive no banco via RLS. A interface apenas esconde o que o usuário não pode ver; o banco garante que ele não consegue acessar mesmo que tente.
- Server Actions para toda escrita de dados. Nenhuma mutação direta do cliente para o banco.
- Documentos em bucket privado do Supabase Storage, organizados por `cliente_id/processo_id/`, acessados somente por URLs assinadas com validade curta.
- Ambientes separados: projeto Supabase de desenvolvimento e de produção, com branch preview na Vercel.
- Idiomas com next-intl: dicionários pt e en, idioma da equipe independente do idioma do portal (campo `idioma_preferencial` no perfil do cliente).

**Identidade visual**: Cormorant Garamond para títulos, Outfit para corpo, laranja #F27B20, grafite #2C2C2C, fundo #F8F7F5, sem emoji na interface.

---

## 2. Mapa de páginas

### App da equipe `(staff)`

```
/login
/dashboard                      Dashboard por função
/leads                          Lista + pipeline Kanban
/leads/[id]                     Detalhe do lead
/clientes                       Lista com filtros e busca
/clientes/[id]                  Perfil completo (abas)
   ├── resumo · dados · documentos · processos
   ├── formulários · agenda · financeiro
   └── comunicações · tarefas · notas · linha do tempo
/processos                      Lista + Kanban por etapa
/processos/[id]                 Detalhe do processo (abas)
/agenda                         Calendário com fusos BR/SYD/BNE
/tarefas                        Lista, calendário, por responsável
/documentos                     Busca global de documentos
/guias                          Biblioteca interna de procedimentos
/guias/[id]                     Guia com versão e histórico
/financeiro/propostas           (Fase 3)
/financeiro/invoices            (Fase 3)
/relatorios                     (Fases 3 e 4)
/templates                      Checklists, mensagens, formulários
/equipe                         Usuários e funções (admin)
/configuracoes                  Status, etapas, automações (admin)
/busca?q=                       Busca global
```

### Portal do cliente `(portal)`

```
/portal/login                   Magic link ou senha
/portal                         Página inicial (andamento, pendências)
/portal/documentos              Enviados + pendentes + correções
/portal/formularios/[id]        Preenchimento com salvamento parcial
/portal/agenda                  Compromissos + agendamento
/portal/propostas               (Fase 3)
/portal/pagamentos              (Fase 3)
/portal/mensagens               (Fase 2)
/portal/perfil                  Dados autorizados para edição
```

---

## 3. Fluxos dos usuários

**Fluxo comercial (lead → cliente)**

1. Lead cadastrado manualmente ou via formulário público.
2. Consultor registra contatos; sistema alerta se o lead ficar parado além do prazo configurado.
3. Consulta agendada e realizada; consultor registra resumo obrigatório.
4. Conversão: o sistema cria em uma única transação o cliente, o serviço contratado, o processo, a pasta de documentos, o checklist a partir do template, as tarefas iniciais, o registro financeiro e o convite para o portal. Nenhum dado do lead é digitado novamente.

**Fluxo operacional (processo)**

1. Processo criado com tipo de serviço, responsável e etapa inicial.
2. Cliente recebe formulário inicial; respostas alimentam os campos do perfil automaticamente.
3. Checklist liberado; cliente envia documentos pelo portal; cada upload vincula ao item do checklist.
4. Equipe aprova ou rejeita com motivo; cliente é notificado e corrige.
5. Mudanças de etapa disparam regras configuradas (enviar checklist, criar tarefa de revisão, alertar responsável).
6. Encerramento: pesquisa de satisfação e arquivamento conforme retenção.

**Fluxo do cliente no portal**

Login por magic link → página inicial mostra etapa atual em linguagem simples, pendências e próximos compromissos → cliente resolve pendências (formulário, documento, pagamento) → recebe notificações a cada atualização relevante. Notas internas, riscos e avaliações da equipe nunca aparecem no portal.

**Fluxo do administrador**

Configura funções e permissões → cadastra tipos de serviço com etapas e regras → edita guias internos versionados → monta templates de checklist, mensagens e formulários → acompanha auditoria.

---

## 4. Modelo do banco de dados

Todas as tabelas com `id uuid`, `created_at`, `updated_at`, e RLS ativado. Nomes em inglês no schema (convenção técnica), interface em português.

**Identidade e acesso**

| Tabela | Campos principais | Relações |
|---|---|---|
| profiles | user_id (auth), nome, função, idioma, ativo | 1:1 auth.users |
| roles | nome (admin, director, consultant, operations, finance, partner, client) | |
| permissions | role_id, módulo, ação (read/write/manage) | N:1 roles |
| client_access | partner_id ou client_user_id, client_id | acesso granular |

**Comercial**

| Tabela | Campos principais |
|---|---|
| leads | nome, telefone, e mail, rede social, país, cidade, origem, serviço de interesse, consultor_id, status, último contato, próxima ação, observações |
| lead_events | lead_id, tipo, descrição, autor (histórico automático) |

**Clientes e processos**

| Tabela | Campos principais |
|---|---|
| clients | dados pessoais, contato, país, fuso, idioma, situação, objetivos, consultor_id, lead_id de origem |
| dependents / client_relations | client_id, related_client_id, tipo (cônjuge, filho, pai) — cada pessoa tem cadastro próprio |
| identity_documents | client_id, tipo (passaporte etc), número, validade (gera alerta de vencimento) |
| histories | client_id, categoria (acadêmico, profissional, vistos), dados estruturados |
| service_types | nome, descrição, etapas padrão, guia_id, checklist_template_id |
| cases (processos) | client_id, service_type_id, consultor_id, equipe, início, prazo, status, etapa, prioridade, riscos, próxima ação |
| case_stages | service_type_id, ordem, nome, regras (JSON de automação) |
| case_status_history | case_id, de, para, autor, data |

**Checklists e documentos**

| Tabela | Campos principais |
|---|---|
| checklist_templates | nome, service_type_id |
| checklist_template_items | nome, descrição, exemplo, formato, validade, obrigatório, condicional |
| checklists | case_id, template_id, percentual (calculado) |
| checklist_items | checklist_id, status (não solicitado → aprovado, 10 status), responsável, observação equipe, observação cliente, motivo rejeição |
| documents | client_id, case_id, checklist_item_id, categoria, storage_path, enviado_por, analisado_por, validade, arquivado (soft delete, só admin acessa arquivados) |
| document_versions | document_id, versão, storage_path, data |

**Operação**

| Tabela | Campos principais |
|---|---|
| tasks | título, descrição, client_id, case_id, responsável, participantes, prioridade, prazo, status, dependência_id |
| task_comments | task_id, autor, texto, anexo |
| appointments | client_id/lead_id/case_id, tipo, início, fim, fusos exibidos, google_event_id, lembretes |
| appointment_summaries | appointment_id, resumo, decisões, riscos, documentos solicitados, próximos passos, próximo acompanhamento |
| forms | nome, versão pt, versão en, schema JSON (campos, condicionais, obrigatórios) |
| form_responses | form_id, client_id, respostas JSON, status (parcial/completo), mapeamento para campos do perfil |
| guides | service_type_id, conteúdo estruturado, versão, atualizado_por, status ativo/arquivado |
| guide_versions | guide_id, versão, conteúdo, autor, data |

**Comunicação e financeiro (estrutura na Fase 1, uso nas Fases 2 e 3)**

| Tabela | Campos principais |
|---|---|
| messages | client_id, canal, remetente, destinatário, assunto, conteúdo, status envio |
| message_templates | nome, canal, idioma, corpo com variáveis {{nome_cliente}} etc |
| proposals / proposal_items | client_id, serviço, escopo, valores, moeda, validade, status, aceite |
| invoices / invoice_items / payments | numeração automática, AUD/BRL, vencimento, status (8 status), comprovante |

**Transversal**

| Tabela | Campos principais |
|---|---|
| timeline_events | entidade (client/case/lead), entidade_id, tipo, descrição, autor — alimenta a linha do tempo |
| notifications | user_id ou client_id, tipo, lida, link |
| automations | gatilho, condição, ação, ativa, histórico de execução |
| audit_logs | tabela via trigger em todas as mutações; append only, nenhum usuário edita |

---

## 5. Matriz de permissões

R = leitura · E = escrita · G = gestão total · A = apenas atribuídos · — = sem acesso

| Módulo | Admin | Diretor | Consultor | Operacional | Financeiro | Parceiro | Cliente |
|---|---|---|---|---|---|---|---|
| Leads | G | G | A (E) | — | — | — | — |
| Clientes | G | G | A (E) | R autorizados | R necessário | R compartilhados | próprio perfil |
| Processos | G | G | A (E) | E autorizados | R | R compartilhados | andamento simplificado |
| Documentos | G | G | A (E) | E autorizados | R vinculados | R compartilhados | próprios + upload |
| Checklists | G | G | A (E) | E | — | R | próprios (status) |
| Tarefas | G | G | próprias + criadas | próprias | próprias | — | — |
| Agenda | G | G | própria + clientes | própria | própria | — | próprios compromissos |
| Guias internos | G (edita) | R | R | R | R | — | — |
| Templates | G | R | R | R | R | — | — |
| Propostas/Invoices | G | R | R dos seus clientes | — | G | — | próprias |
| Relatórios | G | G | próprios números | — | financeiros | — | — |
| Equipe/Config | G | R | — | — | — | — | — |
| Auditoria | G | — | — | — | — | — | — |
| Notas internas | G | G | A | autorizados | — | — | **nunca** |

Implementação: função `get_user_role()` no Postgres + políticas RLS por tabela. Consultores filtrados por `consultor_id = auth.uid()` ou participação na equipe do processo. Clientes filtrados por `client_id` vinculado ao usuário de auth. Notas internas e riscos em colunas/tabelas separadas com política que exclui a função client em qualquer condição.

---

## 6. Funcionalidades da Fase 1 (CRM interno)

1. Autenticação com e mail e senha, MFA opcional, sessões com expiração.
2. Gestão de usuários e funções pelo administrador.
3. RLS completo desde a primeira migração.
4. Leads: cadastro, lista, pipeline Kanban, filtros, alertas de inatividade, histórico automático.
5. Conversão de lead em cliente com criação transacional de todos os registros.
6. Perfil completo do cliente com abas e dependentes vinculados.
7. Processos com etapas configuráveis por tipo de serviço, histórico de status e regras básicas (criar tarefa e notificar ao mudar de etapa).
8. Templates de checklist e checklists por processo com os 10 status e percentual de conclusão.
9. Upload interno de documentos com versões, validade, alerta de vencimento e arquivamento (sem exclusão permanente).
10. Tarefas com prioridade, prazo, dependência, comentários e visão de carga da equipe.
11. Agenda interna com fusos BR/Sydney/Brisbane e resumo obrigatório após consulta (integração Google Calendar entra na Fase 2).
12. Guias internos versionados, editáveis pelo admin sem código.
13. Templates de mensagens com variáveis (envio manual por cópia nesta fase).
14. Dashboard básico por função.
15. Linha do tempo por cliente, lead e processo + log de auditoria.
16. Busca global respeitando permissões.
17. Interface pt/en, responsiva, com identidade KMP.
18. Dados de demonstração (5 leads, 5 clientes, processos em etapas variadas).

Fora da Fase 1 por decisão: portal do cliente, formulários públicos, propostas, invoices, integrações externas e IA.

---

## 7. Wireframes das principais telas

**Dashboard (diretor)**

```
┌ KMP Hub ─ busca global ─────────────── sino · perfil ┐
│ nav lateral: Dashboard Leads Clientes Processos      │
│              Agenda Tarefas Documentos Guias ...     │
├──────────────────────────────────────────────────────┤
│ [Novos leads 12] [Conversão 34%] [Clientes ativos 47]│
│ [Processos parados 3 ⚠] [Tarefas vencidas 5 ⚠]       │
├───────────────────────────┬──────────────────────────┤
│ Processos por etapa       │ Atendimentos de hoje     │
│ (barras por status)       │ 10:00 Ana P. · Consulta  │
│                           │ 14:30 J. Lemos · Follow  │
├───────────────────────────┼──────────────────────────┤
│ Carga da equipe (barras)  │ Documentos pendentes (8) │
└───────────────────────────┴──────────────────────────┘
```

**Perfil do cliente**

```
┌ ← Clientes │ Maria Santos · Brasil · GMT-3 · PT      │
│ Consultor: Keila │ Situação: Documentação │ ⚠ 2      │
├ Resumo │ Dados │ Docs │ Processos │ Agenda │ $ │ ... ┤
│ ┌ Serviços ativos ┐ ┌ Próximos compromissos ┐        │
│ │ Subclass 500    │ │ 15 jul · Revisão docs │        │
│ │ Etapa: Docs 60% │ └───────────────────────┘        │
│ └─────────────────┘ ┌ Pendências ┐                   │
│ ┌ Linha do tempo ─┐ │ ⚠ Passaporte vence em 90 dias  │
│ │ hoje · doc aprov│ │ ⚠ 3 docs aguardando cliente    │
│ │ 8 jul · etapa → │ └────────────────────────────────┘
└─────────────────────────────────────────────────────┘
```

**Pipeline de leads**

```
│ Filtros: consultor · serviço · origem · país · período│
├─ Novo ──┬─ Contato ─┬─ Consulta ─┬─ Proposta ─┬─ ... ┤
│ ┌card┐  │ ┌card┐    │ ┌card┐     │            │      │
│ │Ana │  │ │João│⚠14d│ │Rita│     │  (arrastar │      │
│ │500 │  │ │485 │    │ │600 │     │   e soltar)│      │
│ └────┘  │ └────┘    │ └────┘     │            │      │
```

**Detalhe do processo**

```
┌ Subclass 482 SE · Lucas V. + Karla T. · Prioridade alta│
│ Etapa: Documentos parciais ●●●○○○ │ Próxima ação: ... │
├ Checklist │ Tarefas │ Docs │ Notas │ Prazos │ Histórico┤
│ ✓ Certidão casamento      Aprovado                    │
│ ⟳ Extratos conjuntos      Em análise                  │
│ ✗ Declaração família      Rejeitado → motivo visível  │
│ ○ Fotos do relacionamento Aguardando cliente          │
│ ▓▓▓▓▓▓░░░░ 60% completo                               │
└───────────────────────────────────────────────────────┘
```

Posso gerar mockups visuais navegáveis dessas telas com a identidade KMP como próximo passo, antes de codar.

---

## 8. Riscos técnicos

1. **RLS mal configurado é o maior risco do projeto.** Mitigação: testes automatizados de permissão por função em cada tabela, rodando no CI antes de qualquer deploy.
2. **Vazamento de notas internas para o portal.** Mitigação: notas e riscos em tabelas separadas sem nenhuma política para a função client, mais teste específico.
3. **Documentos sensíveis.** Mitigação: bucket privado, URLs assinadas de curta duração, nunca URLs públicas, log de acesso a documentos.
4. **Escopo extenso.** O briefing completo tem mais de 30 módulos. Mitigação: fases rígidas; nada da Fase 2 entra antes da Fase 1 validada em uso real.
5. **Formulários dinâmicos com campos condicionais** (construtor sem código) são a parte mais complexa da Fase 2. Mitigação: schema JSON padronizado desde a Fase 1 para que form_responses já alimente o perfil.
6. **Automações configuráveis** podem gerar loops ou envios indevidos. Mitigação: histórico de execução, botão de pausa e revisão humana obrigatória para mensagens sensíveis (já previsto no briefing).
7. **Migração do CRM atual.** Mitigação: script único de importação de leads e clientes, executado uma vez, com validação manual.
8. **Fusos horários.** Tudo em UTC no banco; conversão só na interface (BR, Sydney, Brisbane e fuso do cliente).

---

## 9. Integrações

| Integração | Fase | Uso |
|---|---|---|
| Supabase Auth + Storage | 1 | base de tudo |
| Resend ou similar (e mail transacional) | 2 | notificações, magic link do portal |
| Google Calendar API | 2 | sincronizar agenda da equipe |
| Web3Forms (formulários públicos atuais) | 2 | leads dos formulários existentes entram direto no pipeline |
| Stripe | 3 | links de pagamento AUD |
| Xero | 3 | conciliação contábil |
| WhatsApp Business API oficial | 4 | estrutura de messages já preparada |
| Anthropic API (resumos, extração de docs) | 4 | sempre com validação humana e conteúdo marcado como gerado por IA |

---

## 10. Plano de desenvolvimento da Fase 1

| Sprint | Entrega | Critério de aceite |
|---|---|---|
| 1 | Setup: repositório, Supabase dev/prod, migrações base, auth, funções, RLS inicial, layout com identidade KMP | login funciona, admin cria usuários, testes de permissão passam |
| 2 | Leads: CRUD, pipeline Kanban, filtros, histórico, alertas de inatividade | seção 3 do briefing completa |
| 3 | Clientes: conversão transacional, perfil com abas, dependentes, documentos de identidade com alerta de validade | seções 4 e 5 completas |
| 4 | Processos: tipos de serviço, etapas configuráveis, histórico de status, regras básicas | seções 6 e 7 (parte configurável) |
| 5 | Checklists e documentos: templates, 10 status, percentual, upload com versões e arquivamento | seções 9 e 10 (parte interna) |
| 6 | Tarefas e agenda: visões, carga da equipe, resumo obrigatório pós consulta | seções 13 (interna) e 14 |
| 7 | Guias, templates de mensagem, dashboard, linha do tempo, auditoria, busca global | seções 8, 15 (templates), 18, 20, 22 |
| 8 | Dados de demonstração, testes dos 17 critérios de qualidade (seção 32), migração do CRM atual, ajustes finais | checklist da seção 32 todo verde |

Cada sprint termina com deploy em preview na Vercel para você validar antes de avançar. A Fase 2 (portal do cliente) só começa depois que a equipe usar a Fase 1 com clientes reais por algumas semanas.

---

## Próximos passos sugeridos

1. Validar a decisão de começar com schema novo (seção 0).
2. Confirmar as funções e a matriz de permissões (seção 5) — é a parte mais difícil de mudar depois.
3. Escolher entre ver mockups visuais navegáveis antes de codar ou ir direto para o Sprint 1.
