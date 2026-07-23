# 11. Development Roadmap

Este roadmap descreve a **ordem lógica de construção** de um sistema deste
tipo, da fundação ao avançado — é a sequência que este projeto de fato
seguiu, documentada para justificar por que certas coisas vieram antes de
outras, e para orientar qualquer expansão futura (um segundo produto, um
segundo tenant) que precise repetir a mesma disciplina.

## Fase 0 — Fundação (pré-requisito de tudo)

1. Repositório, projeto Supabase, variáveis de ambiente.
2. Migração de identidade: `roles`, `profiles`, `permissions`, trigger
   `handle_new_user`, função `get_user_role()`.
3. RLS inicial (mesmo antes de existir uma tela) — a função central que
   toda policy futura vai consultar precisa existir primeiro.
4. Layout e identidade visual (fontes, cores, sidebar vazia).

**Por que nessa ordem**: nenhuma tela faz sentido sem saber "quem está
logado e o que essa pessoa pode ver" — construir telas antes da fundação de
auth/RLS gera retrabalho garantido assim que a primeira regra de permissão
precisar ser aplicada retroativamente.

## Fase 1 — Núcleo operacional (o que este projeto tem hoje)

Ordem seguida, sprint a sprint:

1. **Leads** — pipeline mais simples do sistema, valida o padrão de RLS por
   função antes de repetir em domínios mais complexos.
2. **Clientes** — conversão de lead, primeiro caso de dado que precisa
   sobreviver a uma transição de estado (lead → cliente).
3. **Processos** — o núcleo do produto: tipos de serviço configuráveis,
   etapas, histórico automático via trigger.
4. **Checklists e documentos** — o domínio mais sensível de permissão
   (arquivo real, cliente com escrita própria) — construído só depois que
   os padrões de RLS já estavam maduros nos três domínios anteriores.
5. **Tarefas e agenda** — fuso horário como problema central, isolado dos
   domínios anteriores.
6. **Biblioteca, dashboard, linha do tempo, busca global, auditoria** —
   camadas de suporte que dependem de todo o resto já existir para agregar
   dado de verdade.
7. **Portal do cliente** — reaproveita toda a base de RLS já validada
   internamente; a novidade é só a superfície de UI voltada ao cliente e o
   fluxo de magic link.
8. **Formulários de coleta de dados** — antecipado da Fase 2 porque
   resolvia um problema concreto e imediato (preenchimento manual
   duplicado) sem exigir nenhuma das integrações externas que definem a
   Fase 2 de verdade.
9. **Controle de armazenamento, gestão de usuários, pipelines/checklists
   configuráveis pelo admin, subpastas/status de documento, rastreio de
   formulário** — camada de **auto-atendimento do admin**: tudo que antes
   exigia mexer no código (criar pipeline, adicionar usuário, ajustar
   checklist) passa a ser feito pela própria equipe pelo painel.

**Por que auto-atendimento do admin veio por último dentro da Fase 1, não
antes**: só faz sentido dar ao admin o poder de configurar pipelines/
checklists/formulários **depois** que o modelo de dados por trás
(service_types, checklist_templates, case_form_templates) já estava
validado com dado real. Construir a UI de configuração antes do modelo
estar testado em produção arriscaria travar a interface numa modelagem
errada.

## Fase 2 — Integrações e automação (planejada, não iniciada)

Nesta ordem, quando começar:

1. **Automação de e-mail por evento** (mudança de etapa, documento
   recebido/pendente) — o mecanismo de envio (Resend) já existe; falta o
   motor de gatilhos e a UI de configurar qual automação roda em qual
   pipeline.
2. **Integração com Google Calendar** — depende de agenda já estar madura
   (está).
3. **WhatsApp Business API** (envio automatizado, além do link manual que
   já existe).
4. **Migração do CRM legado** — bloqueada aguardando exportação de dados da
   cliente, não é uma dependência técnica.

## Fase 3 — Financeiro (planejada, explicitamente adiada)

1. Propostas comerciais.
2. Faturamento e cobrança (Stripe) — decisão de produto já tomada: cliente
   deve poder pagar direto pelo portal quando isso for construído, não só
   controle manual de entrada/saída.
3. Integração com Xero.

**Por que Financeiro vem depois de Automação**: automação de comunicação
tem impacto direto na operação diária de todos os consultores desde o
primeiro dia; financeiro é usado por um subconjunto menor da equipe e só
faz sentido quando o volume de processos ativos justificar cobrança
automatizada.

## Fase 4 — IA e escala (especulativa)

- Geração de conteúdo assistida por IA — sempre com validação humana
  obrigatória e marcação explícita de conteúdo gerado, nunca automática sem
  revisão.
- Evolução para multi-tenant (ver
  [12 — Future Scalability](./12-future-scalability.md)) — só quando um
  segundo cliente real do produto existir, não especulativamente.

## Regra que vale para toda fase futura

Nenhuma funcionalidade de uma fase entra antes da fase atual estar validada
em uso real — esta é uma decisão de produto já tomada e documentada em
[01 — Product Vision](./01-product-vision.md), não uma sugestão deste
roadmap. Qualquer IA ou desenvolvedor que receba um pedido de feature de
fase futura deve confirmar explicitamente com o responsável pelo produto
antes de construir, mesmo que o pedido pareça simples.
