# Relatório · Sprint 8 · Verificação dos 17 critérios (seção 32 reconstruída)

Data: 2026-07-18 · Ambiente: kmp-hub-dev · Status geral: **em andamento**

Legenda: 🟢 VERDE · 🟡 AMARELO (funciona com ressalva / verificação pendente) ·
🔴 VERMELHO (não atende / bloqueado). O sprint só fecha com os 17 em 🟢.

| # | Critério | Status | Evidência / pendência |
|---|---|---|---|
| 1 | Permissões no banco (RLS) | 🟡 | 7 suítes pgTAP (`supabase/tests/database/001–007`) cobrem leitura/escrita por função em todas as tabelas, incluindo os casos críticos (cliente nunca vê resumo pós-consulta, arquivados só admin). **Pendente: executar as 7 suítes no SQL Editor e anexar o resultado aqui.** |
| 2 | Nada acessível sem autenticação | 🟢 | Verificado programaticamente: rota de staff deslogada → redirect para /login (proxy.ts); URL pública de objeto do bucket `documents` → HTTP 400 (bucket privado); downloads só por URL assinada de 5 min gerada no clique, nunca armazenada. |
| 3 | Auditoria completa | 🟢 | Trigger `audit()` em 19 tabelas registrando INSERT/UPDATE/DELETE com tabela, operação, registro, autor e dados; verificado ao vivo (UPDATEs de clients registrados). RLS: só admin lê; ninguém edita (sem política de update/delete). Nota: mutações via script administrativo têm `autor` nulo (esperado — não há usuário de sessão); ações pelo app registram o `auth.uid()`. |
| 4 | Datas no fuso de Sydney | 🟡 | Armazenamento 100% UTC (`timestamptz`); conversão só na interface via `lib/appointments/timezones.ts` (BR/Sydney/Brisbane, com tratamento de horário de verão em duas passadas). O seed cria compromissos perto da meia-noite de Sydney. **Pendente: conferir visualmente na agenda com os dados demo.** |
| 5 | Interface bilíngue (pt/en) | 🔴 | **next-intl não foi implementado** — toda a interface está em português hardcoded. Item 17 da lista da Fase 1 que ficou de fora dos Sprints 1–7. Estimativa: 1 sprint próprio (extração de ~todas as strings + dicionários pt/en). Decisão da Keila: implementar antes do go-live ou aceitar PT-only na virada. |
| 6 | Identidade KMP consistente | 🟡 | Código usa exclusivamente os tokens do tema (laranja #F27B20, grafite #2C2C2C, fundo #F8F7F5, Cormorant Garamond/Outfit, sem emoji na interface). **Pendente: revisão visual da Keila tela a tela.** |
| 7 | Uso completo no celular (380px) | 🟡 | Layout usa grids responsivos e tabelas com scroll horizontal; Kanban com colunas roláveis. **Pendente: teste real em viewport 380px (a sidebar fixa de 256px é a principal suspeita — sem colapso mobile hoje).** |
| 8 | Estados vazios e erros | 🟡 | Todas as listas têm estado vazio com orientação; formulários principais têm mensagem de erro. Ressalva: mensagens genéricas ("Não foi possível salvar") em alguns fluxos — sem detalhe do campo problemático. |
| 9 | Documentos com versões | 🟡 | Versões preservadas (append-only), arquivamento soft delete, percentual recalculado por trigger. **Gap: não existe ação de RESTAURAR um documento arquivado** (nem para admin) — item de lapidação. |
| 10 | Alertas nas condições certas | 🟡 | Implementados: documento vencendo (≤90d), lead inativo (≥14d), tarefa vencida, compromisso sem resumo, processo parado (≥14d). O seed cria os casos de borda. **Pendente: validação visual com os dados demo.** |
| 11 | Kanban confiável | 🟡 | Drag-and-drop atualiza o banco imediatamente e gera histórico automático (verificado em uso real no Sprint 2). **Pendente: teste formal de arrastes em sequência rápida + recarregar.** |
| 12 | Busca global precisa e segura | 🟡 | Busca em leads/clientes (nome, e-mail, telefone), processos, tarefas e guias; RLS aplica permissões por construção (queries da sessão). **Gap: busca sensível a acento** ("Julia" não encontra "Júlia") — requer extensão `unaccent` + função de busca; item de lapidação. |
| 13 | Resumo pós-consulta obrigatório | 🔴 | Implementado como **alerta persistente** (compromisso passado sem resumo é destacado na agenda e no detalhe), não como bloqueio. O critério pede bloqueio, mas não existe ação de "concluir consulta" para bloquear. Decisão da Keila: (a) aceitar o alerta como cumprimento, ou (b) definir o que deve ser bloqueado (ex.: impedir novo compromisso para o mesmo cliente até registrar o resumo). |
| 14 | Desempenho aceitável | 🟡 | Observado no dev: dashboard 2–4 s (modo desenvolvimento, sem cache). **Pendente: medir com build de produção + dados demo; dev não é representativo.** |
| 15 | Migração íntegra do CRM antigo | 🔴 | **Bloqueado: os CSVs do CRM antigo não foram anexados à sessão.** Script, mapeamentos e relatório serão produzidos quando os arquivos chegarem (Parte 3). |
| 16 | Backup e recuperação | 🔴 | **Bloqueado: o projeto Supabase de produção ainda não existe.** Plano Free do dev não tem PITR; rotina de backup + teste de restauração serão configurados na criação do prod. |
| 17 | Demo removível com segurança | 🟢 | Ciclo executado em 2026-07-18 com dados reais e demo coexistindo no dev: seed → clean → re-seed. 58 registros demo removidos; contagem de dados reais idêntica antes e depois (182 clients, 1 lead, 5 service_types). `clean-demo.mjs` imprime a prova a cada execução. |

## Resumo

- 🟢 2 · 🟡 11 · 🔴 4
- **Vermelhos que dependem de decisão/insumo da Keila**: C5 (i18n — implementar ou adiar), C13 (definir o bloqueio), C15 (anexar CSVs), C16 (criar projeto prod).
- **Amarelos que viram verdes com execução**: C1 (rodar as 7 suítes pgTAP), C17 (rodar seed+clean), C4/C10 (conferir com demo).
- **Amarelos que dependem de teste manual da Keila**: C6, C7, C11, C14 (build de produção).
- **Itens de lapidação identificados**: restaurar documento arquivado (C9), busca sem acento (C12), colapso da sidebar no mobile (C7), mensagens de erro específicas (C8).

Este arquivo será atualizado a cada critério que mudar de status.
