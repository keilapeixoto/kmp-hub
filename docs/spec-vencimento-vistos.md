# Especificação Técnica: Painel de Vencimento de Vistos

Projeto: KMP Hub (Next.js App Router + Supabase, projeto punbhrrynxdiybiajqwu, ap southeast 2)
Objetivo desta spec: dar ao Claude Code contexto e regras suficientes para implementar a funcionalidade sem precisar adivinhar decisões de negócio.

## 1. Objetivo

Hoje Keila não tem visão consolidada de quais clientes têm visto perto de vencer. Ela precisa de um painel dentro do KMP Hub que liste todos os clientes com visto ativo, ordenados por proximidade do vencimento, com alerta visual conforme a urgência.

## 2. Suposições sobre o schema atual (confirmar antes de implementar)

O Claude Code deve começar lendo o schema real do Supabase antes de assumir qualquer coisa abaixo. Pontos a verificar:

- Existe hoje algum campo de data de vencimento de visto na tabela de clientes ou casos? Se sim, qual nome e tipo.
- Existe campo de subclasse de visto atual (não o processo em andamento, mas o visto que o cliente já possui e está usando agora)?
- Um cliente pode ter mais de um visto relevante ao mesmo tempo (ex: titular e dependentes)? Se sim, o modelo precisa suportar isso em vez de um campo único por cliente.

Se os campos não existirem, criar:

- `current_visa_subclass` (texto ou enum, ex: "500", "485", "482")
- `current_visa_expiry_date` (data)
- `visa_alert_threshold_days` (inteiro, opcional, override por cliente do limite padrão de alerta)

> **Resolvido na implementação (2026-09-01)** — ver `supabase/migrations/20260901120000_clients_visto_atual.sql`:
> não existia nenhum campo de vencimento/subclasse de visto no schema. Cada dependente (cônjuge, filho etc.) já é
> um registro completo e separado em `clients` (ligado via `client_relations`), então um campo único por cliente
> já cobre o caso de titular + dependentes sem precisar de tabela nova. Os campos foram criados como
> `visto_atual_subclasse`, `visto_atual_validade` e `visto_alerta_limite_dias`, seguindo o padrão real de nomes de
> coluna do banco (português: `nome`, `situacao`, `validade`, `prazo`), não os nomes em inglês sugeridos acima.

## 3. Regras de negócio

Cálculo de urgência. Dias restantes = `current_visa_expiry_date` menos a data de hoje. Faixas de status (limites padrão configuráveis em uma constante, não hardcoded espalhado pelo código):

- Vencido: dias restantes menor que zero — cor vermelha escura, label "Vencido"
- Crítico: 0 a 30 dias — vermelho
- Atenção: 31 a 60 dias — laranja
- Monitorar: 61 a 90 dias — amarelo
- Sem urgência: mais de 90 dias — cinza ou verde neutro, sem destaque

Esses três números (30, 60, 90) devem ser uma constante nomeada e reutilizável, não valores soltos, porque Keila pode querer ajustar depois.

Clientes sem data de vencimento cadastrada. Não devem aparecer misturados como "sem urgência". Devem cair numa seção separada "Sem data de vencimento cadastrada", para que Keila veja que falta preencher esse dado, em vez de presumir que está tudo bem.

Ordenação padrão. Por data de vencimento, do mais próximo (ou já vencido) para o mais distante. Clientes sem data ficam ao final, na seção separada.

## 4. Interface

Página nova, por exemplo `/vencimentos`, acessível pelo menu principal do Hub.

Elementos:

- Lista ou tabela com colunas: nome do cliente, subclasse atual, data de vencimento, dias restantes, status (badge colorido conforme regra acima)
- Filtro por status (ex: mostrar só Crítico e Vencido)
- Busca por nome do cliente
- Contador no topo por faixa (ex: "3 vencidos, 5 críticos, 8 em atenção")
- Clique no cliente leva direto para o registro dele no Hub

Evitar herói genérico ou cards decorativos sem função; o valor aqui é a lista escaneável rápido, então priorizar densidade de informação e leitura rápida sobre estilo visual elaborado.

## 5. Casos especiais

- Cliente com processo de renovação já em andamento: mesmo assim deve continuar aparecendo no painel até o novo visto ser confirmado e a data atualizada, porque o visto atual ainda está correndo.
- Mais de um visto por cliente (titular e dependentes): resolvido — cada dependente já é um registro de cliente separado no Hub hoje (ver nota na seção 2).

## 6. Fase futura, fora do escopo desta primeira versão

Resumo semanal por email (usando a conta Gmail já conectada, vistos@kmpconsulting.com.au ou keila.peixoto@kmpconsulting.com.au) listando os vistos que entraram na faixa Crítico ou Atenção na última semana. Não implementar agora, apenas deixar o modelo de dados pronto para suportar isso depois sem retrabalho.

## 7. Perguntas em aberto — respostas da Keila (2026-09-01)

1. ~~Cada cliente no Hub hoje representa uma pessoa física, ou um processo pode ter mais de um visto associado?~~
   Resolvido pelo schema: cada pessoa (titular ou dependente) é um registro próprio em `clients`.
2. ~~O campo de data de vencimento do visto atual já existe em algum lugar do Hub hoje?~~
   Não existia — criado nesta implementação.
3. Os limites de 30/60/90 dias como padrão — confirmados, sem alteração pedida.
4. **Escopo do painel**: mostrar todos os clientes que estão atuando no caso — ainda não finalizado (ex.: coleta de
   documentos, aplicado, request recebido, aprovado). Implementado como: clientes com pelo menos um processo
   (`cases`) com `status = 'ativo'`, qualquer que seja a etapa (`case_stages`) em que estejam.
