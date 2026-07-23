# 12. Future Scalability

## Ponto de partida: o que existe hoje e por que não é multi-tenant ainda

Como estabelecido em [01 — Product Vision](./01-product-vision.md): o KMP
Hub é um produto que pretende virar SaaS multi-tenant; a KMP Consulting é a
primeira cliente, não a dona do produto. O sistema é **single-tenant por
decisão consciente de sequenciamento**, não por limitação técnica esquecida
nem porque o produto "é da KMP". Nenhuma tabela tem `organization_id`. A razão: adicionar
isolamento de tenant especulativamente, sem um segundo cliente real para
validar o modelo, arrisca modelar errado (que tabelas são "por tenant" vs.
"globais" só fica claro com um segundo caso de uso concreto — ex.:
`document_categories` e `guides` provavelmente deveriam ter um conjunto
padrão global **e** permitir customização por tenant, e essa nuance só
aparece com um segundo cliente real pedindo por ela).

Isso não significa que a arquitetura atual *impede* multi-tenant — ela
**evita ativamente** decisões que tornariam a migração mais cara depois
(ver "decisões que já facilitam a migração" abaixo).

## Caminho de migração para multi-tenant

### Estratégia escolhida: RLS por `organization_id`, não banco/schema por tenant

Três opções possíveis, com o trade-off de cada uma:

| Estratégia | Prós | Contras | Recomendação |
|---|---|---|---|
| **RLS por `organization_id`** (uma tabela, uma coluna extra, policy filtra) | Barato de operar (um único banco, um único deploy, migração roda uma vez para todos os tenants); Supabase/Postgres já é otimizado para isso com índice composto. | Erro de RLS afeta todos os tenants ao mesmo tempo (superfície de risco maior por bug). | **Escolhida.** É o padrão de mercado para SaaS B2B deste porte (até dezenas de milhares de usuários, centenas de tenants). |
| **Schema por tenant** (`tenant_abc.cases`, `tenant_xyz.cases`) | Isolamento mais forte a nível de banco. | Migração precisa rodar N vezes (uma por schema); Supabase não tem tooling nativo pra isso; complexidade cresce linear com número de tenants. | Não recomendada — só faria sentido com poucos tenants (dezenas), cada um gigante, o que não é o perfil deste produto. |
| **Banco por tenant** (um projeto Supabase por cliente) | Isolamento total, inclusive de performance. | Custo de infraestrutura escala linear com tenant, sem economia de escala; deploy de migração vira uma operação de N passos; contradiz o modelo de custo de um SaaS. | Não recomendada para este produto — talvez faça sentido só para um cliente enterprise que exija isolamento físico contratual, como exceção pontual, não como arquitetura padrão. |

### Passos concretos da migração (quando o segundo tenant real existir)

1. Criar tabela `organizations` (`id`, `nome`, `slug`, `plano`, `ativo`).
2. Adicionar `organization_id uuid not null references organizations(id)` a
   toda tabela que hoje representa dado "de uma empresa" — a maioria
   (`clients`, `cases`, `documents`, `leads`, etc.). Tabelas verdadeiramente
   globais (lista de países, por exemplo, se existir um dia) não ganham a
   coluna.
3. `profiles.organization_id` — todo usuário pertence a exatamente uma
   organização (mesmo um usuário `client` do portal).
4. Reescrever `get_user_role()` para também expor
   `get_user_organization()`, e **toda** policy de RLS passa a incluir
   `and organization_id = get_user_organization()` além da checagem de
   função já existente. Isso é mecânico mas extenso — ~25 tabelas, cada uma
   com várias policies.
5. Índice composto `(organization_id, <coluna mais consultada>)` em toda
   tabela grande — sem isso, filtrar por tenant sozinho não usa índice
   eficientemente em tabelas que crescem (documents, principalmente).
6. Bucket de Storage: caminho passa a
   `organization_id/client_id/case_id/arquivo`, policies de
   `storage.objects` ganham o segmento extra.
7. Domínio/branding: cada organização precisa de identidade visual própria
   (hoje `kmp-orange`/Cormorant Garamond são fixos) — os tokens de tema
   precisam sair de `app/globals.css` fixo para uma tabela
   `organizations.tema` (cores, fonte, nome) resolvida no layout raiz por
   subdomínio ou domínio customizado.
8. Rotina de cron (`storage-check`) passa a rodar **por organização**, não
   uma vez global — cada uma com seu próprio `storage_settings`.

### Decisões que já facilitam essa migração (não são acidente)

- Toda regra de permissão já vive em RLS centralizada via
  `get_user_role()` — adicionar uma segunda dimensão (`organization_id`) é
  extensão do mesmo padrão, não uma reescrita de paradigma.
- Nenhuma query de aplicação depende de escanear a tabela inteira sem
  filtro — toda leitura já passa por uma FK de posse (`client_id`,
  `case_id`). Adicionar `organization_id` a essas mesmas queries é
  incremental.
- Schema em inglês, sem nome específico de empresa em nenhuma tabela —
  `service_types`, não `kmp_service_types`.

## Controle de uso e armazenamento por organização (planejado — só documentado)

O controle de armazenamento já construído hoje (`storage_settings`,
`storage_daily_snapshots`, painel administrativo — ver
[04](./04-database-architecture.md)) é **singleton**: uma configuração, um
snapshot diário, para o sistema inteiro. No modelo multi-tenant, cada
organização precisa da própria medição e do próprio limite — sem isso, uma
organização não teria visibilidade do próprio consumo nem o SaaS teria como
cobrar por uso ou aplicar limite de plano.

**Entidade conceitual — `organization_usage`** (não implementada; desenhada
aqui para não ser modelada às pressas quando o momento chegar):

| Campo | Papel |
|---|---|
| `organization_id` | Dona do registro (uma linha por organização, ou um snapshot histórico por dia — ver nota abaixo). |
| `storage_bytes_used` | Total de bytes ocupados pelos documentos da organização — hoje calculado globalmente em `storage_daily_snapshots.total_bytes`; no futuro, filtrado por `organization_id`. |
| `storage_limit_bytes` | Limite do plano contratado — hoje `storage_settings.internal_limit_bytes` é global; no futuro, um valor por organização, definido pelo plano de assinatura. |
| `file_count` | Quantidade de arquivos — permite ao painel de billing mostrar "X documentos armazenados", não só bytes. |
| `active_users` | Quantidade de usuários de equipe ativos na organização — insumo direto para planos com limite de usuário. |
| `active_clients` | Quantidade de clientes ativos cadastrados — insumo para planos com limite de clientes geridos. |
| `updated_at` | Quando o consumo foi medido pela última vez — a rotina diária (já existente, hoje global) passa a atualizar isto por organização. |

**Reaproveitamento do que já existe**: a rotina diária de armazenamento
(`app/api/cron/storage-check`) já calcula boa parte disso globalmente — a
migração para multi-tenant é, na prática, trocar "uma execução global" por
"um loop por organização ativa dentro da mesma execução", gravando em
`organization_usage` em vez de (ou além de) `storage_daily_snapshots`. Não é
uma reescrita da lógica de cálculo, é uma mudança de granularidade.

**Uso previsto desta entidade**: painel de uso por organização (quanto
armazenamento/quantos usuários/quantos clientes ela está usando frente ao
plano contratado), gatilho de alerta quando uma organização se aproxima do
limite do próprio plano (mesmo padrão de alerta por e-mail já construído,
só que por organização em vez de global), e insumo direto para a tela de
cobrança (`services/billing`, ver [02](./02-software-architecture.md)).

## Escala de usuários e carga

### O que muda de 1 empresa/190 clientes para dezenas de milhares de usuários

| Camada | Hoje | Ajuste necessário em escala |
|---|---|---|
| **Conexões de banco** | Supabase gerencia pooling (Supavisor) automaticamente; carga atual é trivial. | Confirmar modo *transaction* do pooler em uso (não *session*) para Server Actions serverless da Vercel — cada invocação de função é uma conexão nova; sem pooling em modo transação, o banco esgota conexões rápido com tráfego concorrente alto. |
| **Queries sem paginação** | Algumas agregações administrativas (painel de armazenamento) já paginam corretamente (`.range()`) depois de um bug real encontrado neste projeto (PostgREST trunca em 1000 linhas silenciosamente). | Auditar **toda** query nova contra esse mesmo risco antes de assumir "poucos registros" — "poucos" muda de definição conforme a base cresce. |
| **Índices** | Índices simples por FK já existem (`client_id`, `case_id`, etc.). | Em escala, monitorar `pg_stat_statements` do Supabase e adicionar índice composto onde o padrão de filtro real (não hipotético) mostrar necessidade — não indexar preventivamente sem dado de uso. |
| **Realtime/polling** | Nenhuma tela usa Supabase Realtime hoje — tudo é request/response tradicional (Server Component recarrega). | Se uma feature futura precisar de atualização ao vivo entre usuários (ex.: dois consultores editando o mesmo processo), avaliar Realtime nesse momento — não adicionar antes de haver essa necessidade concreta. |
| **Storage** | ~2 GB reais hoje, plano Pro inclui 100 GB. | Em escala multi-tenant, `storage_settings`/alertas já são por singleton — precisam virar por organização (ver migração acima) antes do primeiro tenant grande o suficiente para se aproximar do limite incluído. |
| **Cron único** | Um Vercel Cron roda a rotina diária de armazenamento globalmente. | Multi-tenant exige iterar por organização dentro da mesma execução (não um cron por tenant — isso não escala em número de jobs agendáveis da Vercel) — o Route Handler já pode ser adaptado para um loop sobre organizações ativas sem mudar a infraestrutura de agendamento. |
| **E-mail transacional** | Resend, volume baixo (alertas internos). | Verificar limite de taxa do plano Resend conforme o volume de organizações/alertas cresce; a função `sendEmail` já é isolada o suficiente para trocar de provedor sem tocar em quem a chama, se necessário. |

### O que **não** precisa mudar cedo

- **Next.js/Vercel** escalam horizontalmente por padrão (serverless) — não
  há gargalo de aplicação esperado antes do banco/Storage precisarem de
  atenção primeiro.
- **Estrutura de pastas e padrão de Server Actions** não mudam com escala de
  usuários — mudam (levemente) só com multi-tenant, conforme descrito
  acima.

## Sinal de quando agir (não antes)

- **Multi-tenant**: quando houver um segundo cliente real assinando o
  produto (não uma segunda "instância de teste" da mesma KMP Consulting).
- **Ajuste de pooling/índice**: quando `pg_stat_statements`/dashboard do
  Supabase mostrar tempo de query subindo de forma consistente, não
  antecipadamente.
- **Branding por tenant**: no mesmo momento do primeiro passo de
  multi-tenant, não antes (não vale a pena generalizar tema para um único
  cliente).

Esta seção é deliberadamente um **plano**, não uma implementação —
construir isolamento multi-tenant sem um segundo tenant real para validar
contra é o tipo de esforço que tende a errar a modelagem e precisar ser
refeito de qualquer forma quando o caso real aparecer.
