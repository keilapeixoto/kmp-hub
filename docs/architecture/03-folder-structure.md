# 3. Folder Structure

## Estrutura real atual

```
kmp-hub/
├── app/
│   ├── (staff)/                  # grupo de rotas: painel da equipe
│   │   ├── _components/          # componentes compartilhados por TODO o painel
│   │   │                         # (sidebar, header, busca global, etc.)
│   │   ├── layout.tsx            # layout com sidebar + header, comum a /(staff)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   │   ├── [id]/page.tsx     # detalhe
│   │   │   ├── _components/      # componentes só deste módulo
│   │   │   ├── actions.ts        # Server Actions só deste módulo
│   │   │   └── page.tsx          # lista
│   │   ├── clientes/
│   │   ├── processos/
│   │   │   ├── [id]/
│   │   │   ├── novo/
│   │   │   ├── _components/
│   │   │   ├── actions.ts
│   │   │   └── checklist-actions.ts   # Server Actions de um sub-domínio,
│   │   │                              # separadas quando actions.ts cresceria demais
│   │   ├── tarefas/
│   │   ├── agenda/
│   │   ├── guias/
│   │   ├── templates/
│   │   ├── busca/
│   │   ├── perfil/                    # autoatendimento — qualquer usuário
│   │   └── configuracoes/
│   │       ├── page.tsx               # hub — lista todas as áreas de config
│   │       ├── servicos/              # tipos de serviço = pipelines
│   │       ├── checklists/
│   │       ├── formularios/
│   │       ├── equipe/                # gestão de usuários (admin only)
│   │       └── armazenamento/         # painel + ajustes de storage
│   ├── (portal)/                 # grupo de rotas: portal do cliente
│   │   └── portal/
│   │       ├── login/
│   │       ├── documentos/
│   │       ├── formulario/
│   │       └── _components/
│   ├── api/                      # Route Handlers — só quando Server Action não serve
│   │   ├── busca/                # chamado via fetch (debounce) do client component
│   │   ├── documents/[id]/download/  # gera URL assinada, redireciona
│   │   └── cron/storage-check/   # alvo do Vercel Cron
│   ├── auth/callback/             # troca PKCE code por sessão (staff E portal)
│   ├── globals.css                # tema Tailwind v4 (@theme, cores/fontes)
│   ├── layout.tsx                  # layout raiz (fontes, <html>)
│   └── page.tsx                    # redireciona pro dashboard ou portal conforme sessão
│
├── lib/                          # tudo que NÃO é componente React
│   ├── supabase/
│   │   ├── client.ts              # cliente browser (Client Components)
│   │   ├── server.ts               # cliente SSR (Server Components/Actions, respeita RLS)
│   │   ├── admin.ts                # cliente com service key — uso restrito, ver doc 08
│   │   └── middleware.ts           # guarda de rotas + refresh de sessão
│   ├── auth.ts                     # getCurrentUserRole/Profile — usado em toda página
│   ├── <domínio>/                  # um diretório por domínio de negócio
│   │   ├── types.ts                # tipos TS espelhando as tabelas (nomes em inglês)
│   │   ├── constants.ts             # enums/labels em português (o que a UI mostra)
│   │   └── data.ts                  # funções de leitura (getX, getXById) — só leitura
│   # domínios atuais: leads, clients, cases, checklists, documents, tasks,
│   # appointments, guides, message-templates, timeline, case-forms, team,
│   # storage-admin, portal, search, dashboard
│   ├── services/                   # PLANEJADO, ainda não criado — camada de
│   │                                # abstração sobre o provedor de infra
│   │                                # (auth/database/storage/email/billing),
│   │                                # ver 02-software-architecture.md. Nasce
│   │                                # de forma incremental a partir de
│   │                                # lib/supabase/*.ts existente, não como
│   │                                # um projeto de reescrita à parte.
│
├── supabase/
│   ├── migrations/                # uma migração por mudança de schema, nunca editada
│   │                               # depois de aplicada — sempre uma nova migração
│   ├── tests/database/             # testes pgTAP, um arquivo por conjunto de tabelas
│   ├── seeds/                      # dados de seed (ex.: checklists importados)
│   └── README.md                   # o que cada migração fez e por quê (histórico legível)
│
├── scripts/                       # scripts Node one-off (importação, backfill, limpeza
│                                   # de dados de demo) — nunca rodam em produção sozinhos,
│                                   # sempre invocados manualmente e documentados
│
├── docs/architecture/             # este diretório — a documentação que você está lendo
│
├── CLAUDE.md                      # estado do projeto + convenções operacionais
└── kmp-hub-plano.md                # o plano de produto original (seção 1 a 32)
```

## Convenções de organização

### Por domínio, não por tipo de arquivo

`lib/leads/`, `lib/cases/`, `lib/documents/` — cada domínio de negócio tem sua
própria pasta com `types.ts` + `constants.ts` + `data.ts`. **Não existe** uma
pasta `lib/types/` ou `lib/utils/` genérica onde tudo se acumula sem dono —
isso é o que torna um projeto difícil de navegar depois de 50 arquivos. Se um
helper é genérico o suficiente para não pertencer a nenhum domínio (ex.:
`formatBytes`), ele mora dentro do domínio mais próximo de onde é usado
(`lib/storage-admin/format.ts`), não em um `lib/utils.ts` fantasma.

### `_components/` com underscore = não é uma rota

Next.js App Router ignora pastas prefixadas com `_` no roteamento. Usamos
isso deliberadamente: `_components/` dentro de cada módulo guarda componentes
que só aquele módulo usa; `app/(staff)/_components/` guarda o que é
compartilhado por todo o painel (sidebar, header, busca).

**Regra de decisão**: um componente nasce dentro de `_components/` do módulo
que o criou. Só sobe para `app/(staff)/_components/` quando um **segundo**
módulo precisar dele de verdade — nunca antecipe reuso.

### `actions.ts` por módulo, dividido quando cresce

Cada módulo tem um `actions.ts` com todas as suas Server Actions. Quando um
módulo tem um sub-domínio grande o suficiente para merecer arquivo próprio
(ex.: `processos/checklist-actions.ts` separado de `processos/actions.ts`),
divida por sub-domínio, nunca por tipo de operação (não crie
`create-actions.ts` + `update-actions.ts`).

### Migrações SQL: nunca editar, sempre criar uma nova

Cada arquivo em `supabase/migrations/` é nomeado
`AAAAMMDDHHMMSS_descricao.sql` e, uma vez aplicado ao banco de dev ou
produção, **é imutável**. Uma correção é sempre uma nova migração
(`alter table ... add column`, nunca reabrir o arquivo antigo). Isso é o que
permite reconstruir o estado do banco do zero rodando as migrações em ordem
— fundamental antes de existir um projeto de produção separado.

### Onde um arquivo novo deveria ir? (árvore de decisão)

1. É uma tela/rota nova? → `app/(staff)/<módulo>/` ou `app/(portal)/portal/<módulo>/`.
2. É lógica de leitura de dados? → `lib/<domínio>/data.ts`.
3. É uma Server Action (escrita)? → `app/(staff)/<módulo>/actions.ts`.
4. É um tipo TypeScript espelhando uma tabela? → `lib/<domínio>/types.ts`.
5. É um componente usado só numa tela? → `_components/` daquela tela.
6. É um componente usado em 2+ módulos? → `app/(staff)/_components/`.
7. Muda o schema do banco? → nova migração em `supabase/migrations/`, mais o
   teste pgTAP correspondente em `supabase/tests/database/`.
8. É um script de manutenção pontual (backfill, importação)? → `scripts/`,
   documentado com um comentário de cabeçalho explicando quando/por que rodar.
