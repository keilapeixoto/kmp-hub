# KMP Hub — extensão de WhatsApp

Extensão de navegador (Chrome, Manifest V3) que liga uma aba do WhatsApp Web
às conversas do KMP Hub (`/whatsapp`). Ver `docs/spec-whatsapp.md` na raiz do
projeto para o contexto completo da decisão (por que extensão em vez da API
oficial da Meta, riscos, etc.).

## Como carregar (modo desenvolvedor)

1. Abra `chrome://extensions` no Chrome.
2. Ative **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (Load unpacked) e selecione a
   pasta `extension/` deste repositório.
4. Clique com o botão direito no ícone da extensão → **Opções** — cole a URL
   do projeto Supabase e a chave publicável (`NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do `.env.local` do Hub — as duas
   são públicas, não são segredo).
5. Abra `web.whatsapp.com` numa aba (pode ficar fixada/minimizada) e escaneie
   o QR code se ainda não estiver logada.
6. Clique no ícone da extensão na barra do Chrome — abre o painel lateral.
   Faça login com seu e-mail/senha do Hub (mesmo login do
   `/login` do Hub — precisa ter conta com função `consultant`, `director` ou
   `admin`).

## O que já funciona

- Login/sessão (mesma conta do Hub, respeitando RLS).
- Painel lateral: lista de conversas, abrir uma conversa, ver histórico,
  mandar mensagem de texto (com atalho pra inserir um template salvo).
- Ao mandar uma mensagem pelo painel, a extensão navega a aba do WhatsApp
  Web pro contato certo (via link `web.whatsapp.com/send?phone=...`, o
  mesmo mecanismo oficial de "clique para conversar" do WhatsApp) e clica
  em enviar.
- Ao receber uma mensagem na conversa que está aberta na aba do WhatsApp
  Web, a extensão detecta e grava no Hub.

## Limitações conhecidas da primeira versão (esperado precisar ajustar)

- **Seletores do WhatsApp Web** (`content-script.js`, objeto `SELECTORS` no
  topo do arquivo): foram escritos sem conseguir testar contra a página real
  neste ambiente — o WhatsApp muda a estrutura com frequência. Se mensagens
  não aparecerem ou o envio falhar, o primeiro passo é abrir o DevTools
  (botão direito → Inspecionar) no elemento em questão e comparar com o
  seletor correspondente.
- **Número de telefone**: o WhatsApp Web geralmente mostra o nome salvo do
  contato no cabeçalho da conversa, não o número puro — por enquanto a
  extensão usa esse nome também como "telefone" pra identificar a conversa,
  o que pode criar uma conversa duplicada em vez de casar com uma já
  existente (ex.: uma criada manualmente no Hub com o número certo). Corrigir
  isso exige inspecionar onde o WhatsApp Web expõe o número de verdade
  (painel de informações do contato, ou o JID na URL) — próxima iteração.
- **Só detecta mensagens da conversa aberta**: se uma mensagem chegar numa
  conversa que não está em foco na aba do WhatsApp Web, a extensão não vê —
  não observa a lista lateral de conversas ainda, só o painel da conversa
  ativa.
- **Só funciona com o Chrome aberto**, com a aba do WhatsApp Web carregada —
  não roda em segundo plano com o computador desligado (decisão da Keila,
  por não precisar de servidor/custo extra).
- **Mensagens enviadas direto pelo WhatsApp Web** (sem passar pelo painel da
  extensão) não são registradas no Hub — só as enviadas pelo painel lateral.

## Debugar

- **Painel lateral**: botão direito no painel → Inspecionar.
- **Content script** (roda na aba do WhatsApp Web): DevTools normal da aba
  (F12), aba Console — os `console.log`/erros do `content-script.js`
  aparecem ali.
- **Background (service worker)**: em `chrome://extensions`, clique em
  "service worker" no card da extensão pra abrir o DevTools dele.
