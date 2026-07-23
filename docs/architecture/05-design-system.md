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
| `--font-heading` | Cormorant Garamond | Títulos, `h1`/`h2`, nomes de cliente/processo. |
| `--font-body` | Outfit | Todo o resto — corpo de texto, labels, botões. |
| `--color-kmp-orange` | `#F27B20` | Ação primária, destaque, estado ativo. |
| `--color-kmp-graphite` | `#2C2C2C` | Texto principal, sidebar. |
| `--color-kmp-bg` | `#F8F7F5` | Fundo da aplicação. |

Definidos em `app/globals.css` via `@theme` (sintaxe nativa do Tailwind v4 —
não existe `tailwind.config.js` neste projeto, e não deve ser recriado; a
v4 resolve tudo via CSS). **Nunca usar cor hexadecimal solta num componente**
— sempre a variável de tema (`bg-kmp-orange`, não `bg-[#f27b20]`).

**Sem emoji em nenhuma tela ou mensagem de sistema.** Regra do produto, sem
exceção — nem em toast de sucesso, nem em placeholder.

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

## Tipografia

- `font-heading` (Cormorant Garamond) só em títulos de página/seção —
  nunca em botão, label, ou texto de corpo, mesmo que "pareça elegante".
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
