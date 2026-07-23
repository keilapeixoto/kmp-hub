# 6. Component Architecture

## Server vs. Client — a decisão mais importante deste documento

**Todo componente nasce Server Component.** Ele só vira `"use client"`
quando precisa de pelo menos uma destas coisas:

- Estado local (`useState`, `useTransition`, `useActionState`).
- Handler de evento no navegador (`onClick`, `onChange`, `onBlur`).
- API do navegador (`navigator.clipboard`, `localStorage`).

**A fronteira é o componente mais folha possível, nunca a página inteira.**
Exemplo real do projeto: `ChecklistPanel` é um Server Component `async` que
busca categorias e monta a árvore de itens; dentro dele,
`UploadDocumentForm` é um Client Component isolado só porque precisa de
`useActionState` para mostrar aviso de duplicidade. Todo o resto da página
(navegação, listagem, textos) continua sendo Server Component e nunca baixa
JavaScript desnecessário para o navegador.

**Erro a evitar**: marcar um arquivo inteiro de página como `"use client"`
porque um botão lá dentro precisa de interação. Isso desliga renderização no
servidor de tudo que está naquele arquivo, inclusive o que não precisava.

## Padrões de Server Action já estabelecidos (siga-os, não invente um novo)

### Formulário simples, sem necessidade de feedback estruturado

```tsx
// Server Component
const archiveWithId = archiveDocument.bind(null, doc.id, caseId);
<form action={archiveWithId}>
  <button type="submit">Arquivar</button>
</form>
```//
Server Action correspondente é `(id, caseId, formData) => Promise<void>` —
sem estado de retorno, porque não há nada de estruturado para mostrar além
de "aconteceu ou não".

### Formulário que precisa de erro/estado de retorno

```tsx
// Client Component
const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
<form action={formAction}>…</form>
```

A Server Action correspondente segue a assinatura
`(…argsFixos, prevState, formData) => Promise<EstadoDeRetorno>` — os
argumentos fixos vêm de `.bind(null, …)` **antes** de `prevState`, sempre
nessa ordem. `EstadoDeRetorno` é um tipo próprio do domínio
(`{ error: string | null }`, ou mais campos quando precisar, como
`{ error: string | null; duplicates: DuplicateMatch[] | null }` em
`UploadDocumentState`).

### Ação destrutiva com confirmação

```tsx
"use client";
const [pending, startTransition] = useTransition();
<button onClick={() => {
  if (!confirm("Frase específica, não genérica.")) return;
  startTransition(() => acaoDestrutiva(id));
}}>
```

Nunca pular a confirmação para arquivar/excluir/remover, mesmo que pareça
óbvio no contexto.

## Onde um componente nasce

Regra completa em [03 — Folder Structure](./03-folder-structure.md#onde-um-arquivo-novo-deveria-ir-árvore-de-decisão).
Resumo: nasce em `_components/` do módulo que o criou; só sobe para
`app/(staff)/_components/` quando um **segundo** módulo precisar dele de
verdade.

## Nomenclatura de componentes

- `PascalCase` para o componente, arquivo em `kebab-case.tsx`
  (`upload-document-form.tsx` exporta `UploadDocumentForm`).
- Nome descreve **o que o componente é**, não onde é usado
  (`ArchiveCaseButton`, não `ProcessoPageButton3`).
- Componentes de formulário terminam em `Form`; botões de ação isolada
  terminam em `Button`; seletores/editores inline terminam em `Editor` ou
  `Select` conforme a interação (`PastaEditor`, `StatusRevisaoSelect`).

## Props: convenções

- Props tipadas inline na assinatura da função para componentes pequenos;
  `type Props = {…}` nomeado só quando o tipo é reaproveitado (raro) ou
  passa de ~6 campos.
- Nunca `any`. Um valor que vem de uma junção Supabase com tipo ambíguo
  (`d.roles as unknown as { nome: string } | null`) é convertido
  explicitamente uma vez, na fronteira de leitura (`lib/<domínio>/data.ts`),
  nunca espalhado por múltiplos componentes.
- Funções passadas como prop de callback para Server Action já vêm
  *bound* (`onSave={pastaWithIds}`) — o componente filho não sabe (nem
  precisa saber) quais argumentos fixos foram aplicados.

## Reuso: quando extrair, quando duplicar

Três linhas parecidas em dois lugares **não** justificam uma abstração —
extraia quando o **terceiro** uso aparecer, ou quando os dois primeiros usos
já preveem claramente um terceiro (ex.: `UploadDocumentForm` nasceu
compartilhado desde o início porque staff **e** portal precisavam do mesmo
fluxo de validação/duplicidade no mesmo commit). Prefira uma função exportada
simples a um componente genérico com 10 props opcionais tentando cobrir todo
caso futuro hipotético.

## Documentação de componente

Este projeto **não** usa Storybook nem comentários de bloco em componente.
A documentação de um componente é:

1. O nome (autoexplicativo).
2. Um comentário de uma linha **só** quando há uma decisão não óbvia por trás
   (ex.: por que o clique usa `onMouseDown` + `preventDefault` em vez de
   `onClick` num dropdown de busca — porque preveniria o blur de desmontar
   a lista antes do clique registrar).
3. O tipo das props, que já documenta o contrato.

Não crie arquivos `.md` de documentação por componente — isso duplica e
desalinha rápido. Se a lógica for complexa o suficiente para precisar de
prosa, ela pertence a este `docs/architecture/`, não a um arquivo solto ao
lado do componente.

## Plano de adoção do shadcn/ui

shadcn/ui é stack obrigatória a partir de agora — mas o projeto tem hoje
~80 componentes em Tailwind puro, funcionando e testados em produção com
dados reais. **Não existe justificativa para parar o desenvolvimento e
reescrever tudo de uma vez.** O plano é:

1. **Rodar `npx shadcn@latest init`** na próxima feature nova, aceitando o
   tema já definido em `app/globals.css` (o wizard do shadcn integra com
   `@theme` do Tailwind v4 sem conflito — os tokens `kmp-orange`/
   `kmp-graphite` continuam sendo a fonte da paleta).
2. **Toda tela nova usa componentes shadcn desde o primeiro commit** —
   `Button`, `Input`, `Select`, `Dialog`, `Table`, conforme a necessidade.
   Isso instala o componente em `components/ui/` (pasta nova, na raiz do
   projeto — não dentro de `app/`, porque `components/ui/` não é código de
   rota, é biblioteca interna).
3. **Migração de tela existente é oportunista, não um projeto à parte**:
   quando uma tela precisa ser tocada por outro motivo (bug, feature nova
   naquele módulo), aproveita-se para trocar os elementos manuais por
   `shadcn/ui` *daquela tela*. Nunca abrir uma tarefa cujo único objetivo é
   "migrar componente X para shadcn" sem uma mudança funcional junto —
   isso é o tipo de retrabalho que consome tempo sem entregar valor
   perceptível ao usuário e tende a ser descontinuado pela metade.
4. **`window.confirm()` é substituído por `AlertDialog` (shadcn) na primeira
   tela nova que precisar de confirmação** — não é preciso trocar as
   confirmações já existentes só por isso; ver decisão 3.
5. Ícones continuam `lucide-react` (já em uso, é a mesma biblioteca que o
   shadcn usa por padrão — nenhuma mudança necessária aqui).

Esse plano evita o pior dos dois mundos: continuar acumulando débito com
Tailwind puro indefinidamente, **e** parar a esteira de entregas por
semanas para uma reescrita visual que não muda nenhuma funcionalidade.
