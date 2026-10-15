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

**Redesign "âmbar" (out/2026, pedido da Keila — o visual anterior cansava a vista):**

- Fonte da interface: **Outfit** (a mesma dos PDFs), carregada em
  `app/layout.tsx`. A marca "HUB CRM" do cabeçalho usa **Montserrat**
  (`font-wordmark`). Antes: Plus Jakarta Sans (set/2026) e, antes dela,
  Cormorant Garamond + Outfit.
- **PDFs e documentos** (briefings, guias, relatórios) continuam com
  Cormorant Garamond + Outfit.
- Logo no cabeçalho: símbolo KMP em degradê laranja→vermelho-escuro com
  "kmp" branco (`public/kmp-logo-mark.svg`), separador fino e "HUB" (grosso)
  com "CRM" laranja embaixo — sem "consulting".
- Cor primária de marca (laranja): `#F27B20` — destaques, estado ativo de
  etiquetas, "CRM". **Botão principal e aba ativa: grafite em pílula**
  (`bg-kmp-primary`, que vira verde-menta no modo escuro).
- Fundo claro: degradê predominantemente cinza (`#D6D7DB` → `#E8E7E2`) com
  âmbar só no canto superior direito e uma mancha suave da cor de cada aba
  (`components/page-wash.tsx`); cartões brancos translúcidos (72%) com
  desfoque. Texto quase preto (`#161814`); os cinzas secundários
  (`text-kmp-text/40…/75`) são escurecidos globalmente em `app/globals.css`.
- Modo escuro "esmeralda": fundo verde quase preto, manchas esmeralda e
  violeta, cartões verde-escuros translúcidos.
- Navegação: abas em pílula no topo (`app/(staff)/_components/top-nav.tsx`),
  sem menu lateral; Biblioteca e Configurações em "Mais". Atalhos do Início
  são blocos coloridos inteiros, na cor de cada módulo.
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
cliente e guarda os dados em `chrome.storage.local`.
`browser-extension/visa-autofill.js` (content script novo, roda em
`online.immi.gov.au/elp/*` — URL da aplicação do Visitor Visa 600,
diferente de `/lusc/*` da tela de login) preenche os campos de verdade:
como os `id`/`name` do ImmiAccount são gerados de novo a cada sessão,
acha cada campo pelo **texto da label em inglês** (`FIELD_MAP`), não
pelo id. Cada entrada do `FIELD_MAP` vale só na sua página (`pagina`,
lida da barra de progresso "N/20") — as mesmas labels se repetem em
páginas diferentes com outro significado (ex.: "Email address" na 7/20 é
o e-mail de correspondência da KMP, não o do cliente); sem identificar a
página, a extensão não preenche nada. Cobertura atual (todas as 20 páginas revisadas): preenche as 2, 3, 5, 6, 8,
9, 11, 12, 16, 17 e 18; a 4 é só conferência (a extensão deixa o "está
correto?" para a Keila); ficam manuais de propósito a 1 (Terms), a 7
(Authorised recipient, dados da KMP) e a 20 (declarações finais e
consentimentos — quem aceita é o cliente). Nas declarações adversas (16
saúde, 17 caráter, e "descumpriu/recusado" da 18) a extensão só marca "No"
quando o cliente respondeu "Não"; nunca marca "Yes". A 10, 13–15 e 19 o
ImmiAccount pula conforme as respostas — se aparecerem numa aplicação,
salvar a estrutura e mapear. Cada entrada do FIELD_MAP aceita `prefixo`
(rótulo casa pelo começo), `fixo` (valor constante, sem campo no Hub) e
`tipo: "presenca"` (marca "Yes" se o cliente informou algo). Estrutura real de
cada página (campos, tipo, obrigatório, visível) em
`import/immi-pages/pagina-NN.estrutura.txt`, gerada por
`pbpaste | python3 scripts/immi-page-skeleton.py` (fora do git, sem valor
digitado, TRN nem dado de cliente). As páginas 6 e 9–18 foram verificadas só
em simulação, ainda sem teste numa aplicação de verdade. **Nunca colar o HTML no chat** (~2,4
MB por página, trava a conversa) **nem salvar o HTML bruto** (traz dados
do cliente). Princípio de segurança mantido em toda a etapa: a extensão só
preenche campos — nunca clica em Previous/Next/Save/Submit, então nunca
avança nem envia a aplicação de visto sozinha.

**Importar aplicação anterior (out/2026, exceção de fase — mesmo pedido da
extensão):** no card "Formulário de Dados" do processo, a equipe envia o PDF
"Record of Responses" que o ImmiAccount gera depois que uma aplicação é
enviada, e o Hub preenche o formulário de coleta como rascunho
(`app/(staff)/processos/import-record-actions.ts`, leitura em
`lib/record-of-responses/`, só visto 600 por enquanto). É o caminho inverso
da extensão. Regras: o PDF é lido no servidor e **não é guardado** (só as
respostas); só preenche campo ainda vazio, nunca sobrescreve resposta do
cliente; declarações de saúde e caráter não são trazidas; o e-mail do
ImmiAccount (da KMP) não vira e-mail do cliente; avisos de dados suspeitos
(ex.: país de nascimento ≠ país do passaporte) aparecem na tela. Testar sem
gravar: `node scripts/dry-run-import-record.mjs "/caminho/Application.pdf"`
(valores mascarados). Dependência nova: `unpdf`.

**Formulário do visto 600 completo (out/2026):** o "Formulário Visto de
Turista (Subclass 600) — Coleta de Dados" ganhou 35 perguntas (perfil, saúde,
caráter, viagem) lidas de `scripts/visa-600-new-fields.json` — o mesmo arquivo
alimenta o script incremental `scripts/add-visa-600-fields.mjs`, o formulário-
base em `scripts/import-case-forms.mjs` e um teste que garante que cada
pergunta tem mapeamento na extensão. **Nunca rodar `import-case-forms.mjs`
em banco com respostas** (apaga o modelo e as respostas); ajustes do modelo
só por `add-visa-600-fields.mjs` e `adjust-visa-600-form.mjs` (ambos com
simulação antes de `--apply`; a exclusão de "Nacionalidade atual" exige
`--remover`). No portal, "Próximo" nunca trava: os obrigatórios só valem no
"Enviar formulário", com a lista do que falta. No card do processo a equipe
edita as respostas ("Editar respostas"); ao enviar, a consultora do processo
recebe e-mail (Resend, `lib/case-forms/notify.ts`; falha do e-mail nunca
impede o envio) e o `/inicio` mostra o card "Formulários dos clientes".
Gravações de respostas são sempre em blocos de 8 com nova tentativa
(`lib/case-forms/save.ts`). Testes: `npm run test:unit` (lib pura) e
`npm run test:extension` (a extensão num jsdom, `tests/extension/`); o fluxo do
portal em Playwright (`tests/e2e/portal/formulario.spec.ts`) precisa de sessão
do portal e de `E2E_FORM_CASE_ID`.

**Domínios e produto (out/2026):** equipe em `crmportal.kmpconsulting.com.au`,
clientes em `clientportal.kmpconsulting.com.au` — mesmo projeto Vercel; no
endereço do cliente o middleware só deixa o portal acessível
(`lib/dominios.ts`), e os links para clientes (formulário, convite, magic
link) usam `NEXT_PUBLIC_PORTAL_URL`. DNS na GoDaddy (CNAME para a Vercel).
A Keila pretende vender o Hub a outras empresas no futuro — **não fixar nada
novo como "KMP" no código** (ver decisão em
`docs/architecture/12-future-scalability.md`).

**Portal do cliente redesenhado (out/2026):** mesmo visual âmbar do Hub
(fundo `PageWash`, cartões translúcidos, logo KMP | HUB com "PORTAL" em
laranja). Início do portal com etapas do processo, "O que falta você fazer"
(percentual do formulário + documentos pedidos) e "Fale com sua consultora"
(WhatsApp/e-mail do perfil). Etapas e contato da consultora vêm de
`lib/portal/resumo.ts` pelo cliente admin, **só para processos que já vieram
da leitura com a sessão do cliente** (RLS prova que o processo é dele); o
cliente não tem SELECT em `case_stages`/`profiles` de propósito. O que o
cliente vê: processos, etapa, formulário, checklist de documentos (com
envio por item e "Outros documentos") e a lista dos arquivos que **ele mesmo**
enviou; não vê notas internas, riscos, invoices nem documentos da equipe.
Envio pelo portal muda o item do checklist para "Enviado"/"Reenviado" e
manda e-mail à consultora (`notifyDocumentUploaded`, Resend; falha do e-mail
nunca impede o envio). Página "Linha do tempo" do portal
(`/portal/linha-do-tempo`, no lugar de Ocupações, que saiu do menu do
portal): fases do processo (concluídas/atual/próximas) e histórico
(`lib/portal/linha-do-tempo.ts` — só início, etapas, status, formulário
enviado e arquivos do próprio cliente). A equipe muda a fase no perfil do
cliente, aba Processos ("Fase que o cliente vê no portal",
`fase-no-portal.tsx`), que é a mesma etapa do Pipeline.
**Gravação do formulário do portal vai pelo cliente admin** depois de checar
o processo com a sessão do cliente: com a sessão do cliente, as políticas de
`case_form_responses` levavam ~5 s por linha e estouravam o tempo do banco
(57014), travando o "Próximo". Causa de fundo (políticas chamando
`get_user_role()` por linha, sem `(select ...)`) ainda não corrigida.

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
- `NEXT_PUBLIC_PORTAL_URL` — pública; endereço do portal do cliente usado nos links e no magic link (sem barra no final). Sem ela, usa `NEXT_PUBLIC_SITE_URL`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — **somente servidor**, credencial OAuth2 do Google Cloud Console (integração Calendar/Gmail, ver Estado atual). Passo a passo de como gerar em `docs/architecture/` ou pedir à Keila/Claude.
