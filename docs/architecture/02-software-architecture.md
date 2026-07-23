# 2. Software Architecture

## Visão geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Vercel (Edge + Node)                        │
│                                                                       │
│   Next.js App Router (um único app, dois grupos de rotas)           │
│   ┌───────────────────────┐      ┌───────────────────────┐          │
│   │  app/(staff)/…        │      │  app/(portal)/…        │          │
│   │  painel da equipe     │      │  portal do cliente     │          │
│   └───────────┬───────────┘      └───────────┬───────────┘          │
│               │  Server Components (leitura)  │                      │
│               │  Server Actions (escrita)      │                      │
│               └───────────────┬────────────────┘                     │
│                        app/api/* (Route Handlers)                    │
│                 — só onde Server Action não serve —                  │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ supabase-js (SSR client, respeita RLS)
                                 │ supabase-js (admin client, service key,
                                 │  só em código server-only específico)
┌────────────────────────────────▼──────────────────────────────────────┐
│                              Supabase                                 │
│  Postgres (RLS em toda tabela) · Auth (senha + magic link) ·          │
│  Storage (buckets privado "documents" e público "avatars") ·          │
│  pg_cron não usado — cron fica no Vercel (ver abaixo)                 │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                        Vercel Cron (1x/dia) ──▶ /api/cron/storage-check
                                 │
                              Resend (e-mail transacional)
```

## Por que este formato (e não outro)

**Um único app Next.js com dois grupos de rotas**, em vez de dois apps
separados (staff/portal): mesmo deploy, mesma conta Supabase, mesmo schema.
Isso elimina duplicação de lógica de autenticação/RLS e mantém o cliente e a
equipe olhando exatamente os mesmos dados em tempo real — sem sincronização
entre sistemas. O custo é que o middleware de auth precisa distinguir as duas
audiências (ver `lib/supabase/middleware.ts`), o que é um problema pequeno
comparado ao ganho de simplicidade operacional.

**Server Actions como via principal de escrita**, em vez de uma camada de API
REST/GraphQL própria: o app não tem clientes externos (não é uma plataforma
com API pública ainda) — toda escrita nasce de um formulário ou botão dentro
do próprio Next.js. Introduzir uma camada de API formal agora seria
complexidade sem necessidade concreta. Quando/se o produto precisar de uma
API pública (integrações de terceiros, app mobile nativo), ela nasce como uma
camada nova sobre a mesma base de dados — não uma reescrita.

**Supabase como backend gerenciado**, em vez de backend próprio (Express/
NestJS + Postgres administrado à mão): Postgres com RLS nativa, Auth e
Storage prontos eliminam meses de infraestrutura que uma consultoria de
imigração não precisa reinventar. O trade-off consciente é lock-in de
plataforma — mitigado por manter toda a lógica de negócio em SQL puro
(functions, triggers, RLS policies), que é portável para qualquer Postgres,
não em recursos proprietários do Supabase além de Auth/Storage/Realtime. A
camada de código que **chama** Supabase, porém, tem uma lacuna real hoje —
ver [Portabilidade e Vendor Lock-in](#portabilidade-e-vendor-lock-in-camada-de-services)
abaixo.

**Vercel Cron em vez de `pg_cron`** para a rotina diária de armazenamento:
a lógica de alerta precisa chamar o Resend (HTTP), então mantê-la em
TypeScript (Route Handler) é mais simples e testável do que replicar chamadas
HTTP de dentro do Postgres via `pg_net`. `pg_cron`/`pg_net` ficam reservados
para o dia em que uma rotina precisar rodar *dentro* da transação do banco
(ex.: manutenção pura de dados, sem chamada externa).

## Portabilidade e Vendor Lock-in (camada de `services/`)

**Estado atual — inconsistência conhecida, não corrigida ainda**: `lib/*/data.ts`
e `app/**/actions.ts` chamam `createClient()` (supabase-js) diretamente, em
mais de 40 arquivos. Não existe hoje uma camada intermediária entre "código
de domínio" e "chamada ao Supabase" — se o produto precisar trocar de
provedor de Auth, Storage ou banco no futuro (ver motivação abaixo), o custo
seria tocar em todos esses arquivos, não em um único ponto.

**Por que isso importa para um produto que pretende virar SaaS**: o
Supabase é a escolha certa para o estágio atual (ver seção acima), mas um
produto que vai crescer para centenas de organizações pode, em algum
momento, precisar de decisões que o Supabase não cobre bem sozinho — por
exemplo, Storage a preço de escala (Amazon S3/Cloudflare R2 ficam mais
baratos que Supabase Storage acima de um certo volume) ou um provedor de
e-mail diferente por questão de deliverability em escala. **Não é uma
migração planejada para agora** — é uma opção que precisa continuar viável
sem exigir reescrever a aplicação inteira quando/se fizer sentido.

**Padrão recomendado (a adotar de forma incremental, nunca uma reescrita de
uma vez — mesmo espírito da adoção do shadcn/ui em [06](./06-component-architecture.md))**:

```
lib/
  services/
    auth/          # login, sessão, convite de usuário, MFA
      index.ts      # interface pública do serviço (funções que o resto do
                     # app chama)
      supabase.ts    # implementação concreta usando supabase-js — só este
                     # arquivo importa @supabase/supabase-js diretamente
    database/       # cliente de leitura/escrita genérico, se necessário
                     # (hoje cada domínio já encapsula sua própria query em
                     # lib/<domínio>/data.ts — a "abstração de banco" real
                     # está em manter toda regra de negócio em SQL/RLS, que
                     # já é portável por natureza; este serviço existe para
                     # o que não é regra de negócio, ex.: paginação genérica)
    storage/        # upload, URL assinada, exclusão de arquivo
      index.ts
      supabase.ts    # troca por s3.ts/r2.ts no dia da migração, sem tocar
                     # em quem consome o serviço
    email/          # envio de e-mail transacional
      index.ts
      resend.ts      # já isolado hoje em lib/storage-admin/email.ts —
                     # só precisa mudar de endereço, não de padrão
    billing/         # cobrança de assinatura do SaaS (futuro — Fase de
                     # monetização, ver 12-future-scalability.md)
```

**Regra de adoção**: nenhum componente ou Server Action importa
`@supabase/supabase-js` diretamente a partir de agora, exceto os próprios
arquivos `services/<área>/supabase.ts`. Código novo em uma área ainda não
migrada (ex.: um domínio de negócio que hoje chama `createClient()` direto)
continua fazendo isso até que essa área específica seja tocada por outro
motivo — assim como o plano do shadcn/ui, **não pare a esteira de entregas
para migrar tudo de uma vez**. `lib/supabase/server.ts`/`admin.ts` (os
clientes já centralizados hoje) são o embrião natural de
`services/auth` e `services/database` — a extração é mecânica quando o
momento chegar.

**O que isso NÃO significa**: não abstrair Postgres/RLS em si — a lógica de
permissão e integridade continua vivendo em SQL (ver
[04](./04-database-architecture.md)), porque isso já é portável para
qualquer Postgres. A camada de `services/` abstrai **o SDK/API do
provedor**, não a modelagem de dados nem as regras de negócio.

## Responsabilidades por camada

### Frontend (React Server Components + Client Components)

- **Server Components por padrão.** Toda página que só lê dados é um
  `async function` que busca do Supabase direto no servidor — sem
  `useEffect`, sem loading spinner de primeira carga.
- **Client Components (`"use client"`) só quando há interação**: formulários
  com `useActionState`, dropdowns com estado local, drag-and-drop, upload com
  feedback. A fronteira cliente/servidor é uma decisão por componente, não
  por página inteira — ver [06 — Component Architecture](./06-component-architecture.md).
- O frontend **nunca decide permissão** — ele só *reflete* o que a função do
  usuário permite (esconder um botão, por exemplo), mas a garantia real está
  na RLS. Ver [08 — Security Guide](./08-security-guide.md).

### Backend (Server Actions + Route Handlers)

- **Server Actions** (`"use server"`) são a via padrão de escrita: criam,
  atualizam, arquivam. Rodam com o cliente Supabase da **sessão do usuário**
  (respeitando RLS), nunca com a chave secreta, salvo os casos documentados
  em [08](./08-security-guide.md) (convite de usuário, agregações
  administrativas).
- **Route Handlers** (`app/api/*`) só existem onde uma Server Action não
  serve: endpoints chamados por `fetch` do cliente (busca com debounce),
  download de arquivo via URL assinada, ou o cron externo (Vercel Cron não
  invoca Server Actions diretamente).
- **Edge Functions do Supabase**: reservadas para lógica que precisa rodar
  *fora* do runtime do Next.js — hoje não há nenhuma em uso; o candidato mais
  provável no futuro é processamento pesado de arquivo (ex.: OCR de
  passaporte) que não deveria bloquear uma requisição do Next.js.

### Banco de dados (Postgres via Supabase)

- É a **fonte única de verdade de permissão** (RLS) e de integridade
  (constraints, triggers). Ver [04 — Database Architecture](./04-database-architecture.md).
- Toda regra "quem pode ver/editar o quê" é uma policy SQL, testada com
  pgTAP antes de qualquer deploy — nunca só um `if` no componente React.
- Cálculos derivados que precisam ficar sempre corretos (percentual de
  checklist, por exemplo) vivem em triggers `SECURITY DEFINER`, não em
  código de aplicação que alguém pode esquecer de chamar.

### Autenticação

- Supabase Auth, dois fluxos: senha + MFA planejado para equipe; magic link
  (PKCE) para cliente do portal. Ambos exigem o mesmo Route Handler
  `app/auth/callback` para trocar o `code` PKCE por sessão.
- A função do usuário (`admin`/`director`/`consultant`/`operations`/
  `finance`/`partner`/`client`) vive em `public.profiles.role_id`, nunca em
  metadata do JWT sozinha — `get_user_role()` é a função SQL única e
  centralizada que toda policy consulta.

### Storage

- Bucket privado `documents`: acesso só por URL assinada de curta duração,
  nunca URL pública. Path `client_id/case_id/arquivo`.
- Bucket público `avatars`: foto de perfil, sensibilidade baixa, URL pública
  direta — decisão deliberada de não pagar o custo de URL assinada para algo
  que não é dado sensível de cliente.
- Nenhum dado de cliente é servido por URL pública, sem exceção.

### Deploy

- **Vercel**: build a cada push em `main` (preview automático em branches).
  Variáveis de ambiente por ambiente (dev/prod) — nunca a chave secreta do
  Supabase em `NEXT_PUBLIC_*`.
- **Supabase**: hoje só o projeto de desenvolvimento existe; o projeto de
  produção ainda não foi criado (ver `CLAUDE.md` para o estado atual). As
  migrações SQL vivem versionadas em `supabase/migrations/`, aplicadas
  manualmente hoje via SQL Editor — ver risco correspondente em
  [13 — Architectural Risks](./13-architectural-risks.md) sobre
  automatizar isso antes que o volume de migrações fique difícil de auditar
  à mão.
- **GitHub**: único repositório, branch `main` protegida por convenção (não
  por regra técnica ainda — outro item de risco).
