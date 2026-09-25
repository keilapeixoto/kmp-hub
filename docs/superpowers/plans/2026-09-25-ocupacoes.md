# Ocupações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the KMP Hub team and portal clients a searchable occupations reference (ANZSCO code, assessing authority, current CSOL status, legacy MLTSSL status for 485 eligibility), sourced from the official Home Affairs combined list, replacing the ad-hoc lookup on the (partly stale) Delta Immigration site.

**Architecture:** One new Postgres table (`public.occupations`) with RLS open to staff (read) + client (read) + admin (manage), read via a shared `lib/occupations` data layer consumed by four Next.js pages — staff list/detail under `(staff)/ocupacoes`, portal list/detail under `(portal)/portal/ocupacoes` — plus an admin-only CSV import tool under `(staff)/configuracoes/ocupacoes`.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Supabase Postgres + RLS, Tailwind v4 utility classes (no component library), pgTAP for DB permission tests.

**Spec:** `docs/superpowers/specs/2026-09-24-ocupacoes-design.md`

## Global Constraints

- Sem emoji em nenhuma tela ou mensagem (regra do produto, CLAUDE.md).
- Interface em português brasileiro, incluindo estados vazios e erros.
- Cores só via classe de tema (`bg-kmp-orange`, `text-kmp-graphite`, `bg-kmp-bg`) — nunca hex solto num componente.
- Títulos de página em `font-heading` (Cormorant Garamond); nunca em botão/label/corpo.
- Toda escrita passa por Server Action — nenhuma mutação direta do cliente para o banco.
- RLS ativado na própria migração de criação da tabela; toda tabela nova tem teste pgTAP de permissão por função antes de qualquer deploy (regra do projeto, CLAUDE.md).
- `SUPABASE_SECRET_KEY` nunca é usada — todo acesso passa pela publishable key + RLS (`lib/supabase/server.ts`).
- Botão de submit mostra estado de carregamento (`"Salvando…"`/equivalente) e fica `disabled` durante o envio.
- Migrações e testes pgTAP deste projeto não rodam em CI — são aplicados manualmente no SQL Editor do projeto Supabase de dev (ver `supabase/README.md`). Cada task de banco abaixo diz exatamente o que colar lá.

---

## File Structure

```
supabase/migrations/20260925120000_occupations.sql     [create] schema + RLS + seed
supabase/tests/database/017_occupations_rls.test.sql    [create] pgTAP RLS test

lib/occupations/constants.ts                            [create] categorias válidas
lib/occupations/types.ts                                [create] tipo Occupation, filtros
lib/occupations/data.ts                                 [create] getOccupations, getOccupation
lib/occupations/csv.ts                                  [create] parseOccupationsCsv (função pura)

app/(staff)/ocupacoes/page.tsx                           [create] lista + busca/filtro (equipe)
app/(staff)/ocupacoes/[id]/page.tsx                      [create] detalhe (equipe)
app/(staff)/_components/sidebar.tsx                      [modify] itens de nav novos

app/(staff)/configuracoes/ocupacoes/page.tsx             [create] tela de importação (admin)
app/(staff)/configuracoes/ocupacoes/actions.ts           [create] server action de importação
app/(staff)/configuracoes/ocupacoes/_components/import-form.tsx [create] formulário client

app/(portal)/portal/ocupacoes/page.tsx                   [create] lista (portal)
app/(portal)/portal/ocupacoes/[id]/page.tsx              [create] detalhe (portal)
app/(portal)/portal/_components/portal-header.tsx        [modify] link de navegação novo
```

`lib/occupations/data.ts` is consumed by **both** the staff and portal pages unchanged — RLS (not app code) is what limits what each role sees, matching how `lib/cases/data.ts` and friends already work in this codebase.

---

### Task 1: Database schema, RLS and seed data

**Files:**
- Create: `supabase/migrations/20260925120000_occupations.sql`

**Interfaces:**
- Produces: table `public.occupations` with columns `id uuid`, `nome text`, `codigo_anzsco text` (unique), `categoria text` (check-constrained to 4 values), `autoridade_avaliadora text`, `nivel_habilidade integer` (1-5), `na_csol boolean`, `na_mltssl_legada boolean`, `fonte text | null`, `status text` (`'ativo' | 'arquivado'`), `created_at`, `updated_at`. RLS policies `occupations_manage_admin`, `occupations_select_staff`, `occupations_select_client`. Every later task reads/writes this exact shape.

- [ ] **Step 1: Write the migration file**

```sql
-- KMP Hub · Ocupações — referência de elegibilidade de skilled occupation
-- list (docs/superpowers/specs/2026-09-24-ocupacoes-design.md). Substitui a
-- consulta manual ao site da Delta Immigration por uma referência própria,
-- com fonte oficial (Department of Home Affairs) e as duas classificações
-- que importam para a equipe: CSOL (lista vigente) e MLTSSL legada (ainda
-- relevante para elegibilidade em streams do visto 485).

create table public.occupations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_anzsco text not null,
  categoria text not null check (
    categoria in (
      'Gerentes',
      'Profissionais',
      'Técnicos e Trabalhadores de Ofícios',
      'Trabalhadores de Serviços Comunitários e Pessoais'
    )
  ),
  autoridade_avaliadora text not null,
  nivel_habilidade integer not null check (nivel_habilidade between 1 and 5),
  na_csol boolean not null default false,
  na_mltssl_legada boolean not null default false,
  fonte text,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo_anzsco)
);

comment on table public.occupations is
  'Referência de ocupações qualificadas (código ANZSCO, autoridade avaliadora, CSOL vigente e MLTSSL legada para o visto 485). Fonte oficial: Home Affairs Skilled Occupation List. Populada via seed inicial + importação de CSV pelo admin em /configuracoes/ocupacoes — não é uma cópia completa da lista oficial (~1000 ocupações).';

create index occupations_categoria_idx on public.occupations (categoria);

create trigger set_updated_at
  before update on public.occupations
  for each row execute function public.set_updated_at();

alter table public.occupations enable row level security;

-- Ocupações (biblioteca de referência, mesmo grupo de acesso de guias/
-- templates para a equipe). É dado público (código ANZSCO, autoridade
-- avaliadora, listas) sem nota interna nessa tabela, por isso também
-- liberado para o cliente no portal — decisão registrada no spec.

create policy occupations_manage_admin on public.occupations
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy occupations_select_staff on public.occupations
  for select
  using (
    public.get_user_role() in ('director', 'consultant', 'operations', 'finance')
    and status = 'ativo'
  );

create policy occupations_select_client on public.occupations
  for select
  using (
    public.get_user_role() = 'client'
    and status = 'ativo'
  );

-- Seed inicial: ocupações mais comuns no perfil de cliente da KMP
-- (construção, engenharia, TI, saúde, contabilidade), a partir da lista
-- combinada oficial do Home Affairs (setembro/2026). Cobre 3 das 4
-- categorias — "Trabalhadores de Serviços Comunitários e Pessoais" fica
-- para o admin completar via importação de CSV: é uma categoria de skill
-- level majoritariamente 3-4 com elegibilidade variável por lista/rodada
-- que não deve ser assumida sem checar a fonte oficial.

insert into public.occupations
  (nome, codigo_anzsco, categoria, autoridade_avaliadora, nivel_habilidade, na_csol, na_mltssl_legada, fonte)
values
  ('Construction Project Manager', '133111', 'Gerentes', 'VETASSESS', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Engineering Manager', '133211', 'Gerentes', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Child Care Centre Manager', '134111', 'Gerentes', 'ACECQA', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Civil Engineer', '233211', 'Profissionais', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Electrical Engineer', '233311', 'Profissionais', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Mechanical Engineer', '233512', 'Profissionais', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Software Engineer', '261313', 'Profissionais', 'Australian Computer Society (ACS)', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Accountant (General)', '221111', 'Profissionais', 'CPA Australia / CA ANZ / IPA', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Registered Nurse (Aged Care)', '254412', 'Profissionais', 'ANMAC', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('General Practitioner', '253111', 'Profissionais', 'Medical Board of Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Early Childhood (Pre-primary School) Teacher', '241111', 'Profissionais', 'ACECQA', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Electrician (General)', '341111', 'Técnicos e Trabalhadores de Ofícios', 'Trades Recognition Australia (TRA)', 3, true, false, 'Home Affairs — Skilled Occupation List'),
  ('Carpenter', '331212', 'Técnicos e Trabalhadores de Ofícios', 'Trades Recognition Australia (TRA)', 3, true, false, 'Home Affairs — Skilled Occupation List'),
  ('Chef', '351311', 'Técnicos e Trabalhadores de Ofícios', 'Trades Recognition Australia (TRA)', 3, true, false, 'Home Affairs — Skilled Occupation List');
```

- [ ] **Step 2: Apply it to the Supabase dev project**

Open the dev project's SQL Editor and paste the full file content, then run it. This project has no local Supabase/Docker set up (confirmed: no `supabase/config.toml`, no running Docker) — every migration in this repo so far was applied the same way (see `supabase/README.md`).

- [ ] **Step 3: Verify**

Run in the same SQL Editor:

```sql
select categoria, count(*) from public.occupations group by categoria order by categoria;
```

Expected: 3 rows — `Gerentes` = 3, `Profissionais` = 8, `Técnicos e Trabalhadores de Ofícios` = 3.

```sql
select codigo_anzsco, na_csol, na_mltssl_legada from public.occupations where codigo_anzsco = '133111';
```

Expected: one row, `na_csol = true`, `na_mltssl_legada = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260925120000_occupations.sql
git commit -m "feat: add occupations table with RLS for staff and client read access"
```

---

### Task 2: pgTAP RLS test

**Files:**
- Create: `supabase/tests/database/017_occupations_rls.test.sql`

**Interfaces:**
- Consumes: `public.occupations` and its 3 policies from Task 1.

- [ ] **Step 1: Write the test file**

```sql
-- KMP Hub · Testes de permissão (RLS) da tabela occupations (docs/
-- superpowers/specs/2026-09-24-ocupacoes-design.md).
--
-- Como rodar: cole no SQL Editor (roda em begin/rollback, nada fica gravado)
-- ou `supabase test db` com CLI + Docker.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Admin Ocupações","role":"admin"}'),
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'consultora.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Consultora Ocupações","role":"consultant"}'),
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'cliente.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Cliente Ocupações","role":"client"}'),
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'parceiro.ocupacoes@kmp.test', crypt('senha-teste', gen_salt('bf')), now(), '{"nome":"Parceiro Ocupações","role":"partner"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

with ins as (
  insert into public.occupations
    (nome, codigo_anzsco, categoria, autoridade_avaliadora, nivel_habilidade, na_csol, na_mltssl_legada)
  values ('Ocupação Teste', '999901', 'Profissionais', 'VETASSESS', 1, true, true)
  returning id
)
select set_config('app.occupation_id', id::text, true) from ins;
reset role;

-- consultora lê a ocupação ativa, não edita
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  1,
  'consultora lê a ocupação ativa'
);

select lives_ok(
  format(
    $$ update public.occupations set nome = 'tentativa indevida' where id = %L $$,
    current_setting('app.occupation_id', true)
  ),
  'update da consultora não dá erro (RLS filtra a linha silenciosamente)'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
select is(
  (select nome from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  'Ocupação Teste',
  'a ocupação não mudou — consultora não consegue editar'
);
reset role;

-- cliente lê a mesma ocupação ativa no portal (dado público de referência)
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  1,
  'cliente lê a ocupação ativa no portal'
);
reset role;

-- parceiro não tem acesso a ocupações
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::int from public.occupations),
  0,
  'parceiro não vê nenhuma ocupação'
);
reset role;

-- arquivar: some para equipe e cliente, admin continua vendo
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
update public.occupations set status = 'arquivado' where id = current_setting('app.occupation_id', true)::uuid;
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  1,
  'admin continua vendo a ocupação arquivada'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  0,
  'ocupação arquivada não aparece para a equipe'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::int from public.occupations where id = current_setting('app.occupation_id', true)::uuid),
  0,
  'ocupação arquivada não aparece para o cliente'
);
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: Run it and verify it passes**

Paste into the dev project's SQL Editor and run. Expected output ends with `1..8` and all 8 lines prefixed `ok` (no `not ok`).

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/database/017_occupations_rls.test.sql
git commit -m "test: add RLS coverage for occupations across admin, staff, client and partner roles"
```

---

### Task 3: Data layer (types, constants, read queries)

**Files:**
- Create: `lib/occupations/constants.ts`
- Create: `lib/occupations/types.ts`
- Create: `lib/occupations/data.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts` (`() => Promise<SupabaseClient>`), table `public.occupations` from Task 1.
- Produces: `OCCUPATION_CATEGORIES: readonly string[]`; type `Occupation`; type `OccupationFilters = { q?: string; categoria?: string }`; `getOccupations(filters?: OccupationFilters): Promise<Occupation[]>`; `getOccupation(id: string): Promise<Occupation | null>`. These exact names/signatures are used unchanged by Tasks 5, 6, 8, 9, 10.

- [ ] **Step 1: Write `lib/occupations/constants.ts`**

```ts
export const OCCUPATION_CATEGORIES = [
  "Gerentes",
  "Profissionais",
  "Técnicos e Trabalhadores de Ofícios",
  "Trabalhadores de Serviços Comunitários e Pessoais",
] as const;
```

- [ ] **Step 2: Write `lib/occupations/types.ts`**

```ts
export type Occupation = {
  id: string;
  nome: string;
  codigo_anzsco: string;
  categoria: string;
  autoridade_avaliadora: string;
  nivel_habilidade: number;
  na_csol: boolean;
  na_mltssl_legada: boolean;
  fonte: string | null;
  status: "ativo" | "arquivado";
  created_at: string;
  updated_at: string;
};

export type OccupationFilters = {
  q?: string;
  categoria?: string;
};
```

- [ ] **Step 3: Write `lib/occupations/data.ts`**

```ts
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Occupation, OccupationFilters } from "./types";

export async function getOccupations(
  filters: OccupationFilters = {},
): Promise<Occupation[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("occupations")
    .select("*")
    .eq("status", "ativo")
    .order("nome");

  if (filters.categoria) {
    query = query.eq("categoria", filters.categoria);
  }

  const termo = filters.q?.trim().replace(/[,()%]/g, "");
  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,codigo_anzsco.ilike.%${termo}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Occupation[];
}

export async function getOccupation(id: string): Promise<Occupation | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("occupations")
    .select("*")
    .eq("id", id)
    .eq("status", "ativo")
    .maybeSingle();
  return data as Occupation | null;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/occupations/*`.

- [ ] **Step 5: Commit**

```bash
git add lib/occupations/constants.ts lib/occupations/types.ts lib/occupations/data.ts
git commit -m "feat: add occupations data layer (types, categories, read queries)"
```

---

### Task 4: CSV parser (pure function)

**Files:**
- Create: `lib/occupations/csv.ts`

**Interfaces:**
- Consumes: `OCCUPATION_CATEGORIES` from `lib/occupations/constants.ts` (Task 3).
- Produces: type `ParsedOccupationRow` (fields: `nome`, `codigo_anzsco`, `categoria`, `autoridade_avaliadora`, `nivel_habilidade`, `na_csol`, `na_mltssl_legada`, `fonte`); type `ParseResult = { rows: ParsedOccupationRow[]; errors: string[] }`; `parseOccupationsCsv(conteudo: string): ParseResult`. Task 8's server action calls this exact function.

No test runner exists in this repo for plain TypeScript modules (only pgTAP for the database and Playwright e2e, which needs a manually-authenticated session — see `playwright/setup/README.md`). This function is verified by type-checking here and functionally end-to-end in Task 8 (submitting a real CSV through the browser).

- [ ] **Step 1: Write `lib/occupations/csv.ts`**

```ts
import { OCCUPATION_CATEGORIES } from "./constants";

export type ParsedOccupationRow = {
  nome: string;
  codigo_anzsco: string;
  categoria: string;
  autoridade_avaliadora: string;
  nivel_habilidade: number;
  na_csol: boolean;
  na_mltssl_legada: boolean;
  fonte: string | null;
};

export type ParseResult = {
  rows: ParsedOccupationRow[];
  errors: string[];
};

const CABECALHO_ESPERADO = [
  "nome",
  "codigo_anzsco",
  "categoria",
  "autoridade_avaliadora",
  "nivel_habilidade",
  "na_csol",
  "na_mltssl_legada",
  "fonte",
];

function paraBooleano(valor: string): boolean {
  return ["1", "true", "sim", "yes"].includes(valor.trim().toLowerCase());
}

export function parseOccupationsCsv(conteudo: string): ParseResult {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);

  if (linhas.length === 0) {
    return { rows: [], errors: ["Arquivo vazio."] };
  }

  const cabecalho = linhas[0].split(",").map((c) => c.trim().toLowerCase());
  const colunasFaltando = CABECALHO_ESPERADO.filter(
    (c) => !cabecalho.includes(c),
  );
  if (colunasFaltando.length > 0) {
    return {
      rows: [],
      errors: [
        `Cabeçalho inválido. Colunas esperadas: ${CABECALHO_ESPERADO.join(", ")}. Faltando: ${colunasFaltando.join(", ")}.`,
      ],
    };
  }

  const rows: ParsedOccupationRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const numeroLinha = i + 1;
    const valores = linhas[i].split(",").map((v) => v.trim());
    if (valores.length !== cabecalho.length) {
      errors.push(
        `Linha ${numeroLinha}: número de colunas não bate com o cabeçalho.`,
      );
      continue;
    }

    const registro: Record<string, string> = {};
    cabecalho.forEach((coluna, index) => {
      registro[coluna] = valores[index];
    });

    if (!registro.nome) {
      errors.push(`Linha ${numeroLinha}: nome é obrigatório.`);
      continue;
    }
    if (!/^\d{6}$/.test(registro.codigo_anzsco)) {
      errors.push(
        `Linha ${numeroLinha}: código ANZSCO deve ter 6 dígitos.`,
      );
      continue;
    }
    if (
      !OCCUPATION_CATEGORIES.includes(
        registro.categoria as (typeof OCCUPATION_CATEGORIES)[number],
      )
    ) {
      errors.push(
        `Linha ${numeroLinha}: categoria "${registro.categoria}" inválida. Use uma de: ${OCCUPATION_CATEGORIES.join(", ")}.`,
      );
      continue;
    }
    const nivel = Number(registro.nivel_habilidade);
    if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
      errors.push(
        `Linha ${numeroLinha}: nível de habilidade deve ser um número inteiro de 1 a 5.`,
      );
      continue;
    }

    rows.push({
      nome: registro.nome,
      codigo_anzsco: registro.codigo_anzsco,
      categoria: registro.categoria,
      autoridade_avaliadora: registro.autoridade_avaliadora,
      nivel_habilidade: nivel,
      na_csol: paraBooleano(registro.na_csol),
      na_mltssl_legada: paraBooleano(registro.na_mltssl_legada),
      fonte: registro.fonte || null,
    });
  }

  return { rows, errors };
}
```

Note: this parser splits on plain commas (no quoted-field support) — sufficient because none of the expected columns (occupation name, ANZSCO code, category, authority) contain commas. This assumption is documented in Task 8's UI copy so whoever imports a CSV knows the format.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/occupations/csv.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/occupations/csv.ts
git commit -m "feat: add pure CSV parser for occupation bulk import"
```

---

### Task 5: Staff list page — `/ocupacoes`

**Files:**
- Create: `app/(staff)/ocupacoes/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUserRole()` from `lib/auth.ts`; `getOccupations` from `lib/occupations/data.ts` (Task 3); `OCCUPATION_CATEGORIES` from `lib/occupations/constants.ts` (Task 3).

- [ ] **Step 1: Write the page**

```tsx
import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { getOccupations } from "@/lib/occupations/data";
import { OCCUPATION_CATEGORIES } from "@/lib/occupations/constants";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OcupacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const categoria = firstValue(params.categoria) ?? "";

  const [role, occupations] = await Promise.all([
    getCurrentUserRole(),
    getOccupations({ q, categoria }),
  ]);
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Ocupações</h1>
        {isAdmin ? (
          <Link
            href="/configuracoes/ocupacoes"
            className="text-sm font-medium text-kmp-orange hover:underline"
          >
            Importar CSV
          </Link>
        ) : null}
      </div>

      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou código ANZSCO"
          aria-label="Buscar por nome ou código ANZSCO"
          className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange sm:col-span-2"
        />
        <select
          name="categoria"
          defaultValue={categoria}
          aria-label="Filtrar por categoria"
          className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        >
          <option value="">Todas as categorias</option>
          {OCCUPATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Filtrar
          </button>
          {q || categoria ? (
            <Link
              href="/ocupacoes"
              className="ml-3 text-sm text-kmp-graphite/70 hover:text-kmp-orange"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <div className="rounded-lg bg-white shadow-sm">
        {occupations.length === 0 ? (
          <p className="p-8 text-center text-sm text-kmp-graphite/60">
            Nenhuma ocupação encontrada.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {occupations.map((o) => (
              <li key={o.id} className="p-4 text-sm">
                <Link
                  href={`/ocupacoes/${o.id}`}
                  className="font-medium text-kmp-graphite hover:text-kmp-orange"
                >
                  {o.nome} · {o.codigo_anzsco}
                </Link>
                <p className="mt-1 text-xs text-kmp-graphite/50">
                  {o.categoria} · {o.autoridade_avaliadora}
                </p>
                <div className="mt-2 flex gap-2">
                  {o.na_csol ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      CSOL
                    </span>
                  ) : null}
                  {o.na_mltssl_legada ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      MLTSSL · válido para 485
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing this file.

- [ ] **Step 3: Manual verification**

Requires Task 1's migration already applied to the dev Supabase project. Run `npm run dev`, sign in as staff, visit `/ocupacoes`. Expected: 14 occupations listed, search for "engineer" narrows to the 3 engineering rows, filtering by "Técnicos e Trabalhadores de Ofícios" shows Electrician/Carpenter/Chef only, "Importar CSV" link visible only when signed in as admin.

- [ ] **Step 4: Commit**

```bash
git add "app/(staff)/ocupacoes/page.tsx"
git commit -m "feat: add staff occupations list page with search and category filter"
```

---

### Task 6: Staff detail page — `/ocupacoes/[id]`

**Files:**
- Create: `app/(staff)/ocupacoes/[id]/page.tsx`

**Interfaces:**
- Consumes: `getOccupation` from `lib/occupations/data.ts` (Task 3).

- [ ] **Step 1: Write the page**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOccupation } from "@/lib/occupations/data";

export default async function OcupacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const occupation = await getOccupation(id);
  if (!occupation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ocupacoes"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Ocupações
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          {occupation.nome}
        </h1>
        <p className="mt-1 text-xs text-kmp-graphite/50">
          {occupation.categoria} · Nível de habilidade {occupation.nivel_habilidade}
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <dl className="divide-y divide-black/5 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-kmp-graphite/50">Código ANZSCO</dt>
            <dd className="text-kmp-graphite">{occupation.codigo_anzsco}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-kmp-graphite/50">Autoridade avaliadora</dt>
            <dd className="text-kmp-graphite">
              {occupation.autoridade_avaliadora}
            </dd>
          </div>
          {occupation.fonte ? (
            <div className="flex justify-between py-2">
              <dt className="text-kmp-graphite/50">Fonte</dt>
              <dd className="text-kmp-graphite">{occupation.fonte}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="flex gap-2">
        {occupation.na_csol ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            Na CSOL
          </span>
        ) : null}
        {occupation.na_mltssl_legada ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Na MLTSSL · válido para 485
          </span>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing this file.

- [ ] **Step 3: Manual verification**

With the dev server running, click into an occupation from `/ocupacoes`. Expected: detail page shows name, ANZSCO code, assessing authority, source, and the correct badges; visiting `/ocupacoes/00000000-0000-0000-0000-000000000000` (a non-existent id) renders the app's not-found page.

- [ ] **Step 4: Commit**

```bash
git add "app/(staff)/ocupacoes/[id]/page.tsx"
git commit -m "feat: add staff occupation detail page"
```

---

### Task 7: Sidebar navigation

**Files:**
- Modify: `app/(staff)/_components/sidebar.tsx`

**Interfaces:**
- Consumes: existing `NAV_GROUPS` array and `lucide-react` icon exports (`Globe`, `Upload` both confirmed present in the installed `lucide-react` version).

- [ ] **Step 1: Add the new icon imports**

In `app/(staff)/_components/sidebar.tsx`, change:

```ts
import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  FileText,
  HardDrive,
  Kanban,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Settings,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";
```

to:

```ts
import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  FileText,
  Globe,
  HardDrive,
  Kanban,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Settings,
  Upload,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";
```

- [ ] **Step 2: Add "Ocupações" to the Biblioteca group**

Change:

```ts
  {
    label: "Biblioteca",
    items: [
      { href: "/guias", label: "Guias", icon: BookOpen },
      { href: "/templates", label: "Templates", icon: MessageSquare },
    ],
  },
```

to:

```ts
  {
    label: "Biblioteca",
    items: [
      { href: "/guias", label: "Guias", icon: BookOpen },
      { href: "/templates", label: "Templates", icon: MessageSquare },
      { href: "/ocupacoes", label: "Ocupações", icon: Globe },
    ],
  },
```

- [ ] **Step 3: Add "Importar ocupações" to the Configurações group**

Change:

```ts
      {
        href: "/configuracoes/equipe",
        label: "Equipe",
        icon: UsersRound,
      },
    ],
  },
];
```

to:

```ts
      {
        href: "/configuracoes/equipe",
        label: "Equipe",
        icon: UsersRound,
      },
      {
        href: "/configuracoes/ocupacoes",
        label: "Importar ocupações",
        icon: Upload,
      },
    ],
  },
];
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing this file.

- [ ] **Step 5: Manual verification**

With the dev server running, confirm "Ocupações" appears under "Biblioteca" and "Importar ocupações" under "Configurações" in the sidebar, and both links navigate correctly (the second one 404s until Task 8 is done — expected at this point).

- [ ] **Step 6: Commit**

```bash
git add "app/(staff)/_components/sidebar.tsx"
git commit -m "feat: add Ocupações entries to staff sidebar navigation"
```

---

### Task 8: Admin CSV import — `/configuracoes/ocupacoes`

**Files:**
- Create: `app/(staff)/configuracoes/ocupacoes/actions.ts`
- Create: `app/(staff)/configuracoes/ocupacoes/_components/import-form.tsx`
- Create: `app/(staff)/configuracoes/ocupacoes/page.tsx`

**Interfaces:**
- Consumes: `parseOccupationsCsv` from `lib/occupations/csv.ts` (Task 4); `createClient` from `lib/supabase/server.ts`; `getCurrentUserRole` from `lib/auth.ts`.
- Produces: exported type `ImportOccupationsState = { error: string | null; resultado: { criadas: number; atualizadas: number; ignoradas: number } | null }`; `importOccupationsCsv(prevState: ImportOccupationsState, formData: FormData): Promise<ImportOccupationsState>`.

- [ ] **Step 1: Write the server action**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOccupationsCsv } from "@/lib/occupations/csv";

export type ImportOccupationsState = {
  error: string | null;
  resultado: { criadas: number; atualizadas: number; ignoradas: number } | null;
};

export async function importOccupationsCsv(
  _prevState: ImportOccupationsState,
  formData: FormData,
): Promise<ImportOccupationsState> {
  const arquivo = formData.get("arquivo");
  const colado = formData.get("conteudo");

  let conteudo = "";
  if (arquivo instanceof File && arquivo.size > 0) {
    conteudo = await arquivo.text();
  } else if (typeof colado === "string") {
    conteudo = colado;
  }

  if (!conteudo.trim()) {
    return {
      error: "Cole o conteúdo do CSV ou selecione um arquivo.",
      resultado: null,
    };
  }

  const { rows, errors } = parseOccupationsCsv(conteudo);
  if (rows.length === 0) {
    return {
      error: errors[0] ?? "Nenhuma linha válida encontrada no CSV.",
      resultado: null,
    };
  }

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("occupations")
    .select("codigo_anzsco")
    .in(
      "codigo_anzsco",
      rows.map((r) => r.codigo_anzsco),
    );
  const codigosExistentes = new Set(
    (existentes ?? []).map((r) => r.codigo_anzsco as string),
  );

  const { error } = await supabase
    .from("occupations")
    .upsert(rows, { onConflict: "codigo_anzsco" });

  if (error) {
    return {
      error: `Não foi possível importar: ${error.message}`,
      resultado: null,
    };
  }

  const criadas = rows.filter(
    (r) => !codigosExistentes.has(r.codigo_anzsco),
  ).length;
  const atualizadas = rows.length - criadas;

  revalidatePath("/ocupacoes");
  revalidatePath("/configuracoes/ocupacoes");

  return {
    error: null,
    resultado: { criadas, atualizadas, ignoradas: errors.length },
  };
}
```

- [ ] **Step 2: Write the client form component**

```tsx
"use client";

import { useActionState } from "react";
import { importOccupationsCsv, type ImportOccupationsState } from "../actions";

const initialState: ImportOccupationsState = { error: null, resultado: null };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importOccupationsCsv,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="arquivo" className="block text-sm font-medium text-kmp-graphite">
          Arquivo CSV
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label htmlFor="conteudo" className="block text-sm font-medium text-kmp-graphite">
          Ou cole o conteúdo do CSV
        </label>
        <textarea
          id="conteudo"
          name="conteudo"
          rows={10}
          placeholder="nome,codigo_anzsco,categoria,autoridade_avaliadora,nivel_habilidade,na_csol,na_mltssl_legada,fonte"
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.resultado ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.resultado.criadas} criada(s), {state.resultado.atualizadas}{" "}
          atualizada(s)
          {state.resultado.ignoradas > 0
            ? `, ${state.resultado.ignoradas} linha(s) ignorada(s) por erro`
            : ""}
          .
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Importando…" : "Importar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

```tsx
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { OCCUPATION_CATEGORIES } from "@/lib/occupations/constants";
import { ImportForm } from "./_components/import-form";

export default async function ImportarOcupacoesPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Importar ocupações
        </h1>
        <p className="mt-1 text-sm text-kmp-graphite/60">
          Colunas esperadas, nessa ordem, com cabeçalho na primeira linha:
          nome, codigo_anzsco, categoria, autoridade_avaliadora,
          nivel_habilidade, na_csol, na_mltssl_legada, fonte. Categorias
          válidas: {OCCUPATION_CATEGORIES.join(", ")}. Ocupações existentes
          (mesmo código ANZSCO) são atualizadas; novas são criadas. O
          separador é vírgula simples — nomes ou autoridades com vírgula no
          texto não são suportados.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing these 3 files.

- [ ] **Step 5: Manual verification**

Requires Task 1 applied. With the dev server running, sign in as a non-admin staff user and visit `/configuracoes/ocupacoes` directly — expect a redirect to `/dashboard`. Sign in as admin, paste:

```
nome,codigo_anzsco,categoria,autoridade_avaliadora,nivel_habilidade,na_csol,na_mltssl_legada,fonte
Test Occupation QA,999902,Profissionais,VETASSESS,1,true,false,Teste manual
```

into the textarea and submit. Expected: success message "1 criada(s), 0 atualizada(s)."; the new occupation appears at `/ocupacoes`. Submit the exact same content again — expected: "0 criada(s), 1 atualizada(s)." (upsert by `codigo_anzsco`). Clean up by deleting the test row from the SQL Editor: `delete from public.occupations where codigo_anzsco = '999902';`.

- [ ] **Step 6: Commit**

```bash
git add "app/(staff)/configuracoes/ocupacoes"
git commit -m "feat: add admin CSV import tool for occupations"
```

---

### Task 9: Portal list page — `/portal/ocupacoes`

**Files:**
- Create: `app/(portal)/portal/ocupacoes/page.tsx`

**Interfaces:**
- Consumes: `getOccupations` from `lib/occupations/data.ts` (Task 3, unchanged — RLS grants the `client` role read access); `OCCUPATION_CATEGORIES` from `lib/occupations/constants.ts` (Task 3); `PortalHeader` from `app/(portal)/portal/_components/portal-header.tsx`.

- [ ] **Step 1: Write the page**

```tsx
import Link from "next/link";
import { getOccupations } from "@/lib/occupations/data";
import { OCCUPATION_CATEGORIES } from "@/lib/occupations/constants";
import { PortalHeader } from "../_components/portal-header";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortalOcupacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const categoria = firstValue(params.categoria) ?? "";

  const occupations = await getOccupations({ q, categoria });

  return (
    <div className="min-h-screen bg-kmp-bg">
      <PortalHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-heading text-2xl text-kmp-graphite">Ocupações</h1>

        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Informação de referência pública. Fale com sua consultora antes de
          tomar decisões com base nesses dados.
        </p>

        <form
          method="GET"
          className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3"
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou código ANZSCO"
            aria-label="Buscar por nome ou código ANZSCO"
            className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange sm:col-span-2"
          />
          <select
            name="categoria"
            defaultValue={categoria}
            aria-label="Filtrar por categoria"
            className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
          >
            <option value="">Todas as categorias</option>
            {OCCUPATION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Filtrar
            </button>
            {q || categoria ? (
              <Link
                href="/portal/ocupacoes"
                className="ml-3 text-sm text-kmp-graphite/70 hover:text-kmp-orange"
              >
                Limpar filtros
              </Link>
            ) : null}
          </div>
        </form>

        <div className="rounded-lg bg-white shadow-sm">
          {occupations.length === 0 ? (
            <p className="p-8 text-center text-sm text-kmp-graphite/60">
              Nenhuma ocupação encontrada.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {occupations.map((o) => (
                <li key={o.id} className="p-4 text-sm">
                  <Link
                    href={`/portal/ocupacoes/${o.id}`}
                    className="font-medium text-kmp-graphite hover:text-kmp-orange"
                  >
                    {o.nome} · {o.codigo_anzsco}
                  </Link>
                  <p className="mt-1 text-xs text-kmp-graphite/50">
                    {o.categoria} · {o.autoridade_avaliadora}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {o.na_csol ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        CSOL
                      </span>
                    ) : null}
                    {o.na_mltssl_legada ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        MLTSSL · válido para 485
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add "app/(portal)/portal/ocupacoes/page.tsx"
git commit -m "feat: add portal occupations list page"
```

---

### Task 10: Portal detail page + header link

**Files:**
- Create: `app/(portal)/portal/ocupacoes/[id]/page.tsx`
- Modify: `app/(portal)/portal/_components/portal-header.tsx`

**Interfaces:**
- Consumes: `getOccupation` from `lib/occupations/data.ts` (Task 3); existing `portalLogout` action from `app/(portal)/portal/actions.ts`.

- [ ] **Step 1: Write the detail page**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOccupation } from "@/lib/occupations/data";
import { PortalHeader } from "../../_components/portal-header";

export default async function PortalOcupacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const occupation = await getOccupation(id);
  if (!occupation) notFound();

  return (
    <div className="min-h-screen bg-kmp-bg">
      <PortalHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <Link
            href="/portal/ocupacoes"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            ← Ocupações
          </Link>
          <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
            {occupation.nome}
          </h1>
          <p className="mt-1 text-xs text-kmp-graphite/50">
            {occupation.categoria} · Nível de habilidade{" "}
            {occupation.nivel_habilidade}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <dl className="divide-y divide-black/5 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-kmp-graphite/50">Código ANZSCO</dt>
              <dd className="text-kmp-graphite">{occupation.codigo_anzsco}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-kmp-graphite/50">Autoridade avaliadora</dt>
              <dd className="text-kmp-graphite">
                {occupation.autoridade_avaliadora}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex gap-2">
          {occupation.na_csol ? (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              Na CSOL
            </span>
          ) : null}
          {occupation.na_mltssl_legada ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Na MLTSSL · válido para 485
            </span>
          ) : null}
        </div>

        <p className="text-xs text-kmp-graphite/50">
          Informação de referência pública. Fale com sua consultora antes de
          tomar decisões com base nesses dados.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add the nav link to the portal header**

In `app/(portal)/portal/_components/portal-header.tsx`, change:

```tsx
import { portalLogout } from "../actions";

export function PortalHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-4">
      <span className="font-heading text-xl text-kmp-graphite">KMP Hub</span>
      <form action={portalLogout}>
        <button
          type="submit"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          Sair
        </button>
      </form>
    </header>
  );
}
```

to:

```tsx
import Link from "next/link";
import { portalLogout } from "../actions";

export function PortalHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-4">
      <span className="font-heading text-xl text-kmp-graphite">KMP Hub</span>
      <nav className="flex items-center gap-4">
        <Link
          href="/portal/ocupacoes"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          Ocupações
        </Link>
        <form action={portalLogout}>
          <button
            type="submit"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing these 2 files.

- [ ] **Step 4: Manual verification**

Requires Task 1 applied. With the dev server running and a portal session logged in (see `playwright/setup/README.md` if no session cookie is available), visit `/portal` — the header now shows an "Ocupações" link everywhere in the portal. Click it, confirm the list renders with the disclaimer banner, click into one occupation, confirm the detail page renders without the "Importar CSV" affordance (portal has none) and without the admin-only elements from the staff page.

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/portal/ocupacoes/[id]/page.tsx" "app/(portal)/portal/_components/portal-header.tsx"
git commit -m "feat: add portal occupation detail page and header nav link"
```

---

## Self-Review

**Spec coverage:**
- `occupations` table with CSOL + legacy MLTSSL flags, sourced from the official Home Affairs list → Task 1.
- RLS: admin manage, staff read, client read, pgTAP test → Tasks 1–2.
- CSV import to keep the list current → Tasks 4, 8.
- Staff `/ocupacoes` + `/ocupacoes/[id]`, in the "Biblioteca" sidebar group → Tasks 5, 6, 7.
- Portal `/portal/ocupacoes` + `/portal/ocupacoes/[id]`, with the reference-only disclaimer, linked from the portal header → Tasks 9, 10.
- Detail-page-per-occupation (not just a table row) so a future "how each assessing authority evaluates" section has somewhere to go without a redesign → Tasks 6, 10 (explicitly out of scope for this plan, per spec's "Próximos passos").
- Starter dataset instead of a full ~1000-row scrape, admin completes the rest → Task 1's seed + Task 8's import tool.

**Placeholder scan:** No "TBD"/"TODO" left; every step has literal code or an exact command.

**Type consistency:** `Occupation` (Task 3) is the single type used unchanged by Tasks 5, 6, 9, 10. `OccupationFilters` (Task 3) matches the `{ q, categoria }` shape passed from every page. `ParsedOccupationRow` (Task 4) matches the row shape passed straight into `.upsert()` in Task 8 (same field names as the `occupations` columns from Task 1, so no mapping step is needed). `ImportOccupationsState` is defined once in Task 8's `actions.ts` and imported by its `import-form.tsx` — not redefined.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-25-ocupacoes.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
