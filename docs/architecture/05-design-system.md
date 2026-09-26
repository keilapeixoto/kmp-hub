# 5. Design System

## Estado atual vs. estado alvo (leia isto primeiro)

O projeto hoje usa **Tailwind CSS v4 puro**, sem nenhuma biblioteca de
componentes — classes utilitárias escritas à mão em cada componente
(`rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white`
repetido dezenas de vezes). **shadcn/ui é stack obrigatória a partir de
agora**, mas retrofitar ~80 componentes existentes de uma vez não é
recomendável — o plano de adoção incremental está no documento
[06 — Component Architecture](./06-component-architecture.md). Este
documento descreve as regras visuais que valem **hoje e depois** da adoção;
elas não mudam com a biblioteca por baixo.

## Identidade visual (fixa, definida pelo produto — não é escolha técnica)

| Token | Valor | Uso |
|---|---|---|
| `--font-heading` | Plus Jakarta Sans | Títulos, `h1`/`h2`, nomes de cliente/processo. |
| `--font-body` | Plus Jakarta Sans | Todo o resto — corpo de texto, labels, botões. |
| `--color-kmp-orange` | `#F27B20` | Ação primária, destaque, estado ativo. |
| `--color-kmp-orange-deep` | `#C85A0E` | Segundo tom em gradientes de destaque (cartão hero, ícone ativo) — nunca sozinho. |
| `--color-kmp-graphite` | `#2C2C2C` | Texto principal. |
| `--color-kmp-bg` | `#F8F7F5` | Fundo da aplicação. |

Definidos em `app/globals.css` via `@theme` (sintaxe nativa do Tailwind v4 —
não existe `tailwind.config.js` neste projeto, e não deve ser recriado; a
v4 resolve tudo via CSS). **Nunca usar cor hexadecimal solta num componente**
— sempre a variável de tema (`bg-kmp-orange`, não `bg-[#f27b20]`).

**Atualização (set/2026): a interface do produto passou de duas fontes
(Cormorant Garamond serifada + Outfit) para uma única, Plus Jakarta Sans.
Isso vale só pra tela — PDFs e documentos (briefings, guias, relatórios)
continuam em Cormorant Garamond + Outfit, sem mudança. `--font-heading` e
`--font-body` continuam existindo como tokens separados na interface
(resolvem para a mesma família, mas com pesos/tamanhos diferentes por
convenção — ver Tipografia abaixo), então nenhum dos ~110 usos existentes
de `font-heading`/`font-body` no código precisou mudar.**

**Sem emoji em nenhuma tela ou mensagem de sistema.** Regra do produto, sem
exceção — nem em toast de sucesso, nem em placeholder.

## Paleta de módulos (navegação e ícones, não é sobre estado)

**Atualização (set/2026):** cada módulo da sidebar tem sua própria cor de
ícone — pedido explícito da Keila pra ficar "mais colorido e vivo" sem
perder a identidade. O laranja continua a cor de maior peso (views
principais como Pipeline/Dashboard, cartão em destaque do dashboard); as
demais só diferenciam módulo de módulo. Implementado em `lib/ui/accent.ts`
(`Accent` + `ACCENT_STYLES`) e consumido por `Sidebar` e pelos `StatCard`
do dashboard — qualquer tela nova que precise desse padrão importa dali,
nunca reescreve as classes na mão.

| Token | Valor | Módulo |
|---|---|---|
| `--color-kmp-leads` / `-deep` | `#2A8FA0` / `#1F6E7C` | Leads |
| `--color-kmp-clientes` / `-deep` | `#6C5CE7` / `#5140C4` | Clientes |
| `--color-kmp-processos` / `-deep` | `#2E9B63` / `#217A4C` | Processos |
| `--color-kmp-agenda` / `-deep` | `#D6A419` / `#AD8210` | Tarefas, Agenda |
| `--color-kmp-documentos` / `-deep` | `#9B4F8E` / `#7A3A70` | Guias, Templates, Ocupações |
| `--color-kmp-config` / `-deep` | `#3B6FD6` / `#2A54B0` | Configurações (todos os 8 itens do grupo) |
| `--color-kmp-finance` / `-deep` | `#C23B6E` / `#9A2C56` | Financeiro (invoices) |
| `--color-kmp-alert` / `-deep` | `#D6455F` / `#AD2F45` | Vencimentos; estado `warn` de qualquer `StatCard` |

Todo módulo tem cor — não existe mais um grupo "sem destaque" na sidebar
(v1 deixava Configurações neutro; a Keila pediu pra colorir também).
Ícone sempre em bloco (`icon-tile`, ~28-36px, `rounded-lg`/`rounded-xl`,
gradiente da cor pro seu `-deep`) — nunca cor sólida chapada.

**Atualização (set/2026): chrome escuro na sidebar e na header bar.**
Pedido da Keila com uma referência visual de outro CRM (fundo roxo atrás
do menu, ícones coloridos por cima) — mesma ideia, mas com a identidade
já documentada aqui, e laranja vibrante como cor dominante (pedido
explícito dela, "mais laranja que preto" e depois "mais vibrante"):
`bg-gradient-to-br from-kmp-orange via-kmp-orange to-kmp-graphite` na
`<aside>` e `bg-gradient-to-r from-kmp-orange via-kmp-orange
to-kmp-graphite` na `<header>` — usa o `--color-kmp-orange` puro (não o
`-deep`) nos dois primeiros stops, o grafite só aparece no canto oposto
(embaixo na sidebar, à direita na header), pra dar profundidade sem virar
o protagonista. Texto/ícones em
branco com opacidade (`text-white/70`, hover `text-white`), e a linha
ativa da sidebar vira `bg-white/10 text-white` — fixo, não varia mais por
módulo (o `activeRow` por módulo que existia em `ACCENT_STYLES` foi
removido; só o `tile` do ícone continua colorido por módulo, que é o que
dá o efeito "ícones vivos sobre fundo colorido" do exemplo).

O topo da sidebar troca o texto "KMP Hub" pelo logo real (`/kmp-logo.png`,
mesmo arquivo do cabeçalho da invoice — fundo branco arredondado + "kmp"
laranja + "consulting." branco, pensado pra sentar sobre um fundo laranja)
seguido de "Hub" em texto (`<img src="/kmp-logo.png" .../> Hub`).

## Paleta funcional (estados, não é sobre marca)

Além das cores de marca, o sistema usa uma paleta funcional consistente para
estado — **não varie isso por tela**:

| Estado | Classe | Onde aparece |
|---|---|---|
| Sucesso / aprovado | `bg-green-50 text-green-700` | Status aprovado, checklist concluído. |
| Atenção / pendente | `bg-amber-50 text-amber-700` | Pendente, aguardando, prazo próximo. |
| Erro / bloqueado | `bg-red-50 text-red-700` | Rejeitado, incorreto, cancelado. |
| Neutro / informativo | `bg-kmp-graphite/10 text-kmp-graphite/70` | Rascunho, arquivado, sem ação. |
| Ativo / em progresso | `bg-blue-50 text-blue-700` | Ativo, em andamento. |

Qualquer badge de status novo escolhe uma dessas cinco — nunca inventa uma
sexta cor sem justificativa documentada aqui.

**Exceção documentada:** o fundo das colunas do Kanban de processos
(`cases-overview-kanban.tsx`) usa um tom acima (`-100` em vez de `-50`,
com o contador em `-700` em vez de cinza) — pedido explícito da Keila
pra ficar "mais vivo" numa área com pouco texto sobre a cor (só cartões
brancos por cima). Badges de status em texto (uma linha, uma palavra)
continuam em `-50`/`-700` — o tom mais forte é só pra fundo de área
grande.

## Tipografia

- `font-heading` (Plus Jakarta Sans, peso 700/800) só em títulos de
  página/seção — mantém o peso mais forte que distinguia o antigo título
  serifado, mesmo a família sendo a mesma do corpo agora.
- Tamanhos: `text-2xl` para `h1` de página, `text-lg` para título de card/
  seção, `text-sm` para corpo padrão, `text-xs` para metadado secundário
  (data, contagem, label de campo).
- Português brasileiro em toda a interface, incluindo mensagens de erro e
  vazio ("Nenhum documento cadastrado.", nunca "No documents found.").

## Espaçamento e layout

- Escala do Tailwind padrão (`space-y-4`, `gap-2`, `p-6`) — não criar valores
  arbitrários (`p-[13px]`).
- Card padrão: `rounded-lg bg-white p-6 shadow-sm` (ou `p-4` para cards mais
  densos, como itens de lista).
- Página típica: `space-y-6` no container raiz, título + ação principal
  alinhados em `flex items-center justify-between`.
- Grid responsivo: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
  como padrão para cards de dashboard/hub.

## Componentes visuais — regras por tipo

### Botões

- **Primário** (uma ação por tela, no máximo): `bg-kmp-orange text-white`,
  hover `opacity-90`.
- **Secundário**: `bg-kmp-graphite/10 text-kmp-graphite`, hover
  `bg-kmp-orange hover:text-white`.
- **Destrutivo** (arquivar, excluir, remover): texto `text-red-600`, sem
  fundo — nunca um botão vermelho sólido de primeira leitura; ações
  destrutivas **sempre** passam por `confirm()` ou modal antes de executar.
- Todo botão de submit mostra estado de carregamento (`"Salvando…"`, nunca
  spinner sozinho sem texto) e fica `disabled` durante o envio.

### Inputs e formulários

- `rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite`,
  foco `focus:border-kmp-orange focus:ring-1 focus:ring-kmp-orange`.
- Label sempre visível acima do campo (`text-sm font-medium`), nunca só
  placeholder como label.
- Erro de validação aparece abaixo do campo/formulário em
  `text-sm text-red-600`, nunca só uma borda vermelha sem texto explicando o
  que está errado.

### Tabelas e listas

- Lista como cards (`divide-y divide-black/5` dentro de um card branco) é o
  padrão do projeto, não `<table>` HTML — mais fácil de tornar responsivo e
  de intercalar ações inline por linha.
- Cabeçalho de seção com contagem: `{titulo} <span class="rounded-full
  bg-black/5 px-2 py-0.5 text-xs">{count}</span>`.

### Dashboards e cards de indicador

- Card de métrica: label em `text-xs uppercase tracking-wide
  text-kmp-graphite/50` acima, valor grande em `font-heading text-3xl` ou
  `text-2xl` abaixo.
- Barra de progresso: `h-2 rounded-full bg-black/5` com uma div interna
  `bg-kmp-orange` de largura percentual — mesmo padrão em checklist e em
  uso de armazenamento.

### Modais e confirmação

- Hoje o projeto usa `window.confirm()` para confirmação destrutiva simples
  (arquivar, excluir). É aceitável para ações de um clique com uma frase de
  aviso; **não é aceitável** para fluxos com mais de uma decisão (isso exige
  um modal de verdade). Quando shadcn/ui for adotado, `AlertDialog` substitui
  `confirm()` — ver documento 06.

### Avatares

- Com foto: `rounded-full object-cover`. Sem foto: círculo com iniciais do
  nome (`bg-kmp-graphite/10 text-kmp-graphite/60`, primeira letra
  maiúscula) — nunca um ícone genérico de usuário.

## Acessibilidade (mínimo obrigatório, não aspiracional)

- Todo `<input>`/`<select>` tem `aria-label` ou `<label>` associado.
- Contraste de texto sobre `kmp-bg`/branco segue no mínimo AA (a paleta
  definida já cumpre isso — não escurecer/clarear sem checar contraste).
- Nenhuma informação é comunicada só por cor (status sempre tem texto,
  não só a cor do badge).

## Dark mode

**Não existe hoje e não é prioridade da Fase 1** (produto interno de uso em
horário comercial). Se/quando for construído, os tokens de tema em
`app/globals.css` já estão centralizados o suficiente para um par
`:root`/`[data-theme="dark"]` sem reescrever componentes — não é um
retrabalho grande, mas também não deve ser antecipado sem pedido explícito.
