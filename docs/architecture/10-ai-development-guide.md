# 10. AI Development Guide

Este documento existe para uma razão específica: **qualquer IA que continuar
este projeto deve produzir código indistinguível de quem já trabalhou nele
há meses.** Não é um resumo dos outros nove documentos — é o atalho
operacional para não precisar reler tudo antes de cada tarefa, mais os
erros específicos já cometidos e corrigidos neste projeto, para não
repeti-los.

## Antes de escrever a primeira linha

1. Leia `CLAUDE.md` na raiz — é o estado **atual** do projeto (o que já foi
   construído, o que está pendente, decisões de produto recentes). Este
   `docs/architecture/` é a estrutura **estável**; `CLAUDE.md` é o que mudou
   essa semana.
2. Identifique o domínio da tarefa (`leads`, `cases`, `documents`, etc.) e
   olhe como o domínio equivalente mais próximo já resolveu o mesmo tipo de
   problema — este projeto tem ~15 domínios maduros; quase toda tarefa nova
   é uma variação de um padrão já existente, não um problema original.
3. Se a tarefa envolve schema novo: leia
   [04 — Database Architecture](./04-database-architecture.md) e
   [08 — Security Guide](./08-security-guide.md) **antes** de escrever a
   migração — não depois, como correção.

## Checklist de toda tarefa que muda o schema

1. Migração nova em `supabase/migrations/`, nunca editar uma já aplicada.
2. RLS habilitada na mesma migração que cria a tabela.
3. Se a tabela tem mais de uma FK relacionada (ex.: `case_id` +
   `checklist_item_id`), avalie se precisa de um trigger de validação
   cruzada — RLS por coluna isolada não garante que as duas FKs pertencem
   à mesma cadeia de posse (ver o caso real documentado em
   [08](./08-security-guide.md)).
4. Teste pgTAP correspondente em `supabase/tests/database/`, numerado na
   sequência (verifique o último número existente antes de nomear o novo).
5. **Apresente as migrações ao usuário em blocos de SQL prontos para colar
   no SQL Editor do Supabase, uma de cada vez ou em lote pequeno, na ordem
   correta** — este projeto não tem CLI do Supabase conectada/aplicando
   migração automaticamente; é o usuário quem cola e roda cada uma. Espere
   a confirmação antes de assumir que rodou.
6. Só depois de confirmado que a migração rodou, prossiga com qualquer
   verificação de UI que dependa das colunas/tabelas novas — testar antes
   disso vai falhar de forma confusa (a query volta vazia ou dá erro de
   coluna inexistente, não necessariamente um erro óbvio).

## Armadilhas específicas deste projeto (já caímos nelas — não repita)

- **PostgREST trunca em 1000 linhas sem `.range()` explícito, silenciosamente
  (sem erro).** Qualquer agregação/auditoria que possa passar de 1000 linhas
  precisa paginar. Isso já causou um falso alarme grave (um script de
  auditoria "encontrou" ~1900 arquivos órfãos que na verdade só não tinham
  sido lidos por causa do limite — corrigido, mas o padrão vale para
  qualquer query nova sobre tabela grande).
- **pgTAP no SQL Editor do Supabase só mostra o resultado da última
  instrução do script.** O padrão deste projeto é inserir cada resultado de
  teste (`is()`, `ok()`, `throws_ok()`) numa tabela de rascunho
  (`public._test_results_scratch`, uma tabela real, **não** `create temp
  table` — temp table já causou falha misteriosa aqui) e terminar o script
  com `select … order by n`. Copie esse padrão de qualquer teste existente,
  não reinvente.
- **`create extension pgtap` + `set search_path` precisam vir ANTES de
  `select plan(N)`**, nessa ordem exata — inverter a ordem faz
  `plan()`/`ok()` falharem com "function does not exist".
- **`throws_ok(sql, string)` de 2 argumentos não significa "espera esse
  texto de erro"** — o segundo argumento é interpretado como código
  SQLSTATE esperado. Para checar "lança erro com uma descrição legível",
  use a forma de 4 argumentos: `throws_ok(sql, '42501', null, descrição)`.
- **Server Actions chamadas fora de um `<form>` (via `startTransition`
  direto) ainda funcionam com `redirect()`** — não é preciso um `<form>`
  real para isso funcionar, mas confirme sempre testando de verdade, não
  assumindo.
- **`window.confirm()` não é confiável em automação de navegador para
  teste.** Se for verificar uma ação destrutiva via browser automatizado,
  sobrescreva `window.confirm = () => true` antes do clique, ou teste a
  lógica direto no banco (via script com o cliente admin) e trate a
  confirmação visual como verificação separada, mais leve.
- **Next.js App Router ignora pastas prefixadas com `_`** — é assim que
  `_components/` funciona; não é um acidente de nomenclatura.
- **`ChecklistItemsPercentual` (e qualquer cálculo agregado parecido) vive em
  trigger, nunca em Server Action** — se um cálculo precisa estar sempre
  certo mesmo que alguém escreva na tabela por outro caminho, ele não pode
  depender de uma função de aplicação ser chamada.

## Ao construir UI nova

1. Comece como Server Component. Só desça para `"use client"` no componente
   folha que realmente precisa de interação (ver
   [06 — Component Architecture](./06-component-architecture.md)).
2. Reaproveite as classes de [05 — Design System](./05-design-system.md) —
   não invente uma cor ou espaçamento novo sem checar se já existe um
   padrão equivalente em outra tela.
3. Rode `npx tsc --noEmit` e `npm run lint` antes de considerar a tarefa
   pronta — **sempre**, mesmo para mudanças pequenas.
4. Se a mudança é visível no navegador, verifique no navegador antes de
   reportar como concluída — não afirme que uma tela funciona sem ter
   olhado.

## Ao propor uma feature grande (múltiplos domínios, múltiplas telas)

Este projeto tem histórico de pedidos grandes chegando de uma vez (ex.:
"controle de armazenamento completo", "gestão de usuários + pipelines
configuráveis + formulários + documentos" no mesmo pedido). O padrão que
funcionou:

1. **Revise o que já existe antes de propor construir algo do zero** — parte
   significativa de pedidos grandes já está parcialmente resolvida por
   features anteriores; apontar isso primeiro economiza trabalho duplicado
   e generate confiança.
2. **Divida em áreas entregáveis independentes** e pergunte a ordem de
   prioridade quando não for óbvia — não assuma a ordem sozinho quando o
   pedido cobre 5+ áreas diferentes.
3. Entregue uma área por vez: migração → RLS → teste pgTAP → código →
   typecheck/lint → verificação no navegador → commit → push. Não acumule
   várias áreas sem checkpoint — se algo quebrar, fica difícil isolar onde.
4. Ao final de cada área, resuma o que mudou em uma frase — não é preciso
   escrever um relatório longo a cada passo.

## O que nunca fazer, mesmo se pedido

- Desabilitar RLS "temporariamente".
- Excluir dado operacional de verdade em vez de arquivar.
- Expor `SUPABASE_SECRET_KEY` em qualquer código que rode no navegador.
- Pular o teste pgTAP "porque a mudança é pequena".
- Construir uma feature de Fase 2+ listada como adiada em
  [01 — Product Vision](./01-product-vision.md) sem confirmação explícita
  do usuário de que a fase já fechou.
