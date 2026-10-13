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
- **Fases rígidas**: nada da Fase 2 (portal, formulários públicos, propostas, invoices, integrações externas, IA) entra antes da Fase 1 estar validada em uso real. **Exceção aberta (set/2026):** emissão de invoices adiantada a pedido da Keila, antes da Fase 1 fechar (Sprint 8/checklist da seção 32 e projeto Supabase de produção ainda pendentes). Escopo inicial: registro/emissão interna (sem Stripe/Xero — essas integrações continuam fora de escopo até serem pedidas). **Exceção aberta (out/2026):** integração com Google Calendar/Gmail (agenda real + e-mail não lido/urgente no Início, envio de e-mail pelo Gmail), também adiantada a pedido da Keila — ver "Integração Google" em Estado atual. **Exceção aberta (out/2026):** extensão de navegador pra preenchimento automático do ImmiAccount (fora do app Next.js, ver "Extensão ImmiAccount Autofill" em Estado atual).
- **Maior risco do projeto é RLS mal configurado.** Toda tabela nova precisa de teste automatizado de permissão por função, antes de qualquer deploy.

## Funções e permissões (seção 5 do plano)

Funções: `admin`, `director`, `consultant`, `operations`, `finance`, `partner`, `client`.

Implementação: função `get_user_role()` no Postgres + políticas RLS por tabela.
- Consultores: filtrados por `consultor_id = auth.uid()` ou participação na equipe do processo.
- Clientes: filtrados por `client_id` vinculado ao usuário de auth.
- Ver a matriz completa de permissões por módulo na seção 5 do plano antes de criar política nova.

## Identidade visual KMP

- Título/headings e corpo de texto **na interface do produto**: **Plus
  Jakarta Sans** (fonte única, desde set/2026 — substituiu Cormorant
  Garamond + Outfit nas telas do Hub). Títulos usam peso 700/800 pra manter
  a distinção visual que a serifada tinha.
- **PDFs e documentos** (briefings, guias, relatórios) continuam com
  Cormorant Garamond + Outfit — identidade própria dos documentos oficiais,
  não muda com o redesign da interface.
- Cor primária (laranja): `#F27B20`.
- Cor neutra escura (grafite): `#2C2C2C`.
- Fundo: `#F8F7F5`.
- **Sem emoji na interface**, em nenhuma tela ou mensagem de sistema.

## Estrutura de rotas

```
/app/(staff)/...     app da equipe — dashboard, leads, clientes, processos, agenda,
                     tarefas, documentos, guias, financeiro (invoices — adiantado
                     da Fase 2, ver seção "Convenções"), relatórios, templates,
                     equipe, configurações, busca
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

**Sincronização automática da KEY MIGRATION (out/2026):** `scripts/sync-key-migration.mjs`
roda sem supervisão (pensado para launchd/cron no computador da Keila — a
pasta só existe localmente, nunca neste repo). Reaproveita a heurística do
`scan-key-migration.mjs` pra varrer de novo, mas só sobe arquivo automático
pra pasta já aprovada em `import/key-migration-map.csv` (acao=importar);
pasta nova vai pra `import/key-migration-pendentes.csv` sem subir nada —
evita documento de imigração ir pro cliente errado sem revisão. Aprovar uma
pasta nova é mover a linha do pendentes pro map.csv manualmente.

**Financeiro/invoices (set/2026, exceção de fase — ver Convenções acima):**
`invoices`/`invoice_items` (`lib/invoices/`, `app/(staff)/financeiro/`), só
`admin`/`finance` (RLS em `018_invoices_rls.test.sql`). Numeração automática
por trigger (`INV-<ano>-####`). PDF gerado no navegador com `html2canvas` +
`jspdf` (offscreen clone, sem servidor) — modelo de tela e de PDF portados de
um gerador HTML avulso que a Keila já usava (PayID/PIX, AUD/BRL, desconto
fixo/percentual, GST 10% opcional). Sem Stripe/Xero/cobrança automática —
fora de escopo até serem pedidos. Portal do cliente não vê invoices ainda
(decisão da Keila, v1 é só uso interno da equipe).

**Portal de entrada / tela "Início" (out/2026):** nova tela `/inicio`
(`app/(staff)/inicio/`), primeira coisa que a equipe vê após o login (trocou
`/processos?view=kanban` — Pipeline continua existindo, só não é mais a
porta de entrada). Saudação, cartões de resumo do dia (tarefas vencidas,
processos parados, leads novos, agenda de hoje), atalhos de prioridade
("Visões rápidas", reaproveitando a mesma lógica da Fila), compromissos de
hoje, atalhos pros módulos principais e links externos fixos (ImmiAccount,
e-mail). Seção "Novidades de imigração" — pedido da Keila, estilo "jornal do
dia" — usa tabela nova `immigration_news` (`20261012120000_immigration_news.sql`,
**ainda não aplicada no Supabase de dev**, RLS em
`019_immigration_news_rls.test.sql`; admin/diretor publicam, equipe lê),
conteúdo **manual** por enquanto — puxar automaticamente de um site de
imigração (pedido original da Keila) esbarrou em falta de RLS/feed oficial
confiável do Department of Home Affairs e em bloqueio de rede do ambiente de
desenvolvimento; fica para quando ela liberar o domínio e topar manter um
scraper. O card de publicar novidade fica sempre claro (fora do tema
escuro), mesmo padrão dos outros cartões com formulário — ver "Dark mode" em
`docs/architecture/05-design-system.md`.

**Integração Google (out/2026, exceção de fase — ver Convenções acima):**
cada usuário da equipe conecta sua própria conta Google em
`/configuracoes/integracoes` (OAuth2, `lib/google/`); guardado em
`google_connections` (migração `20261013090000_google_connections.sql`,
**ainda não aplicada no Supabase de dev**). Essa tabela não tem **nenhuma**
política RLS de propósito — RLS ativado + zero políticas trava total pra
`anon`/`authenticated`, inclusive admin; só `createAdminClient()`
(`SUPABASE_SECRET_KEY`) toca nela, porque guarda `refresh_token` do Google
(ver teste `020_google_connections_rls.test.sql`, que confirma o bloqueio
total em vez de testar uma política). O card "Agenda e e-mail de hoje" no
`/inicio` mostra a agenda real do Google Calendar do dia e e-mails não
lidos, com "urgente" sendo só o marcador `IMPORTANT` que o próprio Gmail
calcula (nenhuma classificação nossa). Perfil do cliente ganhou "Enviar
e-mail" (`app/(staff)/clientes/_components/send-email-panel.tsx`), que manda
pelo Gmail de quem está logado — diferente do Resend que já existe só pros
avisos automáticos do sistema (`lib/storage-admin/email.ts`). Leitura de
conteúdo de e-mail (abrir corpo de mensagens específicas, não só
assunto/remetente/trecho) ficou de fora deste primeiro corte — avaliar com
a Keila se/quando for pedido, dado que é o ponto mais sensível (conteúdo de
cliente).

**Extensão ImmiAccount Autofill (out/2026, exceção de fase — ver Convenções
acima):** extensão de navegador (Chrome/Edge, `browser-extension/`, fora do
app Next.js — ver `browser-extension/README.md` pra instalar) que
preenche sozinha o código de autenticação de duas etapas do ImmiAccount
(Department of Home Affairs manda por e-mail) e envia o formulário de
login. Fluxo: cada usuário gera um token em Configurações → Integrações
(tabela `extension_tokens`, migração `20261013100000_extension_tokens.sql`,
já aplicada no Supabase de dev; mesmo padrão de `google_connections` — RLS
ativado sem nenhuma política, só `createAdminClient()` acessa, teste em
`021_extension_tokens_rls.test.sql`), cola na extensão; o content script
roda só em `online.immi.gov.au/lusc/*`, detecta o campo
`#authenticationCode`, chama `GET /api/extension/immiaccount-code`
(autenticado por esse token, não por cookie de sessão — CORS liberado
porque o token já é a autenticação) que busca no Gmail já conectado
(`lib/google/gmail.ts getLatestImmiAccountCode`, filtra e-mail de
`noreply-lusc@homeaffairs.gov.au` dos últimos 10 min pra nunca reusar
código velho). Também avança sozinho a tela "Login successful" (e só essa
tela de confirmação de login — nunca um "Next" de etapa real de visto).

**Preenchimento do formulário de visto (Subclass 600, em construção):**
segunda parte do pedido original da Keila — reaproveita o sistema de
"Formulários de coleta de dados" que já existia (`case_form_templates`,
o cliente preenche no portal em etapas), em vez de um formulário novo.
Dois endpoints novos autenticados pelo mesmo token da extensão
(`lib/extension/visa-form.ts`): `GET /api/extension/visa-cases?q=` busca
processos com o "Formulário Visto de Turista (Subclass 600) — Coleta de
Dados" já preenchido, filtrando pelo mesmo critério de visibilidade de
`cases` (consultor só vê os seus, admin/diretor/financeiro veem todos);
`GET /api/extension/visa-form-data?caseId=` devolve os campos e
respostas desse processo. O popup da extensão já busca/seleciona o
cliente e guarda os dados em `chrome.storage.local`. **Falta** o content
script que lê esses dados e preenche os campos de verdade nas páginas de
aplicação do ImmiAccount — depende de mapear a URL e a estrutura real
dessas páginas (ainda não feito, precisa de screenshots da Keila, mesmo
processo usado pra mapear a tela de login). Princípio de segurança
mantido em toda a etapa: a extensão só preenche, nunca clica em enviar a
aplicação de visto.

## Dados de demonstração

Registros fictícios levam `is_demo = true` (migração
`20260718120000_is_demo_flag.sql`). Criar: `node scripts/seed-demo.mjs`
(idempotente — não duplica se já existir demo). Remover TODOS os dados demo
sem tocar em dados reais: `node scripts/clean-demo.mjs` (imprime contagem de
dados reais antes/depois como prova). Filhas caem em cascata pelas FKs.

## Testes e2e (Playwright)

Configurado, cobrindo login da equipe/navegação, o fluxo de processos e o
portal do cliente. Login não é automatizado (senha da equipe e magic link
do portal são gerados manualmente uma vez; a sessão fica salva em
`playwright/.auth/*.json`, gitignored) — ver `playwright/setup/README.md`
para o passo a passo. Rodar: `npm run test:e2e:login:staff` e
`npm run test:e2e:login:portal` (uma vez, ou quando a sessão expirar),
depois `npm run test:e2e`. Testes em `tests/e2e/{staff,portal}/`.

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
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — **somente servidor**, credencial OAuth2 do Google Cloud Console (integração Calendar/Gmail, ver Estado atual). Passo a passo de como gerar em `docs/architecture/` ou pedir à Keila/Claude.
