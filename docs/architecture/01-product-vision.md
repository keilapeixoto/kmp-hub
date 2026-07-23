# 1. Product Vision

## Leia isto primeiro: o que este produto é, de verdade

O KMP Hub **não é o CRM interno da KMP Consulting**. É um produto de CRM
operacional para negócios que gerenciam clientes, documentos e processos
complexos com etapas regulatórias — consultorias de imigração, agências de
intercâmbio educacional, consultorias educacionais, e negócios com
necessidade equivalente de checklist/documento/processo estruturado.

**A KMP Consulting é a primeira cliente e o ambiente inicial de validação —
não a dona do produto.** Toda decisão de arquitetura documentada aqui é
tomada pensando nisso: o produto deve ter, quando evoluir, marca, operação,
banco de dados, usuários, planos e infraestrutura **independentes** da KMP
Consulting. A KMP roda hoje num ambiente que, tecnicamente, é o único
tenant existente — não porque o produto é "da KMP", mas porque ainda não
existe um segundo cliente para justificar o custo de generalizar
(ver [12 — Future Scalability](./12-future-scalability.md) para a
arquitetura de migração para multi-tenant, planejada e documentada, não
implementada ainda).

## Estado atual vs. estado futuro (a distinção mais importante deste documento)

| | **Estado atual** | **Estado futuro (planejado, não implementado)** |
|---|---|---|
| **Modelo de negócio** | Uso interno da KMP Consulting — sem cobrança por assinatura. | SaaS com planos de assinatura, cada empresa cliente paga pelo próprio uso. |
| **Tenancy** | Single-tenant — um banco, uma empresa, um conjunto de dados. | Multi-tenant — cada empresa é uma `organization`, isolada por `organization_id` em RLS. |
| **Usuários** | Todos os usuários (equipe e clientes) pertencem à mesma empresa (KMP). | Usuários vinculados à própria organização; um mesmo e-mail pode existir em organizações diferentes sem colisão. |
| **Marca/identidade visual** | Fixa: cores, fontes e nome da KMP Consulting hardcoded no tema. | Configurável por organização (nome, logo, cor primária) — ver [06](./06-component-architecture.md) e [12](./12-future-scalability.md). |
| **Segunda empresa usando o sistema** | Não existe. | É o gatilho que dispara a migração para multi-tenant — não antes disso (ver seção "quando migrar" em [12](./12-future-scalability.md)). |
| **Infraestrutura** | Um projeto Supabase (dev; produção ainda não criada). | Mesmo projeto/banco compartilhado entre organizações (isolamento lógico via RLS, não banco por cliente — ver [12](./12-future-scalability.md) para a justificativa). |
| **Cobrança e limites** | Nenhum controle de plano/limite de uso. | Planos com limite de usuários/armazenamento/clientes por organização, painel de uso e cobrança (ver [12](./12-future-scalability.md)). |

**Regra que vale a partir de agora**: nenhuma decisão arquitetural nova pode
tornar essa evolução mais difícil do que já é. Isso não significa construir
multi-tenant agora (ver [item 5 desta revisão](#por-que-não-construir-multi-tenant-agora) abaixo)
— significa, por exemplo, nunca escrever uma query que assuma "só existe uma
empresa" de um jeito que exigiria reescrita (não hardcoded, sempre
parametrizável por posse/organização quando essa dimensão existir), e nunca
acoplar lógica de negócio diretamente a um provedor de infraestrutura sem
uma camada de abstração (ver [Portabilidade e Vendor Lock-in](#portabilidade-e-vendor-lock-in-camada-de-serviços) abaixo).

## Por que não construir multi-tenant agora

Adicionar isolamento de tenant especulativamente, sem um segundo cliente
real para validar o modelo, arrisca modelar errado — que tabelas são "por
organização" vs. "compartilhadas globalmente" (categorias padrão de
documento? guias genéricos de imigração?) só fica claro com um segundo caso
de uso real pedindo por uma customização que o primeiro não previu. O custo
de esperar é baixo (a arquitetura já evita decisões que dificultem a
migração — ver [04](./04-database-architecture.md) e [12](./12-future-scalability.md));
o custo de errar cedo é reescrever RLS de ~25 tabelas duas vezes.

## Público-alvo

**Direto (usuários do painel):**
- **Administradores** — donos/gestores da empresa cliente. Acesso total à
  própria organização, configuração do sistema, dados financeiros e de
  auditoria.
- **Diretoria** — visão gerencial ampla, sem poder de configuração do
  sistema.
- **Consultores** — donos de carteira de clientes/processos. Rotina diária:
  pipeline, checklists, formulários, agenda.
- **Operações** — equipe de apoio alocada em processos específicos, sem
  carteira própria.
- **Financeiro** — visibilidade de leitura sobre processos (Fase 3 trará
  faturamento interno da empresa cliente — não confundir com a cobrança do
  SaaS em si, que é entre o KMP Hub e a empresa cliente).
- **Parceiros** — agentes/parceiros externos com visão compartilhada e
  limitada de clientes específicos.

**Indireto (usuários do portal):**
- **Clientes finais** de cada empresa cliente — preenchem formulários,
  enviam documentos, acompanham o status do próprio processo. Nunca veem
  notas internas, riscos, ou dados de outros clientes — nem, no estado
  futuro, dados de clientes de **outra organização**.

## Segmento de mercado

**Hoje**: uma consultoria de imigração australiana (KMP Consulting),
dezenas de usuários de equipe, ~190 clientes ativos reais.

**Visão de produto**: consultorias de imigração, agências de intercâmbio
educacional, consultorias educacionais e negócios equivalentes que
gerenciam clientes, documentos e processos com etapas regulatórias
complexas — não limitado geograficamente à Austrália por arquitetura (o
domínio de negócio hoje é modelado em torno de vistos/imigração australiana
porque é o caso real que existe, mas nada na estrutura de dados impede um
`service_type` representar um processo de outro país ou segmento).

## Módulos do produto (Fase 1 — construída)

| Módulo | O que cobre |
|---|---|
| **Autenticação e Funções** | Login por senha (equipe, com MFA planejado) e magic link (cliente no portal); 7 funções com RLS própria por tabela. |
| **Leads** | Captação, pipeline Kanban compartilhado entre consultores, histórico, alertas de inatividade. |
| **Clientes** | Perfil completo (dados, dependentes, documentos de identidade), conversão de lead, convite de acesso ao portal. |
| **Processos** | Um processo = um serviço para um cliente. Tipos de serviço (pipelines) configuráveis pelo admin, com etapas próprias, arquivamento e duplicação. |
| **Checklists** | Templates reutilizáveis por tipo de serviço; instância por processo com 10 estados de aprovação, prazo, subtarefas e percentual de conclusão. |
| **Documentos** | Upload versionado, categorias, subpastas, status de revisão, hash para detectar duplicidade, arquivamento (nunca exclusão). |
| **Formulários de coleta de dados** | Formulários multi-etapa preenchidos pelo cliente no portal, com rastreio de abriu/iniciou/concluiu e compartilhamento por link/e-mail/WhatsApp. |
| **Tarefas e Agenda** | Tarefas com responsável e comentários; compromissos com fusos horários e resumo pós-consulta. |
| **Biblioteca** | Guias versionados e templates de mensagem reutilizáveis pela equipe. |
| **Portal do Cliente** | Espelho read-only + formulários + upload, RLS isolando cada cliente dos demais. |
| **Dashboard e Busca Global** | Indicadores por função; busca com sugestão em tempo real. |
| **Auditoria** | Log de mutações sensíveis, visível só para admin — cobre CRUD de tabela, **não cobre download de arquivo** (ver gap registrado em [08 — Security Guide](./08-security-guide.md)). |
| **Controle de Armazenamento** | Metadados completos por documento, validação de upload, painel de uso, alertas automáticos, relatório mensal, rotina diária. |
| **Gestão de Usuários** | Admin adiciona/edita/desativa usuários da equipe; autoatendimento de perfil. |

## O que **não** faz parte do produto (ainda)

Fase 2+ explicitamente adiada:

- **Propostas comerciais e faturamento interno da empresa cliente**
  (invoices, cobrança via Stripe dos clientes finais de cada empresa) —
  não confundir com a cobrança do próprio SaaS (assinatura da empresa
  cliente pelo uso do KMP Hub), que é um conceito separado e também
  futuro (ver [12](./12-future-scalability.md)).
- **Automação de e-mail disparada por evento.**
- **Integração com WhatsApp Business API** (envio automatizado).
- **Integração com Google Calendar / Xero.**
- **Geração de conteúdo por IA** — sempre com validação humana obrigatória.
- **Multi-tenancy real** — ver [12](./12-future-scalability.md).
- **Migração do CRM legado da KMP** — bloqueada aguardando CSVs.

## Princípios do produto (não negociáveis)

1. **O banco garante a permissão, não a interface.**
2. **Nada de exclusão permanente de dados operacionais.**
3. **Fases rígidas** — nenhuma funcionalidade de fase futura entra antes da
   fase atual estar validada em uso real.
4. **Schema em inglês, interface em português** (a interface em português é
   uma decisão de produto para o mercado inicial — o estado futuro
   multi-tenant deve permitir idioma por organização/usuário, o que já é
   parcialmente verdade hoje via `profiles.idioma`).
5. **Nenhuma decisão de arquitetura nova pode presumir "existe só uma
   empresa"** de um jeito que exija reescrita, mesmo que a implementação
   multi-tenant em si fique para depois.
