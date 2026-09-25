# Especificação Técnica: Prazo de 28 Dias e Lembretes Automáticos

Projeto: KMP Hub (Next.js App Router + Supabase). Depende do painel de vencimento de vistos já implementado (`/vencimentos`) — reaproveita o padrão visual e de urgência por cor.

## 1. Objetivo

Rastrear pedidos do Department of Home Affairs que abrem uma janela de 28 dias para resposta (exame médico, pedido de informação adicional, etc), cobrar automaticamente do estudante o documento necessário dentro do prazo, e alertar Keila quando o prazo estiver perto de vencer sem resposta, incluindo apoio para pedidos de extensão relacionados a skills assessment demorado.

## 2. Contexto de negócio

- Ao lodgear um visto, o Department costuma enviar automaticamente, pouco depois, um Request for Health Examinations (HAP ID / eMedical), pedindo que o exame médico seja agendado.
- A partir da data desse request, o requerente tem até 28 dias para anexar prova de agendamento do exame na aplicação.
- O mesmo padrão de janela de 28 dias se aplica a qualquer outro pedido de informação do Department, não só exame médico.
- Em processos que dependem de skills assessment ainda pendente, a aprovação pode demorar de um a três meses, ultrapassando os 28 dias. Nesses casos Keila precisa enviar uma carta ao Department pedindo mais tempo antes do prazo vencer.

## 3. Schema implementado

`public.case_deadlines` (`supabase/migrations/20260901140000_case_deadlines.sql`):

- `id`, `case_id` (referência ao processo — não ao cliente diretamente, porque o pedido é sobre uma aplicação específica)
- `tipo_pedido`: `exame_medico` | `informacao_adicional` | `skills_assessment_pendente` | `outro`
- `data_pedido`, `prazo_final` (= `data_pedido` + 28 dias por padrão, editável manualmente)
- `status`: `aguardando_documento` | `documento_recebido` | `extensao_solicitada` | `concluido` | `cancelado`
- `documento_recebido_em`, `notas`

`public.case_deadline_reminders` — histórico de envio (auditoria, seção 7).

## 4. Regras de negócio

- `prazo_final` = `data_pedido` + 28 dias corridos, editável manualmente.
- Enquanto `status = aguardando_documento`: lembretes nos marcos 14/7/3/1 dias antes do prazo. Ao virar `documento_recebido`, lembretes futuros param.
- Alerta vermelho no painel quando faltam ≤7 dias e `status = aguardando_documento`.
- `skills_assessment_pendente` com ≤10 dias sem confirmação: alerta específico para preparar carta de extensão (a carta continua sendo redigida por Keila, não gerada automaticamente).
- Cada novo request do Department vira uma linha nova em `case_deadlines` — nunca substitui a anterior.
- Keila pode marcar manualmente como `concluido`/`cancelado` a qualquer momento, mesmo sem o documento ter chegado.

## 5. Decisões tomadas com a Keila (2026-09-01)

1. **Motor de e-mail**: Resend, não Gmail API. O Hub já tem Resend rodando em produção para os alertas de armazenamento (`lib/storage-admin/email.ts` + `app/api/cron/storage-check/route.ts`) — reaproveitado em vez de configurar OAuth novo com a conta Gmail.
2. **Piloto automático**: começa em **modo revisão manual**. O painel mostra quem receberia lembrete hoje e o texto pronto (`/vencimentos/prazos`); um admin/diretor clica em "Enviar" por item. O envio 100% automático (cron diário sem revisão) fica para depois que esse modo rodar por um tempo real.
3. **Marcar "documento recebido"**: manual por enquanto, pela tela de prazos — automatizar isso depende do controle de documentos linkar upload a um prazo específico, que ainda não existe.

## 6. Textos dos lembretes

Implementados em `lib/case-deadlines/email-templates.ts`, com as variáveis `{nome_estudante}`, `{tipo_documento}`, `{data_limite}`, `{dias_restantes}` substituídas pelo sistema. Texto idêntico ao aprovado pela Keila (14/7/3/1 dias antes, tom crescente de urgência).

## 7. Caminho para automação total (próxima etapa, não construída ainda)

Quando o modo manual estiver validado: um `app/api/cron/case-deadlines/route.ts` (mesmo padrão de `storage-check`, protegido por `CRON_SECRET`, registrado em `vercel.json`) chamaria a mesma lógica de `sendReminderNow` para cada item de `getDueReminders()`, sem esperar clique. Nenhuma mudança de schema necessária para essa virada — só a rota nova + entrada no cron.
