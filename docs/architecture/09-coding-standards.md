# 9. Coding Standards

## TypeScript

- **`strict` sempre ligado** (já é o padrão do `create-next-app` usado
  aqui — nunca desligar uma flag de `tsconfig.json` para "fazer o erro
  sumir").
- **Nunca `any`.** Quando o supabase-js retorna um tipo ambíguo de `join`
  (`d.roles as unknown as { nome: string } | null`), a conversão é explícita
  e acontece uma vez, na função de `lib/<domínio>/data.ts` que faz a query —
  nunca espalhada em cada componente que consome o dado.
- Tipos de domínio (`Document`, `CaseFormView`, `TeamMember`) vivem em
  `lib/<domínio>/types.ts` e espelham exatamente as colunas da tabela — se o
  schema tem `hash_sha256`, o tipo tem `hash_sha256`, não `hashSha256`
  (manter o nome da coluna evita uma camada de tradução mental ao ler
  query + tipo lado a lado).
- Enums de banco (`status text check (status in (...))`) viram um array de
  constante `as const` + tipo derivado, nunca um `enum` do TypeScript:
  ```ts
  export const STAFF_ROLES = [
    { slug: "admin", label: "Admin" },
    …
  ] as const;
  export type Role = (typeof STAFF_ROLES)[number]["slug"];
  ```
  Isso mantém o valor (`"admin"`) e o rótulo em português (`"Admin"`) juntos
  na mesma fonte, sem duplicar a lista em dois lugares.

## Nomenclatura

| O quê | Convenção | Exemplo |
|---|---|---|
| Coluna de banco | `snake_case`, português para campo de domínio | `status_revisao`, `enviado_por` |
| Tipo TypeScript | `PascalCase`, mesmo nome de campo do banco | `Document.status_revisao` |
| Função de leitura | `getX` / `getXById` / `getXByY` | `getDocumentsByClient` |
| Server Action | verbo + substantivo, sem prefixo `handle`/`do` | `archiveCase`, `updateTeamMember` |
| Componente | `PascalCase`, arquivo `kebab-case.tsx` | `ArchiveCaseButton` em `archive-case-button.tsx` |
| Migração SQL | `AAAAMMDDHHMMSS_descricao_curta.sql` | `20260722140100_documents_pasta_status.sql` |

## Organização de arquivo

- Um domínio de negócio = uma pasta em `lib/` com `types.ts` +
  `constants.ts` + `data.ts` — nunca um `lib/utils.ts` genérico acumulando
  funções sem dono (ver [03 — Folder Structure](./03-folder-structure.md)).
- `data.ts` é **só leitura** (`getX`). Escrita vive em `actions.ts` dentro de
  `app/`, nunca misturada com as funções de leitura de `lib/`.
- Um arquivo de Server Actions (`actions.ts`) que cresce demais divide por
  sub-domínio (`checklist-actions.ts` ao lado de `actions.ts`), nunca por
  tipo de operação (`create.ts`/`update.ts`/`delete.ts`).

## Comentários

**Padrão do projeto: sem comentário por padrão.** Só escreva um quando o
*porquê* não é óbvio olhando o código — uma decisão não intuitiva, uma
restrição escondida, uma consequência de um bug específico. Nunca comente
*o quê* o código faz (nomes bons já respondem isso) nem referencie a tarefa
atual ("adicionado para resolver o bug #123" — isso apodrece assim que a
tarefa vira passado; se for relevante, vai na mensagem do commit).

Exemplo de comentário que **vale a pena**:
```ts
// PostgREST limita a 1000 linhas por página sem .range() explícito — sem
// isso aqui, mais de 1000 documentos silenciosamente somem da agregação.
async function fetchAllDocuments() { … }
```

Exemplo de comentário que **não deveria existir**:
```ts
// Busca o documento pelo id
async function getDocument(id: string) { … }
```

## Tratamento de erro

- Server Action nunca deixa uma exceção de Postgres/rede vazar crua para o
  usuário — captura `{ data, error }` do supabase-js e traduz para uma
  mensagem acionável em português.
- Falha de serviço externo (Resend, download de Storage) é registrada e
  segue o fluxo (ver [07 — API Standards](./07-api-standards.md)), nunca
  derruba a operação inteira por uma falha secundária.
- **Nunca silenciar um erro sem decidir o que fazer com ele.** Um `catch`
  vazio é proibido — no mínimo, decida explicitamente entre: propagar,
  logar (sem dado sensível) e retornar estado de erro, ou retry com limite
  (ver o backfill de armazenamento, que tenta 3x antes de desistir de um
  arquivo específico e seguir para o próximo).

## Validação

- Validação de formulário acontece **no servidor**, dentro da Server
  Action — nunca só no cliente. Validação client-side (HTML5
  `required`, `type="email"`) é UX, não segurança.
- Toda leitura de `FormData` verifica o tipo antes de usar
  (`typeof valor === "string" && valor.trim()`), nunca assume que o campo
  veio preenchido.
- Regra de negócio que precisa estar **sempre** correta, mesmo se alguém
  pular a Server Action e escrever direto via API, vive em constraint SQL
  ou trigger — validação em TypeScript é conveniência de UX, não a garantia
  final.

## Performance

- **Server Components por padrão** já elimina a maior fonte de JS
  desnecessário no cliente — não adicione `"use client"` a um componente que
  não precisa.
- Consulta que pode retornar mais de 1000 linhas **sempre** pagina
  explicitamente (`.range()`) — o limite padrão do PostgREST trunca
  silenciosamente sem erro, um bug fácil de não perceber até faltar dado em
  produção (já aconteceu neste projeto, duas vezes, em auditorias
  diferentes).
- Operação em lote sobre muitos registros externos (download de Storage,
  chamada a serviço externo) usa concorrência controlada
  (`Promise.all` com um número fixo de workers), nunca um loop sequencial
  puro para centenas/milhares de itens — mas também nunca concorrência
  ilimitada (`Promise.all` sobre todo o array de uma vez), que estoura
  limite de conexão. Um valor entre 10–20 workers simultâneos é o que este
  projeto usa hoje para backfill de Storage.
- `revalidatePath` chamado com precisão (só as rotas realmente afetadas),
  nunca `revalidatePath("/", "layout")` como reflexo para "garantir que
  atualizou" — isso derruba cache do app inteiro por uma mudança pequena.

## O que este documento assume que você já leu

Este documento não repete regras que já vivem em documentos mais
específicos — antes de codar, confira também:
[05 — Design System](./05-design-system.md) (classes Tailwind, cores,
componentes visuais) e [08 — Security Guide](./08-security-guide.md)
(RLS é obrigatória, não é "coding style").
