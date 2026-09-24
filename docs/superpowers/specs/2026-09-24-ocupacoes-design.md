# Ocupações (skilled occupation list) — design

## Contexto e motivação

A equipe usa hoje o site da Delta Immigration
(`deltaimmigration.com.au/Australia-jobs/`) para consultar rapidamente se a
ocupação de um cliente está numa lista de habilidades elegível, qual o
código ANZSCO, qual o órgão avaliador e o nível de habilidade. A página de
listagem desse site está com título de 2019/2020; as páginas individuais de
ocupação são mantidas e atuais (rodadas de convite visíveis até 06/2026),
mas replicam uma matriz grande de elegibilidade por subclasse de visto e
histórico de pontuação por rodada — dado que muda a cada rodada (~2 meses) e
que a KMP não pediu para manter.

Em dezembro de 2024 o governo australiano substituiu o modelo antigo
(MLTSSL/STSOL/ROL) por uma lista única, a **Core Skills Occupations List
(CSOL)**, publicada pelo Department of Home Affairs
(`immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list`).
A MLTSSL antiga continua relevante porque define elegibilidade em certos
streams do visto 485 (Temporary Graduate), então o hub precisa guardar as
duas classificações por ocupação, não só a CSOL vigente.

Objetivo: uma referência interna de ocupações, com dado atual e fonte
oficial, disponível para a equipe e para o cliente no portal — não uma
réplica 1:1 do site da Delta.

## Fora de escopo (v1)

- Matriz de elegibilidade por subclasse de visto (189/190/491/482/494/186/
  407/485) e histórico de pontuação por rodada de convite — manutenção
  permanente que não foi pedida; pode virar v2 se a equipe sentir falta.
- Notas internas por ocupação (ex: "cuidado com X nessa avaliação") — não
  pedido agora; se vier depois, entra como tabela separada com RLS que
  exclui `client`, seguindo a convenção do projeto para notas internas.
- Conteúdo detalhado por órgão avaliador (como funciona a validação de cada
  um, regras específicas) — pedido explicitamente como "depois". O desenho
  abaixo já prevê o ponto de extensão (página de detalhe por ocupação +
  `assessing_authority` como texto simples por enquanto, podendo virar
  tabela própria `assessing_authorities` sem quebrar nada quando for
  construído).

## Dados

Tabela nova `public.occupations`, seguindo as convenções do projeto (schema
em inglês, `id uuid`, `created_at`/`updated_at`, RLS desde a migração):

| coluna                | tipo         | notas                                                                 |
|------------------------|--------------|------------------------------------------------------------------------|
| `id`                   | uuid pk      |                                                                          |
| `nome`                 | text         | nome da ocupação, ex. "Construction Project Manager"                   |
| `anzsco_code`          | text         | código de 6 dígitos, único                                             |
| `categoria`            | text         | grupo ANZSCO major (ver lista abaixo), check constraint                |
| `assessing_authority`  | text         | ex. "VETASSESS", "Engineers Australia"                                 |
| `skill_level`          | integer      | 1–5, conforme ANZSCO                                                   |
| `on_csol`               | boolean      | está na Core Skills Occupations List vigente                           |
| `on_mltssl_legacy`      | boolean      | estava na MLTSSL antiga — relevante para elegibilidade em streams do 485 |
| `fonte`                | text         | referência da fonte oficial (URL/data da lista importada)              |
| `status`               | text         | `ativo`/`arquivado`, check constraint (default `ativo`)                |
| `created_at`/`updated_at` | timestamptz | trigger `set_updated_at` padrão do projeto                          |

Categorias (v1, grupos ANZSCO skill level 1–3, os relevantes para listas de
habilidade): Gerentes; Profissionais; Técnicos e Trabalhadores de Ofícios;
Trabalhadores de Serviços Comunitários e Pessoais.

Índices: único em `anzsco_code`; índice em `categoria` para o filtro.

### RLS

- `occupations_manage_admin`: admin faz tudo.
- `occupations_select_staff`: `director`, `consultant`, `operations`,
  `finance` leem ocupações com `status = 'ativo'`.
- `occupations_select_client`: `client` lê ocupações com `status = 'ativo'`
  — é dado público de referência (código ANZSCO, órgão avaliador, listas),
  não segue a regra de "notas internas nunca aparecem no portal" porque não
  há nota interna nessa tabela.

Teste pgTAP novo em `supabase/tests/database/` cobrindo os 3 papéis acima
mais um papel sem acesso (ex. `partner`, se a matriz da seção 5 não conceder
a ele), seguindo o padrão dos testes existentes (ex.
`007_guides_templates_audit_rls.test.sql`).

## Importação de dados

- Seed inicial (na própria migração ou num script separado em `scripts/`,
  a definir no plano): conjunto real de ocupações mais comuns no perfil de
  cliente da KMP (construção, engenharia, TI, saúde, contabilidade),
  extraído da lista combinada oficial do Home Affairs. Não é a lista
  completa (~1000 ocupações) — isso não pode ser garantido fielmente numa
  raspagem manual nesta sessão.
- Ação de servidor `admin`-only que recebe um CSV (colado ou upload) e faz
  upsert por `anzsco_code`, para a equipe completar/atualizar a lista a
  partir do arquivo oficial (`immi.homeaffairs.gov.au` → instrumento
  legislativo) sempre que ele mudar. UI simples: textarea ou input de
  arquivo + botão "Importar", com resumo de quantas linhas foram
  criadas/atualizadas/ignoradas (erro de parsing).

## Telas

### Equipe — `/ocupacoes` (grupo "Biblioteca" no menu, ao lado de Guias/Templates)

- Campo de busca (nome ou código ANZSCO) + filtro por categoria.
- Tabela: Ocupação | Código ANZSCO | Autoridade avaliadora | CSOL | MLTSSL
  (485) — cada linha linka para `/ocupacoes/[id]`.
- Link "Importar CSV" visível só para admin, leva a
  `/configuracoes/ocupacoes` (segue o padrão de
  `/configuracoes/servicos`, `/configuracoes/checklists` etc. já existente
  para telas de administração).

### Equipe — `/ocupacoes/[id]`

- Nome, código ANZSCO, categoria, autoridade avaliadora, nível de
  habilidade, badges "Na CSOL" / "Na MLTSSL (485)", fonte.
- Estrutura pronta para receber depois uma seção "Como funciona a
  avaliação" por órgão, sem mudar rota nem schema.

### Portal do cliente — `/portal/ocupacoes` e `/portal/ocupacoes/[id]`

- Mesmo padrão de busca/filtro/tabela e página de detalhe, sem o link de
  importação.
- Aviso curto no topo: informação de referência pública, não substitui a
  avaliação da consultora — evita que o cliente leia a página como uma
  promessa de elegibilidade fechada.

## Navegação

- `app/(staff)/_components/sidebar.tsx`: novo item "Ocupações" no grupo
  "Biblioteca", ícone a escolher (ex. `Globe` ou `ListChecks` do
  `lucide-react`, a confirmar no plano).
- Portal: adicionar o link em `portal-header.tsx` (ou onde a navegação do
  portal já linka para `/portal/documentos` etc.).

## Próximos passos (fora desta v1, registrados a pedido do usuário)

1. Conteúdo por órgão avaliador dentro de cada ocupação — como funciona a
   validação, regras específicas de cada assessing authority. Quando isso
   entrar em escopo, avaliar se `assessing_authority` vira uma tabela
   própria (`assessing_authorities`) referenciada por `occupations`, em vez
   de texto solto.
2. Se a equipe sentir falta do histórico de rodadas de convite ou da matriz
   de elegibilidade por visto, tratar como projeto separado (fonte de dado
   e cadência de atualização diferentes do resto desta feature).
