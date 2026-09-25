# Especificação: Controle de Documentos (Upload, Detecção e Renomeação Automática)

Especificação original da Keila + decisões tomadas ao construir (KMP Hub, sem
automação de código nem sistema paralelo de checklist — ver seção "Decisões").

## 1. Objetivo

Arrastar um arquivo pro caso do cliente e o Hub identificar sozinho que tipo
de documento é, renomear de forma padronizada, e marcar o item correspondente
do checklist do caso como recebido. Conecta com o painel de prazos de 28 dias
(`docs/spec-prazo-28-dias.md`): documento recebido pode fechar automaticamente
o prazo correspondente.

## 2. Decisões tomadas (divergem da spec original)

- **Sem tabelas novas.** `checklists`/`checklist_items` e `documents`/
  `document_versions` já existiam (Sprint 5), mais completos que a spec
  presumia (10 status, percentual automático, subtarefas, versionamento,
  bucket privado, soft delete). As tabelas `case_checklist_items`/
  `case_documents` propostas na spec teriam duplicado isso — a implementação
  estende `documents` com 4 colunas novas em vez disso.
- **Sem "Montador de Aplicações".** Não existe esse módulo neste repositório
  (pode existir em outro projeto da Keila, ex. `kmp-forms`) — a lista de
  "tipos esperados por subclasse" vem diretamente dos `checklist_items` já
  instanciados no caso (a mesma fonte que a spec queria reaproveitar, só que
  lida direto do checklist real do processo, não de uma config separada).
- **"Renomear o arquivo" = `documents.nome`.** O arquivo em si no Storage
  mantém o `storage_path` com timestamp (padrão já existente); só o nome
  exibido/editável (`documents.nome`, já existia antes desta feature) recebe
  o padrão `sobrenome-tipo_documento-ano_mes_dia.ext`. Evita mover objetos no
  Storage.
- **Fechamento automático do prazo de 28 dias**: só para `exame_medico` e
  `skills_assessment` (mapeamento em
  `lib/documents/constants.ts:DOCUMENT_TYPE_TO_DEADLINE_REQUEST_TYPE`) — são
  tipos específicos o bastante para casar com confiança. `informacao_adicional`
  é genérico demais (pode ser qualquer coisa que o Department pediu) — fica
  sempre manual.
- **Reenvio do mesmo tipo de documento**: em vez de perguntar
  substituir/manter (exigiria um modal interativo), o sistema sempre soma como
  documento adicional (nunca sobrescreve silenciosamente, como pedia a spec) e
  avisa no retorno quando o hash é idêntico a um já existente. Se Keila quiser
  o fluxo de escolha explícita depois, é uma frente separada.

## 3. Schema (migração `20260901160000_document_classification.sql`)

Estende `public.documents`:

- `nome_original text` — nome como a equipe enviou, antes da renomeação.
- `document_type text` — tipo classificado (ver `lib/documents/constants.ts`).
- `classification_confidence numeric(3,2)` — 0 a 1, null sem classificação automática.
- `revisao_classificacao_pendente boolean not null default false`.

Sem RLS nova — `documents` já é RLS por linha, cobre as colunas novas.

## 4. Fluxo

1. Arrastar (ou escolher) arquivo(s) na página do caso (`/processos/[id]`).
2. Upload no bucket privado `documents`, validado (formato/tamanho, mesma
   validação do controle de armazenamento existente).
3. Conteúdo enviado para a API da Anthropic (`claude-haiku-4-5`, fetch direto
   sem SDK — mesmo padrão de `lib/storage-admin/email.ts`), junto com os
   itens do checklist do caso ainda não aprovados.
4. **Confiança ≥ 75%** (`DOCUMENT_CLASSIFICATION_CONFIDENCE_THRESHOLD`):
   renomeia, vincula ao `checklist_item_id`, marca o item como `enviado`,
   fecha o prazo de 28 dias correspondente se houver.
5. **Confiança < 75%, ou falha na classificação**: documento salvo com
   `revisao_classificacao_pendente = true`, aparece no painel "Documentos
   aguardando confirmação de tipo" na página do caso para escolha manual.

## 5. Segurança

Bucket `documents` já era privado, acesso só por usuário autenticado + RLS,
visualização só por URL assinada de 5 minutos (`getSignedDocumentUrl`) —
nada novo aqui, a feature herda o que já existia.

## 6. Requer configuração da Keila

`ANTHROPIC_API_KEY` no Vercel (Production + Preview) — gerada em
console.anthropic.com, adicionada do mesmo jeito que `RESEND_API_KEY`. Sem
ela, todo upload cai automaticamente no modo "revisão pendente" (o arquivo não
se perde, só não classifica sozinho).

## 7. Possíveis próximos passos (não construídos nesta rodada)

- Fluxo interativo de "substituir ou manter os dois" no reenvio do mesmo tipo
  de documento.
- Vínculo direto (FK) entre `case_deadlines` e `checklist_items`, se a Keila
  quiser fechamento automático também para `informacao_adicional`.
