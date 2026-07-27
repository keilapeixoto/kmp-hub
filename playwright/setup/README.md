# Sessões de teste (Playwright)

Os testes e2e (`tests/e2e/staff`, `tests/e2e/portal`) reusam uma sessão já
autenticada salva em `playwright/.auth/*.json` (gitignored — contém token
real de login, nunca versionar). Ninguém automatiza o login em si: você faz
uma vez manualmente, o Playwright salva a sessão, e os testes reusam até ela
expirar.

## Gerar/renovar a sessão da equipe

```bash
npm run test:e2e:login:staff
```

Abre o Chromium visível na tela de `/login` e pausa. Faça login normalmente
(e-mail + senha da equipe). Quando o dashboard carregar, clique **Resume** no
Playwright Inspector que abriu junto — a sessão é salva em
`playwright/.auth/staff.json`.

## Gerar/renovar a sessão do portal (magic link)

```bash
npm run test:e2e:login:portal
```

Abre o Chromium visível na tela de `/portal/login`. Envie o link mágico,
abra o e-mail e **cole a URL do link nessa mesma janela** controlada pelo
Playwright (clicar o link no seu navegador do dia a dia não autentica essa
sessão, são contextos diferentes). Quando o dashboard do portal carregar,
clique **Resume** — a sessão é salva em `playwright/.auth/portal.json`.

## Rodando os testes

```bash
npm run test:e2e        # roda staff + portal (precisa das sessões acima já geradas)
npm run test:e2e:ui     # mesmo, com a UI interativa do Playwright
```

Se um teste falhar com erro de redirecionamento pra tela de login, é sinal
de que a sessão salva expirou — rode o comando de login correspondente de
novo.
