# 13. Architectural Risks

Este documento existe para ser incômodo — cada item aqui é uma decisão que
funciona hoje mas que pode custar caro se ignorada por tempo demais. Revise
esta lista periodicamente (sugestão: a cada fase concluída do
[roadmap](./11-development-roadmap.md)) e mova itens resolvidos para o
histórico no `CLAUDE.md`, não simplesmente apague.

Escrito a partir de uma revisão crítica completa da arquitetura, na
perspectiva de um produto que pretende crescer de uma empresa piloto (KMP
Consulting) para centenas ou milhares de organizações clientes de um SaaS.

## Tabela-resumo (classificação por momento de ação)

| # | Risco | Categoria | Prioridade | Resolver |
|---|---|---|---|---|
| 1 | Backup do Storage não existe | Backups | **Crítica** | Agora |
| 2 | Auditoria não cobre download de arquivo | Auditoria / Compliance | **Alta** | Agora |
| 3 | Privacidade e conformidade regulatória não documentadas | Privacidade / Compliance | **Alta** | Agora (documentar) / Depois (implementar controles) |
| 4 | Risco de "zero admin" (lockout) | Segurança | Alta | Agora |
| 5 | Colunas `not null` sem default em formulário genérico | Qualidade de código | Média | Agora |
| 6 | MFA de equipe planejada mas não obrigatória | Segurança | Alta | Antes de 2º cliente |
| 7 | Migrações aplicadas manualmente, sem CI | Manutenção | Média | Antes de produção |
| 8 | Único ambiente Supabase (sem produção separada) | Disponibilidade | Alta | Antes de mais uso real |
| 9 | Nenhum teste automatizado além de pgTAP | Qualidade de código | Média | Conforme lógica de app crescer |
| 10 | shadcn/ui mandatado mas não adotado | Manutenção | Baixa | Incremental, já em andamento |
| 11 | Vendor lock-in — chamadas Supabase espalhadas | Dependência de fornecedor | Média | Incremental, a partir de agora |
| 12 | Custo de Storage em escala | Custo de infraestrutura | Baixa hoje / Média em escala | Só em escala |
| 13 | Disponibilidade e SLA (sem plano de failover) | Disponibilidade | Média | Antes de 2º cliente pagante |
| 14 | Vercel Cron e limites de plano | Escalabilidade | Baixa | Antes de multi-tenant |
| 15 | Resend sem domínio verificado | Manutenção | Média | Agora |
| 16 | Duas fontes de "documento aprovado" | Qualidade de código | Baixa | Ao construir relatório de aprovação |
| 17 | Pooling de conexão em modo transação (serverless) | Performance / Escalabilidade | Média | Confirmar agora, revisitar em escala |
| 18 | Crescimento de policies de RLS sem verificação automatizada em CI | Manutenção / Segurança | Média | Antes de produção |
| 19 | Corte multi-tenant com dado real em produção (zero downtime) | Migração futura | — (só se aplica no momento da migração) | Só na migração |

## Riscos detalhados

### Risco 1 — Backup do Storage não existe

- **Descrição**: o backup diário do Supabase (plano Pro) cobre só o
  Postgres. Os ~2 GB de arquivos reais no bucket `documents` (passaportes,
  extratos, formulários assinados de 190 clientes reais) não têm backup
  automático.
- **Impacto**: Crítico — se o bucket for corrompido/apagado por erro
  humano ou bug, os arquivos reais são perdidos sem recurso; o backup do
  banco só recupera a referência (`storage_path`), não o conteúdo.
- **Probabilidade**: Baixa no dia a dia, mas **não nula** — erro humano
  (exclusão em massa acidental) e bugs de terceiro (biblioteca de upload,
  script de manutenção) são os vetores reais.
- **Prioridade**: Crítica — é o único risco desta lista sem segunda chance.
- **Recomendação**: implementar espelhamento periódico do bucket (semanal
  é razoável no volume atual) para um segundo local de armazenamento.
- **Momento adequado**: agora — antes que o volume cresça e o custo/tempo
  do primeiro backup completo aumente.

### Risco 2 — Auditoria não cobre download de arquivo

- **Descrição**: o trigger de auditoria (`audit_logs`) dispara em
  insert/update/delete de linha — nunca em leitura/download. Gerar uma URL
  assinada e baixar um passaporte não deixa rastro nenhum hoje.
- **Impacto**: Alto para conformidade — para dado desta sensibilidade, não
  saber quem acessou o quê e quando é uma lacuna real de auditoria, não
  cosmética.
- **Probabilidade**: Certeza — é uma lacuna estrutural, não um evento
  probabilístico.
- **Prioridade**: Alta.
- **Recomendação**: registrar explicitamente cada geração de URL assinada
  de documento sensível (quem, qual documento, quando) numa tabela própria
  de log de acesso, separada de `audit_logs` (que é de mutação, não de
  leitura) — implementação simples no Route Handler de download já
  existente.
- **Momento adequado**: agora, antes de operar com um volume de acesso que
  torne a falta de rastro mais custosa de investigar retroativamente.

### Risco 3 — Privacidade e conformidade regulatória não documentadas

- **Descrição**: o sistema guarda dado sujeito a regimes de proteção de
  dados (documento de identidade, financeiro, migratório) de clientes
  potencialmente sujeitos à legislação australiana de privacidade e, se o
  produto expandir para clientes de outras jurisdições, a regimes como
  GDPR. Não existe hoje: política de retenção formal, processo de
  atendimento a pedido de exclusão/portabilidade de dado do titular,
  documentação de onde o dado fisicamente reside (região do projeto
  Supabase), nem termo de tratamento de dado entre o produto e a empresa
  cliente (relevante já no modelo single-tenant, crítico no modelo SaaS
  multi-tenant, onde o produto processa dado de titulares em nome de
  terceiros).
- **Impacto**: Alto — exposição regulatória e de confiança do cliente,
  agravada pela sensibilidade do dado (item já destacado no
  [Security Guide](./08-security-guide.md)).
- **Probabilidade**: Média — não é uma falha técnica que "acontece", é uma
  lacuna de processo que se torna risco real no primeiro pedido de
  auditoria, incidente, ou exigência contratual de um cliente maior.
- **Prioridade**: Alta.
- **Recomendação**: documentar (não necessariamente implementar tudo de
  uma vez) uma política de retenção e um processo de resposta a pedido de
  titular de dado antes do primeiro cliente pagante externo à KMP; validar
  a região do projeto Supabase de produção contra onde os titulares de
  dado realmente residem.
- **Momento adequado**: documentar agora; implementar controles técnicos
  (ex.: exclusão automatizada após prazo de retenção) antes do segundo
  cliente real.

### Risco 4 — "Zero admin" (lockout)

- **Descrição**: o trigger `prevent_self_role_escalation` impede um
  usuário não-admin de mudar a própria função/status — mas não impede um
  admin de desativar a própria conta, nem existe checagem de "não permitir
  desativar o último admin ativo".
- **Impacto**: Alto — se o único admin se desativar (engano, script mal
  calibrado), ninguém tem acesso para reverter pela interface.
- **Probabilidade**: Baixa, mas o custo de mitigar é muito menor que o
  custo de acontecer.
- **Prioridade**: Alta.
- **Recomendação**: bloquear (trigger ou Server Action) desativar/remover
  o último usuário com `role = 'admin' and ativo = true`.
- **Momento adequado**: agora — é uma mudança pequena e barata.

### Risco 5 — Colunas `not null` sem default em formulário genérico

- **Descrição**: já aconteceu neste projeto — `cases.consultor_id` é
  `not null`, e o formulário genérico de edição de processo reenvia todos
  os campos a cada save, causando erro quando o processo não tem
  consultor atribuído.
- **Impacto**: Médio — quebra pontual de UX (usuário não consegue salvar),
  não risco de segurança ou perda de dado.
- **Probabilidade**: Certa de se repetir em qualquer coluna `not null` sem
  `default` editada por formulário genérico, se não for tratada como
  classe de problema.
- **Prioridade**: Média.
- **Recomendação**: ao adicionar coluna `not null` sem `default` a uma
  tabela editada por formulário genérico, tornar o campo `required` no
  HTML ou fazer a Server Action preservar o valor existente quando vier
  vazio, em vez de sobrescrever com `null`.
- **Momento adequado**: agora para `cases.consultor_id` especificamente
  (já identificado); como regra de revisão para toda coluna nova daqui pra
  frente.

### Risco 6 — MFA de equipe planejada mas não obrigatória

- **Descrição**: o plano original prevê MFA TOTP para equipe; não está
  implementada/obrigatória.
- **Impacto**: Alto — conta de equipe comprometida por senha vazada tem
  acesso total ao que a função permite, sem segunda barreira, para dado
  altamente sensível.
- **Probabilidade**: Média — phishing/reuso de senha é o vetor mais comum
  de comprometimento de conta em qualquer produto B2B.
- **Prioridade**: Alta.
- **Recomendação**: priorizar antes de operar com mais usuários de equipe
  ou um segundo cliente — Supabase Auth já suporta MFA nativamente.
- **Momento adequado**: antes do segundo cliente real / antes de expandir
  a equipe atual significativamente.

### Risco 7 — Migrações aplicadas manualmente, sem CI

- **Descrição**: toda migração é copiada e colada manualmente no SQL
  Editor. Não há Supabase CLI conectada nem pipeline de CI.
- **Impacto**: Médio hoje (um ambiente); torna-se alto quando existir
  produção separada — dois ambientes que divergem por uma migração
  esquecida é um bug de produção caro de diagnosticar.
- **Probabilidade**: Alta de acontecer eventualmente, dado processo manual.
- **Prioridade**: Média agora, alta assim que produção existir.
- **Recomendação**: configurar Supabase CLI + pipeline que aplica
  migrações pendentes automaticamente a partir de `supabase/migrations/`
  em ambos os ambientes.
- **Momento adequado**: antes de criar o projeto Supabase de produção.

### Risco 8 — Único ambiente Supabase (sem produção separada)

- **Descrição**: só existe o projeto de desenvolvimento; 190 clientes
  reais e ~2,9 mil documentos reais vivem no mesmo projeto que qualquer
  migração experimental também toca.
- **Impacto**: Alto — erro de migração ou script de manutenção afeta dado
  real diretamente, sem ambiente de proteção.
- **Probabilidade**: Média — natural em desenvolvimento ativo contínuo.
- **Prioridade**: Alta.
- **Recomendação**: criar o projeto de produção antes da virada de
  domínio planejada.
- **Momento adequado**: antes da próxima fase de uso real ampliado.

### Risco 9 — Nenhum teste automatizado além de pgTAP

- **Descrição**: cobertura de teste é 100% pgTAP (RLS/banco); nenhuma
  suite de teste de TypeScript (unitário ou end-to-end).
- **Impacto**: Médio — lógica de aplicação que não depende do banco
  (cálculo de projeção, parsing, formatação) cresce sem rede de segurança.
- **Probabilidade**: Média — regressão nessas áreas só aparece em uso
  real hoje.
- **Prioridade**: Média.
- **Recomendação**: introduzir Vitest para funções puras quando a lógica
  de aplicação começar a concentrar bugs recorrentes — não antes disso.
- **Momento adequado**: conforme a necessidade aparecer, não antecipado.

### Risco 10 — shadcn/ui mandatado mas não adotado

- **Descrição**: stack obrigatória inclui shadcn/ui; código atual é 100%
  Tailwind puro.
- **Impacto**: Baixo técnico, médio de manutenção a longo prazo — quanto
  mais tempo passa, mais componentes acumulam no padrão antigo.
- **Probabilidade**: Certa de continuar se não houver disciplina de
  adoção incremental.
- **Prioridade**: Baixa (não bloqueia nada hoje).
- **Recomendação**: adoção incremental já documentada em
  [06](./06-component-architecture.md) — toda tela nova usa shadcn desde
  já.
- **Momento adequado**: já em andamento, contínuo.

### Risco 11 — Vendor lock-in: chamadas Supabase espalhadas pela aplicação

- **Descrição**: `createClient()`/supabase-js é chamado diretamente em
  mais de 40 arquivos de domínio, sem uma camada de abstração
  (`services/`, ver [02](./02-software-architecture.md)).
- **Impacto**: Médio — não impede operar hoje; encarece uma futura troca
  de provedor (Storage para S3/R2, Auth para outro serviço) proporcional
  ao número de arquivos que tocam a API diretamente.
- **Probabilidade**: Depende de decisão de negócio futura (não é uma
  falha, é uma opção que pode ou não ser exercida).
- **Prioridade**: Média.
- **Recomendação**: adoção incremental da camada `services/` a partir de
  código novo — mesmo espírito do shadcn/ui, sem reescrita em bloco.
- **Momento adequado**: incremental, a partir de agora, sem prazo forçado.

### Risco 12 — Custo de Storage em escala

- **Descrição**: Supabase Storage tem preço por GB acima do incluso no
  plano; a partir de um certo volume agregado (muitas organizações,
  documentos grandes como PDFs de passaporte/vídeo), provedores dedicados
  de object storage (S3, R2) ficam mais baratos por GB.
- **Impacto**: Baixo hoje (2 GB reais, plano Pro inclui 100 GB); médio em
  escala com centenas de organizações.
- **Probabilidade**: Certa de se tornar relevante **se** o produto
  crescer como planejado — não é uma questão de "se", é "quando".
- **Prioridade**: Baixa agora.
- **Recomendação**: a camada `services/storage` (Risco 11) é o que torna
  essa troca viável sem reescrita quando o volume justificar — não agir
  antes disso.
- **Momento adequado**: só em escala, quando o custo mensal de Storage
  justificar a migração de provedor.

### Risco 13 — Disponibilidade e SLA (sem plano de failover)

- **Descrição**: não existe hoje um plano documentado de RTO/RPO, nem
  monitoramento de uptime ou página de status para clientes. A cadeia de
  dependência (Vercel → Supabase → Resend) não tem plano de contingência
  documentado para indisponibilidade de qualquer um dos três.
- **Impacto**: Médio hoje (uso interno, tolerância a uma indisponibilidade
  pontual é alta); torna-se alto assim que houver um cliente pagante
  externo com expectativa contratual de disponibilidade.
- **Probabilidade**: Baixa no curto prazo (os três provedores têm SLA
  próprio razoável), mas cresce com o número de dependências externas
  (Resend, futuro provedor de billing).
- **Prioridade**: Média.
- **Recomendação**: documentar RTO/RPO alvo e um runbook mínimo de
  indisponibilidade antes do primeiro cliente pagante externo à KMP.
- **Momento adequado**: antes do segundo cliente real (pagante).

### Risco 14 — Vercel Cron e limites de plano

- **Descrição**: a rotina diária de armazenamento depende de Vercel Cron;
  planos inferiores têm limites de frequência/quantidade mais restritos.
- **Impacto**: Baixo hoje (uma rotina só); médio se multi-tenant exigir
  mais granularidade de agendamento.
- **Probabilidade**: Baixa no curto prazo.
- **Prioridade**: Baixa.
- **Recomendação**: já documentada em [12](./12-future-scalability.md) —
  orquestrar por loop dentro de uma única execução em vez de múltiplos
  crons registrados.
- **Momento adequado**: antes de multi-tenant exigir mais de uma rotina
  agendada.

### Risco 15 — Resend sem domínio verificado

- **Descrição**: sem verificar o domínio da empresa no Resend, envio cai
  no sandbox (`onboarding@resend.dev`), que só entrega para o e-mail da
  própria conta Resend.
- **Impacto**: Alto para a funcionalidade específica (alertas não chegam à
  equipe real), baixo para o sistema como um todo.
- **Probabilidade**: Certa até ser configurado.
- **Prioridade**: Média.
- **Recomendação**: verificar o domínio antes de depender dos alertas
  automáticos em uso real.
- **Momento adequado**: agora.

### Risco 16 — Duas fontes de "documento aprovado"

- **Descrição**: documento vinculado a `checklist_item` reflete aprovação
  via `status` do item; documento sem vínculo usa `documents.status_revisao`,
  independente.
- **Impacto**: Baixo hoje; médio se um relatório/dashboard futuro somar
  "documentos aprovados" sem saber da distinção.
- **Probabilidade**: Média — é o tipo de detalhe fácil de esquecer numa
  feature nova de relatório.
- **Prioridade**: Baixa.
- **Recomendação**: já documentada em [04](./04-database-architecture.md)
  — qualquer agregação futura decide explicitamente qual fonte consultar
  quando `checklist_item_id` existe.
- **Momento adequado**: ao construir a próxima feature de relatório de
  aprovação.

### Risco 17 — Pooling de conexão em modo transação (serverless)

- **Descrição**: Server Actions rodam em funções serverless da Vercel —
  cada invocação é potencialmente uma conexão nova ao Postgres. Sem
  confirmar que o pooler do Supabase (Supavisor) está em modo *transaction*
  (não *session*), tráfego concorrente alto esgota conexões.
- **Impacto**: Alto se mal configurado em escala (aplicação inteira fica
  indisponível sob carga); nulo se já configurado corretamente.
- **Probabilidade**: Baixa no volume atual; sobe com tráfego concorrente.
- **Prioridade**: Média — vale confirmar agora que está correto, mesmo
  sem pressão de carga ainda.
- **Recomendação**: confirmar explicitamente o modo do pooler em uso no
  projeto de produção antes de operar com tráfego concorrente relevante.
- **Momento adequado**: confirmar agora; revisitar quando o tráfego
  crescer.

### Risco 18 — Crescimento de policies de RLS sem verificação automatizada em CI

- **Descrição**: ~25 tabelas, múltiplas policies cada, testadas via pgTAP
  rodado manualmente (copiar/colar no SQL Editor). Não há verificação
  automática de que toda tabela nova tem RLS habilitada nem de que os
  testes existentes continuam passando a cada mudança.
- **Impacto**: Alto — é exatamente a categoria de bug mais perigosa deste
  projeto (RLS mal configurada), sem uma rede de segurança automatizada.
- **Probabilidade**: Sobe com o número de pessoas/IAs contribuindo sem
  disciplina manual perfeita.
- **Prioridade**: Média-alta.
- **Recomendação**: mesmo pipeline de CI do Risco 7 (migrações) pode
  rodar a suite pgTAP automaticamente a cada mudança em
  `supabase/migrations/` — natural de implementar junto.
- **Momento adequado**: junto com a solução do Risco 7, antes de produção.

### Risco 19 — Corte para multi-tenant com dado real em produção

- **Descrição**: quando a migração multi-tenant acontecer (documento 12),
  ela precisa rodar contra um banco que já tem 190+ clientes reais em
  produção, sem downtime aceitável para uma consultoria operando
  diariamente.
- **Impacto**: Alto no momento da migração — erro nessa migração específica
  afeta todo o dado real de uma empresa em operação.
- **Probabilidade**: Não aplicável hoje — só se materializa no momento da
  migração.
- **Prioridade**: Não priorizável agora — é um risco a **planejar com
  antecedência**, não a resolver hoje.
- **Recomendação**: quando o gatilho de multi-tenant (segundo cliente
  real) se aproximar, planejar a migração como uma operação em etapas
  (adicionar coluna nullable → popular → tornar not null → só então
  ativar policy nova), nunca como uma migração única e irreversível.
- **Momento adequado**: planejar quando o segundo cliente real estiver
  próximo de fechar contrato — não antes.

## Riscos considerados e descartados (não reabrir sem novo motivo)

- **Trocar Supabase por backend próprio**: descartado — o ganho de
  controle não compensa o custo de reconstruir Auth/Storage/RLS que já
  funcionam. Mitigado, não eliminado, pela camada `services/` (Risco 11).
- **Multi-tenant agora, antes de um segundo cliente real**: descartado —
  risco de modelar errado sem caso de uso concreto supera o benefício de
  "já vir pronto" (ver [12](./12-future-scalability.md)).
- **Reescrever toda a UI para shadcn/ui de uma vez**: descartado — parar
  a esteira de entregas por uma reescrita puramente visual não se
  justifica frente à adoção incremental.
- **Reescrever toda a camada de dados para `services/` de uma vez**:
  descartado pelo mesmo motivo do item acima — adoção incremental a
  partir de código novo.
