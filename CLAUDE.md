# CLAUDE.md — KMP Hub

Guia de contexto para trabalhar neste repositório. Baseado em [kmp-hub-plano.md](kmp-hub-plano.md).

## Documentação de arquitetura

A referência técnica permanente do projeto — visão de produto, arquitetura
de software, estrutura de pastas, banco de dados, design system, padrões de
API, segurança, coding standards, guia para IA, roadmap e escalabilidade
futura (multi-tenant) — vive em [`docs/architecture/`](docs/architecture/README.md).
Este `CLAUDE.md` documenta o **estado em movimento** (o que foi feito, o que
está pendente); `docs/architecture/` documenta a **estrutura estável** (como
o sistema é organizado e por quê). Leia `docs/architecture/10-ai-development-guide.md`
antes de qualquer tarefa que mude schema, componente ou padrão de código.

## O que é

Plataforma operacional da KMP Consulting (consultoria de imigração), substituindo o CRM Kanban atual em crm.kmpconsulting.com.au. Um único app Next.js com dois grupos de rotas: app da equipe `(staff)` e portal do cliente `(portal)`, mesmo deploy, mesma conta Supabase.

Repositório e schema novos (não evolução do CRM atual) — motivo: RLS por função precisa nascer com o schema, e o modelo de dados (processos, checklists, documentos versionados, auditoria) é estruturalmente maior que o pipeline comercial existente.

## Stack

- **Frontend/Backend**: Next.js (App Router), Server Actions para toda escrita — nenhuma mutação direta do cliente para o banco.
- **Banco/Auth/Storage**: Supabase — PostgreSQL com Row Level Security em todas as tabelas, Auth (e-mail + senha, MFA TOTP para equipe, magic link para cliente), Storage com bucket privado por cliente (`cliente_id/processo_id/`), acesso somente por URLs assinadas de curta duração.
- **Automação no banco**: Edge Functions e pg_cron (lembretes, alertas de vencimento, processos parados).
- **Hosting**: Vercel, com ambientes separados (Supabase dev/prod) e branch preview.
- **i18n**: next-intl, dicionários pt e en. Idioma da equipe é independente do idioma do portal (campo `idioma_preferencial` no perfil do cliente).
- **Integrações futuras** (Fases 2–4, não construir antes da hora): Resend, Google Calendar API, Web3Forms, Stripe, Xero, WhatsApp Business API, Anthropic API (sempre com validação humana, conteúdo marcado como gerado por IA).

## Convenções

- **Schema em inglês, interface em português.** Todas as tabelas têm `id uuid`, `created_at`, `updated_at`, RLS ativado desde a primeira migração.
- **Toda regra de permissão vive no banco via RLS.** A interface só esconde o que o usuário não deve ver; o banco garante que ele não acessa mesmo tentando via API direta.
- **Nunca expor a secret key (`SUPABASE_SECRET_KEY`) no cliente.** Só em código de servidor (Server Actions, Route Handlers, Edge Functions).
- **Notas internas e riscos** ficam em colunas/tabelas separadas, com política RLS que exclui a função `client` incondicionalmente — nunca aparecem no portal.
- **Documentos**: soft delete apenas (arquivamento), nunca exclusão permanente; só admin acessa arquivados.
- **Fusos horários**: tudo em UTC no banco, conversão só na interface (BR, Sydney, Brisbane, fuso do cliente).
- **Fases rígidas**: nada da Fase 2 (portal, formulários públicos, propostas, invoices, integrações externas, IA) entra antes da Fase 1 estar validada em uso real.
- **Maior risco do projeto é RLS mal configurado.** Toda tabela nova precisa de teste automatizado de permissão por função, antes de qualquer deploy.

## Funções e permissões (seção 5 do plano)

Funções: `admin`, `director`, `consultant`, `operations`, `finance`, `partner`, `client`.

Implementação: função `get_user_role()` no Postgres + políticas RLS por tabela.
- Consultores: filtrados por `consultor_id = auth.uid()` ou participação na equipe do processo.
- Clientes: filtrados por `client_id` vinculado ao usuário de auth.
- Ver a matriz completa de permissões por módulo na seção 5 do plano antes de criar política nova.

## Identidade visual KMP

- Título/headings: **Cormorant Garamond**.
- Corpo de texto: **Outfit**.
- Cor primária (laranja): `#F27B20`.
- Cor neutra escura (grafite): `#2C2C2C`.
- Fundo: `#F8F7F5`.
- **Sem emoji na interface**, em nenhuma tela ou mensagem de sistema.

## Estrutura de rotas

```
/app/(staff)/...     app da equipe — dashboard, leads, clientes, processos, agenda,
                     tarefas, documentos, guias, financeiro (F3), relatórios,
                     templates, equipe, configurações, busca
/app/(portal)/...    portal do cliente — mesmas convenções de layout, rotas
                     próprias (/portal/login, /portal, /portal/documentos, etc.)
```

## Estado atual (julho/2026)

Sprints 1–7 da Fase 1 construídos e aplicados no Supabase de dev: auth/RLS,
leads (Kanban compartilhado entre consultores — decisão da cliente, diverge da
seção 5), clientes (182 reais importados da pasta KEY MIGRATION), processos,
checklists (5 templates importados do repo kmp-forms), documentos (bucket
privado `documents`, ~2.9k arquivos reais), tarefas, agenda (fusos BR/SYD/BNE),
guias versionados, templates de mensagem, dashboard, linha do tempo, auditoria
(`audit_logs`, só admin) e busca global. Ver `supabase/README.md` para o
detalhe de cada migração e as decisões assumidas.

Pendências conhecidas: Sprint 8 (checklist da seção 32 do briefing — pedir à
cliente; export do CRM antigo), 2 PDFs > 50 MB não importados (limite do plano
Free do Supabase), projeto Supabase de produção ainda não criado, testes pgTAP
(`supabase/tests/database/`) rodados manualmente via SQL Editor. Scripts de
importação em `scripts/`; mapeamento com nomes reais em `import/` (fora do git).

## Dados de demonstração

Registros fictícios levam `is_demo = true` (migração
`20260718120000_is_demo_flag.sql`). Criar: `node scripts/seed-demo.mjs`
(idempotente — não duplica se já existir demo). Remover TODOS os dados demo
sem tocar em dados reais: `node scripts/clean-demo.mjs` (imprime contagem de
dados reais antes/depois como prova). Filhas caem em cascata pelas FKs.

## Plano de sprints da Fase 1 (seção 10)

1. Setup: repo, Supabase dev/prod, migrações base, auth, funções, RLS inicial, layout KMP.
2. Leads: CRUD, pipeline Kanban, filtros, histórico, alertas de inatividade.
3. Clientes: conversão transacional, perfil com abas, dependentes, documentos de identidade.
4. Processos: tipos de serviço, etapas configuráveis, histórico de status, regras básicas.
5. Checklists e documentos: templates, 10 status, percentual, upload com versões e arquivamento.
6. Tarefas e agenda: visões, carga da equipe, resumo obrigatório pós-consulta.
7. Guias, templates de mensagem, dashboard, linha do tempo, auditoria, busca global.
8. Dados de demonstração, checklist de qualidade (seção 32), migração do CRM atual, ajustes finais.

Cada sprint termina com deploy em preview na Vercel antes de avançar. A Fase 2 só começa após a equipe usar a Fase 1 com clientes reais por algumas semanas.

## Variáveis de ambiente

Ver `.env.local` (nunca versionado). Este projeto usa o formato novo de chaves do Supabase (`sb_publishable_...` / `sb_secret_...`, substitutas de `anon`/`service_role`; ver [Understanding API keys](https://supabase.com/docs/guides/api/api-keys)):

- `NEXT_PUBLIC_SUPABASE_URL` — pública, pode ir ao cliente.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — pública (`sb_publishable_...`), respeita RLS.
- `SUPABASE_SECRET_KEY` — **somente servidor** (`sb_secret_...`), nunca prefixo `NEXT_PUBLIC_`, nunca importada em componente client. Ignora RLS — substitui a antiga service role key.
