# Supabase — KMP Hub

Migrações da fatia de **identidade e acesso** (seção 4 do plano), entregue no Sprint 1
(seção 10). Escritas e revisadas manualmente; **não aplicadas nem testadas neste
ambiente** — não há Supabase CLI, Docker, psql nem Node.js instalados na máquina onde
isso foi gerado, então nada aqui rodou contra um Postgres real ainda.

## O que tem aqui

- `migrations/20260710120000_identity_access_schema.sql` — tabelas `roles`,
  `profiles`, `permissions`, `client_access`; função `get_user_role()`; trigger
  `handle_new_user` (cria o profile ao criar um usuário em `auth.users`); trigger
  `prevent_self_role_escalation` (ninguém muda a própria `role_id`/`ativo` exceto admin).
- `migrations/20260710121000_identity_access_rls.sql` — RLS ativado nas 4 tabelas,
  políticas seguindo a matriz de permissões da seção 5 (módulo "Equipe/Config":
  admin gestão total, diretor leitura, demais funções sem acesso).
- `seed.sql` — insere as 7 funções (`admin`, `director`, `consultant`, `operations`,
  `finance`, `partner`, `client`).
- `tests/database/001_identity_access_rls.test.sql` — testes pgTAP simulando um
  usuário de cada função e checando o que cada um consegue ler/escrever.

## O que ficou fora do escopo desta entrega

Por decisão explícita (ambiente sem Node.js), **o scaffold do Next.js não foi criado
nesta rodada**: nem a estrutura de rotas `(staff)`/`(portal)`, nem a tela de login,
nem o código de autenticação em si. Isso fica para quando houver Node/npm disponíveis.
O que existe aqui é só a parte de banco (schema + RLS + seed + testes), que não
depende de Node.

## Antes de aplicar

1. `supabase init` (se o projeto ainda não tiver `config.toml`) e `supabase link`
   ao projeto de desenvolvimento.
2. Conferir `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   e `SUPABASE_SERVICE_ROLE_KEY` (essa última só em variável de servidor, nunca com
   prefixo `NEXT_PUBLIC_`).
3. `supabase db push` para aplicar as migrações no projeto de desenvolvimento — nunca
   direto em produção sem revisar antes.

## Rodando os testes de permissão

```
supabase test db
```

Isso recria o banco a partir das migrações + seed e roda os arquivos em
`tests/database/`. Como esse comando não pôde ser executado aqui, trate os testes
como uma primeira versão a validar — especialmente a mensagem exata de erro do
`throws_ok` no teste de autopromoção, que precisa bater com a mensagem lançada por
`prevent_self_role_escalation()` na migração de schema.
