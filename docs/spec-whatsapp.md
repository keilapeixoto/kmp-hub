# Especificação: WhatsApp no KMP Hub

Pedido original da Keila (integrar WhatsApp, com Kanban, templates de texto e
áudio, follow-up automático, lembretes) + decisões tomadas ao construir.

## 1. Caminho técnico escolhido

Duas opções foram discutidas com a Keila:

- **API oficial da Meta (Cloud API)**: sem risco de banimento, mas exige
  verificação de negócio (dias de espera) e um número dedicado só para
  automação — não dá mais pra usar o app comum do WhatsApp Business nesse
  número.
- **Extensão de navegador automatizando o WhatsApp Web** (mesma categoria do
  waTidy, que a Keila usava antes): mais rápida de montar, sem verificação de
  negócio, sem número dedicado — mas **não é autorizada pelos termos de uso
  do WhatsApp**, e carrega risco real de banimento do número se a Meta
  detectar automação. A Keila optou por este caminho, ciente do risco.

Decisão: **extensão de navegador**, para rodar sem custo, sem depender de
verificação de negócio.

## 2. Quando funciona

Uma extensão de navegador só roda enquanto o Chrome está aberto — não existe
"rodando sozinha de madrugada" sem um servidor à parte (que teria custo e
complexidade extra, fora do escopo desta primeira fase, também por decisão da
Keila). Follow-ups agendados fora do horário em que o Chrome está aberto
ficam na fila e disparam a próxima vez que a extensão estiver ativa.

Para não exigir duas abas abertas (Hub + WhatsApp Web), a extensão vai manter
a conexão com o WhatsApp Web num **documento invisível** (Offscreen Document,
Manifest V3) e mostrar as conversas num **painel lateral** (Side Panel) que
fica fixo ao lado de qualquer aba, incluindo o Hub — não uma aba de WhatsApp
Web visível separada.

## 3. Sequência de construção

1. **Schema + Kanban no Hub, com dados de demonstração** — concluído.
2. **Extensão de navegador (`extension/`)** — concluída na primeira versão,
   ver seção 7. Conecta com o WhatsApp Web de verdade, lendo/escrevendo nas
   mesmas tabelas do Kanban.
3. Biblioteca de templates de áudio (upload/gravação, reuso rápido).
4. Follow-up automático e lembretes — regras de disparo por etapa/tempo parado.

## 4. Schema (migração `20260907120000_whatsapp_schema.sql`)

- `whatsapp_conversations`: uma conversa por contato, com `etapa` (Kanban),
  vínculo opcional a `client_id`/`case_id`.
- `whatsapp_messages`: histórico append-only de mensagens por conversa.
- `whatsapp_templates`: mensagens/áudios prontos para reenvio rápido.

**Kanban compartilhado entre consultores** — mesma decisão já tomada para
leads (`20260711140000_leads_rls_consultores_compartilhado.sql`): qualquer
consultor vê/edita qualquer conversa, sem exclusão nem dono fixo. Sem nenhuma
política para operations/finance/partner/client — ferramenta comercial
interna, nunca visível no portal.

Etapas do Kanban (`lib/whatsapp/constants.ts`, ajustáveis): novo contato,
aguardando resposta do cliente, aguardando resposta da equipe, pendência de
documento, agendamento, resolvido.

## 5. Dados de demonstração

`scripts/seed-demo.mjs` cria 6 conversas (uma por etapa) + 2 templates de
texto, todos `is_demo = true`. `scripts/clean-demo.mjs` remove tudo sem
tocar em dados reais.

## 6. Segurança

Mesma convenção do resto do Hub: RLS por linha, sem exceção para roles fora
da equipe comercial. Áudios de template/mensagem, quando existirem, vão para
o bucket privado já existente (`documents`), nunca link público.

## 7. Extensão de navegador (`extension/`)

Manifest V3, sem bundler — arquivos JS puros, carregada via "Carregar sem
compactação" no `chrome://extensions` (não publicada na Chrome Web Store).
Ver `extension/README.md` para passo a passo de instalação e debug.

- **Autenticação**: login próprio (e-mail/senha do Hub) via API REST do
  Supabase Auth (`/auth/v1/token`), sessão guardada em `chrome.storage.local`.
  Todas as leituras/escritas passam pelo RLS já existente, como qualquer
  outro cliente autenticado do Hub.
- **Sem SDK**: `extension/lib/supabase-rest.js` usa fetch direto pro REST do
  Supabase (mesmo padrão de `lib/storage-admin/email.ts`) — uma extensão MV3
  sem bundler não importa facilmente o pacote npm `@supabase/supabase-js`.
- **Arquitetura**: `content-script.js` roda dentro da aba do WhatsApp Web
  (lê mensagens, envia); `background.js` (service worker) é o hub — fala com
  o Supabase e repassa mensagens entre o content script e o painel lateral;
  `sidepanel.html/js` é a interface (lista de conversas, thread, templates).
- **Envio de mensagem**: usa o link oficial de "clique para conversar" do
  WhatsApp (`web.whatsapp.com/send?phone=...&text=...`) em vez de tentar
  buscar o contato pela UI — mais confiável.
- **Limitações conhecidas da v1** (detalhadas em `extension/README.md`): só
  detecta mensagem nova na conversa que está aberta na aba (não observa a
  lista lateral inteira); usa o nome do contato como identificador por
  enquanto, não o número puro (o WhatsApp Web não expõe o número de forma
  óbvia no DOM para contatos salvos); mensagens enviadas direto pelo
  WhatsApp Web (sem passar pelo painel da extensão) não são registradas.
- **Não testado ao vivo por mim**: os seletores de DOM em
  `content-script.js` (`SELECTORS`) foram escritos sem acesso a um navegador
  real neste ambiente — esperado precisar de ajuste depois do primeiro teste
  da Keila contra o WhatsApp Web de verdade.
