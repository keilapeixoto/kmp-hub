# 7. API Standards

## As três formas de "API" neste projeto — e quando usar cada uma

| Mecanismo | Quando usar | Exemplo real |
|---|---|---|
| **Server Action** | Padrão para toda escrita nascida de um formulário/botão dentro do Next.js. | `updateCase`, `uploadDocument`, `archiveServiceType`. |
| **Route Handler** (`app/api/*`) | Quando o chamador **não é** um `<form>` React (chamada `fetch` de um Client Component, download de arquivo, webhook/cron externo). | `app/api/busca` (debounce via fetch), `app/api/documents/[id]/download`, `app/api/cron/storage-check`. |
| **Edge Function do Supabase** | Lógica que precisa rodar fora do runtime do Next.js/Vercel. **Nenhuma em uso hoje** — não crie uma sem uma razão concreta (ver critério abaixo). | — |

**Regra de decisão simples**: se o disparo é um `<form action={…}>` ou um
`onClick` que chama a action diretamente, é Server Action. Se precisa de uma
URL que outra coisa (fetch, `<img src>`, um serviço externo) vai chamar, é
Route Handler. Edge Function só entra quando a tarefa não pode rodar dentro
do tempo de execução de uma requisição Next.js (processamento pesado
assíncrono) — nenhuma feature do produto exigiu isso até agora.

## Padrão de assinatura de Server Action

Ver exemplos completos em
[06 — Component Architecture](./06-component-architecture.md#padrões-de-server-action-já-estabelecidos-siga-os-não-invente-um-novo).
Resumo das regras:

1. `"use server"` no topo do arquivo (nunca inline por função, exceto casos
   muito pontuais).
2. Argumentos fixos (IDs vindos de `.bind(null, …)`) sempre antes de
   `prevState`/`formData`.
3. Toda Server Action que muda dado visível em mais de uma rota chama
   `revalidatePath()` para cada rota afetada — nunca confia em o cliente
   recarregar sozinho.
4. Toda Server Action **lê a role atual** (`getCurrentUserRole()`) e recusa
   explicitamente quando a ação é sensível o suficiente para merecer
   defesa em profundidade além da RLS (convite de usuário, exclusão) — a
   RLS é a garantia real, mas uma checagem cedo evita uma query
   desnecessária e dá uma mensagem de erro melhor.
5. Retorno: `Promise<void>` quando não há nada estruturado para mostrar;
   um tipo de estado nomeado (`type XState = { error: string | null }`)
   quando o chamador precisa reagir ao resultado.

## Padrão de Route Handler

- Método HTTP explícito (`export async function GET(request: Request)`),
  nunca um handler genérico tentando lidar com todos os métodos.
- Toda rota que é alvo de cron/webhook externo **valida um segredo** antes
  de fazer qualquer trabalho:
  ```ts
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  ```
- Rotas chamadas por `fetch` do navegador (busca com debounce) **não**
  expõem mais dado do que a tela precisa — `app/api/busca` limita a 8
  resultados e usa o cliente da sessão (RLS aplicada), nunca a chave
  secreta.
- Download de arquivo nunca serve o arquivo direto — gera uma URL assinada
  de curta duração e redireciona (`app/api/documents/[id]/download`).

## Integrações externas

| Serviço | Papel | Onde |
|---|---|---|
| **Resend** | E-mail transacional (hoje: alertas de armazenamento e relatório mensal). | `lib/storage-admin/email.ts` — chamada HTTP direta à API REST do Resend, **sem SDK** (evita dependência extra para um único POST). |
| **Vercel Cron** | Dispara `app/api/cron/storage-check` 1x/dia. | `vercel.json`. |

Toda integração externa nova segue o mesmo padrão: uma função isolada em
`lib/<domínio>/`, que lê a chave de `process.env` (nunca hardcoded, nunca
`NEXT_PUBLIC_*`), falha graciosamente (retorna `{ok: false, error}`, nunca
lança exceção não tratada que derruba a Server Action inteira) e nunca é
chamada direto de um componente — sempre via Server Action ou Route Handler.

## Erros e retorno

- Server Action nunca deixa uma exception de Postgres vazar pro usuário —
  captura o `error` do retorno do supabase-js e traduz para uma mensagem em
  português acionável ("Não foi possível salvar as alterações.", não o texto
  cru do Postgres).
- Falha de rede/serviço externo (Resend, download de Storage) sempre tem
  fallback: registrar o resultado (`email_status: "falhou"`) em vez de
  lançar e interromper o restante do processamento (ver
  `app/api/cron/storage-check/route.ts` — uma falha de e-mail não impede a
  rotina de gravar o snapshot diário).

## O que este projeto **não** tem hoje (e quando faria sentido)

- **API pública versionada (REST/GraphQL) para terceiros** — não existe
  cliente externo hoje. Se/quando o produto precisar de integração externa
  de terceiros ou app mobile nativo, essa camada nasce sobre as mesmas
  tabelas/RLS, como um conjunto novo de Route Handlers com autenticação por
  API key própria — não uma reescrita do que já existe.
- **Webhooks recebidos de terceiros** — nenhum hoje. Quando existir (ex.:
  Stripe na Fase 3), a rota correspondente precisa validar assinatura
  criptográfica do provedor antes de processar, seguindo o mesmo padrão de
  "valida segredo antes de qualquer trabalho" já usado no cron.
