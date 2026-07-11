# Supabase — KMP Hub

Migrações da fatia de **identidade e acesso** (seção 4 do plano), entregue no Sprint 1
(seção 10). Já aplicadas com sucesso no projeto Supabase de desenvolvimento.

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
  usuário de cada função e checando o que cada um consegue ler/escrever. Ainda não
  rodados neste ambiente (sem Supabase CLI/Docker) — tratar como primeira versão a
  validar com `supabase test db`, especialmente a mensagem exata de erro do
  `throws_ok` no teste de autopromoção, que precisa bater com a mensagem lançada por
  `prevent_self_role_escalation()` na migração de schema.

## Variáveis de ambiente

Este projeto usa o formato novo de chaves do Supabase (Settings > API Keys):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) — substitui a antiga anon key.
- `SUPABASE_SECRET_KEY` (`sb_secret_...`) — **somente servidor**, substitui a antiga
  service role key.

Ver `.env.example` na raiz do repositório para o nome exato de cada variável.

## Rodando os testes de permissão

**Sem instalar nada** — abra o projeto de dev no painel Supabase, vá em SQL
Editor, cole o conteúdo de `tests/database/001_identity_access_rls.test.sql` e
rode. O arquivo inteiro roda dentro de um `begin ... rollback`, então os
usuários e dados de teste que ele cria somem ao final; nada fica gravado no
banco. O resultado de cada `select is(...)`/`throws_ok(...)` aparece como uma
linha de saída (`ok 1 - ...` / `not ok 2 - ...`).

**Com Supabase CLI + Docker instalados**:

```
supabase test db
```

Isso recria o banco do zero a partir das migrações + seed (num Postgres local
descartável, não no projeto de dev) e roda todos os arquivos em
`tests/database/`.
