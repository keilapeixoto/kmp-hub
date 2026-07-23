# 8. Security Guide

Este é o documento mais importante da pasta. **A maior fonte de risco deste
projeto é RLS mal configurada** — não performance, não escolha de
framework. Toda tabela nova, sem exceção, segue este guia antes de qualquer
deploy.

## Por que este guia é rigoroso: a natureza do dado que o sistema guarda

O KMP Hub armazena, para clientes reais de consultorias de imigração e
educação, categorias de dado entre as mais sensíveis que um sistema pode
guardar: **passaportes, documentos pessoais de identidade, extratos e
documentos financeiros, documentos migratórios (histórico de vistos,
antecedentes), certificados acadêmicos, informações financeiras e
contratos.** Isso não é um CRM de vendas guardando nome e telefone — é um
sistema que, se comprometido, expõe exatamente o tipo de dado usado para
roubo de identidade e fraude migratória. Todo o resto deste documento parte
dessa premissa.

## Checklist de cobertura (mapa rápido — detalhe de cada item abaixo)

| Requisito | Coberto hoje? | Onde |
|---|---|---|
| Row Level Security | ✅ Sim, em toda tabela | Toda a seção "Autorização" abaixo |
| Buckets privados | ✅ Sim (`documents`) | Seção "Storage e documentos" |
| URLs temporárias | ✅ Sim (5 min) | Seção "Storage e documentos" |
| Controle de permissão por função | ✅ Sim, 7 funções via `get_user_role()` | Seção "Autorização" |
| Autenticação multifator | ⚠️ Planejada, **não obrigatória ainda** | Ver Risco correspondente em [13](./13-architectural-risks.md) |
| Auditoria de acesso e download | ⚠️ **Parcial** — CRUD de tabela é auditado; **download de arquivo não é** | Seção "Auditoria" — gap real, registrado como risco |
| Limites de upload | ✅ Sim, configurável por admin | Seção "Storage e documentos" |
| Validação de tipo de arquivo | ✅ Sim, lista branca configurável | Seção "Storage e documentos" |
| Proteção contra arquivo malicioso | ✅ Sim, lista negra fixa não configurável | Seção "Storage e documentos" |
| Backup de banco | ✅ Sim (Supabase, diário) | Seção "Backup e recuperação de desastre" |
| Backup independente do Storage | ❌ **Não existe** | Seção "Backup e recuperação de desastre" — risco crítico |
| Recuperação de desastre | ⚠️ Parcial (só banco) | Seção "Backup e recuperação de desastre" |
| Retenção e exclusão de dados | ⚠️ Soft delete existe; política formal de retenção **não documentada** | Seção "Retenção e exclusão de dados" |
| Resposta a incidentes | ❌ **Não existe processo documentado** | Seção "Resposta a incidentes" |
| Princípio do menor privilégio | ✅ Sim, por convenção de código | Seção "Princípio do menor privilégio" |
| Proteção de variáveis e segredos | ✅ Sim | Seção "Segredos e variáveis de ambiente" |

## Autenticação

- Supabase Auth, dois fluxos distintos:
  - **Equipe**: e-mail + senha. **MFA TOTP planejado, ainda não
    obrigatório** — dado o nível de sensibilidade dos documentos acessíveis
    por uma conta de equipe comprometida, este é o item de maior prioridade
    de segurança pendente do projeto (ver [13](./13-architectural-risks.md)).
  - **Cliente do portal**: magic link (PKCE), nunca senha — elimina a
    classe inteira de risco de senha fraca/reutilizada para o usuário final.
- Ambos os fluxos passam pelo mesmo Route Handler `app/auth/callback`, que
  troca o `code` PKCE por sessão. **Este endpoint precisa estar
  explicitamente isento do middleware de autenticação** — já foi esquecido
  uma vez neste projeto (bug real, corrigido) e é o erro mais fácil de
  reintroduzir ao mexer no middleware.
- A função do usuário nunca é lida do JWT/metadata diretamente por uma
  policy — sempre via `public.get_user_role()`, que consulta
  `profiles.role_id`. Isso centraliza a lógica em um único lugar auditável.

## Autorização — RLS é a única fonte de verdade

**A interface esconde; o banco impede.** Todo componente pode decidir não
mostrar um botão para quem não deveria vê-lo, mas isso é conveniência de UX,
não segurança — a garantia real é que a mesma ação, chamada direto via API
com o token daquele usuário, falha na RLS.

### Checklist obrigatório para tabela nova

1. `alter table … enable row level security;` **na mesma migração** que cria
   a tabela.
2. Uma policy por combinação de (função, operação) que precisa de acesso —
   nunca uma policy `using (true)` "temporária" com plano de restringir
   depois.
3. Se a tabela representa algo vinculado a um processo/cliente, a policy
   verifica a cadeia de posse via `exists (select 1 from … where …)`, não
   confia em uma coluna solta sem `join`.
4. Teste pgTAP cobrindo, no mínimo: admin enxerga/edita livremente; a
   função mais restrita não vê/edita dado de outro dono; se houver escrita
   de cliente, um teste explícito de que ele não escala a própria
   permissão.
5. Rodar o teste manualmente e confirmar passagem **antes** de aplicar a
   migração em qualquer ambiente compartilhado.

### Vazamento sutil que já aconteceu neste projeto (não repita)

`documents.checklist_item_id` e `case_form_responses.field_id` são FKs para
outra tabela — mas a RLS valida posse por `client_id`/`case_id`, não por
essas FKs. Nada impedia (antes da correção) um cliente inserir um registro
com `client_id` correto (o próprio) mas a FK secundária apontando para o
item de **outro** processo. Corrigido com trigger `before insert or update`
`security definer` que valida a cadeia completa. **Toda tabela nova com
mais de uma FK relacionada precisa desta mesma verificação cruzada.**

## Princípio do menor privilégio

- Toda Server Action roda com o cliente da **sessão do usuário** por
  padrão — o cliente com a chave secreta (`lib/supabase/admin.ts`, que
  ignora RLS) só é usado nos casos documentados e restritos: convite de
  usuário (precisa de `auth.admin.inviteUserByEmail`, uma API que não
  existe no cliente de sessão), leitura de e-mail de `auth.users` (não
  exposto por RLS normal), e agregações administrativas que por definição
  precisam ver todos os dados (painel de armazenamento).
- **Toda ação que usa o cliente admin para escrever verifica a função do
  usuário antes de chamar o admin client** — o admin client não vai barrar
  sozinho por definição. Bug real já corrigido neste projeto:
  `acknowledgeAlert` (reconhecer um alerta de armazenamento) inicialmente
  gravava via cliente admin sem checar a RLS da sessão; corrigido para usar
  o cliente da sessão, deixando a RLS já existente proteger a operação em
  vez de duplicar a lógica em TypeScript.
- Nenhum usuário de equipe tem acesso amplo por padrão — cada função
  (`consultant`, `operations`, etc.) só vê o que a matriz de permissão do
  produto define, aplicada via RLS, nunca "admin por engano" por ausência
  de policy restritiva.

## Storage e documentos

- Bucket `documents` é **privado**; todo acesso é por URL assinada de curta
  duração (5 minutos), gerada na hora do clique — nunca uma URL pública
  armazenada em algum lugar.
- Caminho padronizado `client_id/case_id/arquivo` — as policies de
  `storage.objects` usam `storage.foldername(name)` para extrair o
  `client_id` do primeiro segmento e comparar contra a posse do usuário.
- Upload valida, nesta ordem: (1) lista negra fixa de extensões perigosas
  (nunca configurável pelo admin — barreira de segurança, não preferência),
  (2) lista branca configurável de formatos permitidos, (3) tamanho máximo,
  (4) hash SHA-256 para detectar duplicidade (aviso, exige confirmação
  explícita para enviar mesmo assim, nunca bloqueio silencioso).
- **Nunca excluir documento de verdade.** Soft delete
  (`documents.arquivado`) — só admin acessa arquivados.
- Bucket `avatars` é **público** por decisão consciente (foto de perfil não
  tem a sensibilidade de um passaporte) — mas ainda tem RLS de escrita.

## Auditoria

- `audit_logs`: trigger genérico aplicado a ~19 tabelas, grava
  insert/update/delete com autor e dado alterado. Visível **só para
  admin** (nem diretor).
- **Gap real, não coberto hoje**: o trigger de auditoria dispara em
  mutação de linha — ele **não** captura o download de um arquivo (gerar
  uma URL assinada e acessá-la não toca nenhuma tabela). Ou seja, hoje o
  sistema sabe *quem renomeou/arquivou* um documento, mas **não sabe quem
  baixou o passaporte de um cliente e quando**. Para dados desta
  sensibilidade, isso é uma lacuna de conformidade real, não cosmética —
  registrada como risco em [13](./13-architectural-risks.md) com
  recomendação de implementação (log explícito no Route Handler de
  download, numa tabela própria de acesso, não reaproveitando
  `audit_logs`, que é de mutação).
- **Nunca logar conteúdo de documento.** Logs de storage
  (`storage_audit_runs`) guardam só contagens e totais agregados. O cálculo
  de hash de duplicidade lê o conteúdo do arquivo uma vez em memória para
  gerar o SHA-256, mas o conteúdo nunca é persistido nem impresso — só o
  hash resultante.

## Backup e recuperação de desastre

- **Banco de dados**: backup diário automático do Supabase (plano Pro).
  Cobre schema e dado de tabela — inclui, portanto, todos os metadados de
  documento, processo, cliente.
- **Storage — sem backup independente hoje.** Este é o risco mais crítico
  do documento: se o bucket `documents` for corrompido ou apagado por
  erro humano/bug, o backup do banco recupera as referências
  (`documents.storage_path`) mas não os ~2 GB de arquivos reais —
  passaportes, extratos, formulários assinados de clientes reais, sem
  recurso de recuperação. Ver recomendação detalhada em
  [13 — Architectural Risks](./13-architectural-risks.md).
- **Recuperação de desastre**: hoje não existe um plano documentado de
  RTO/RPO (tempo/ponto de recuperação objetivo) nem um ambiente de
  produção separado do de desenvolvimento — ambos são gaps a fechar antes
  de operar em escala com múltiplos clientes reais (ver [13](./13-architectural-risks.md)).

## Retenção e exclusão de dados

- **Regra vigente**: nenhuma exclusão permanente de dado operacional — soft
  delete (`arquivado`) em documentos, processos, e a maioria das entidades
  de negócio. Exceção deliberada: remoção de usuário via
  `auth.admin.deleteUser`, que é uma ação administrativa explícita e
  irreversível por natureza da plataforma de autenticação.
- **O que falta**: uma política formal de **quanto tempo** um dado
  arquivado deve ser retido antes de exclusão definitiva (relevante para
  conformidade com regulação de privacidade — ver abaixo) e um mecanismo
  para uma empresa cliente **solicitar exclusão completa** de um titular de
  dado específico (direito de exclusão, comum em regimes de proteção de
  dados). Nenhum dos dois existe hoje — registrado como risco de
  privacidade/conformidade em [13](./13-architectural-risks.md).

## Resposta a incidentes

**Não existe hoje um processo documentado de resposta a incidentes**
(quem é notificado, em que prazo, como conter um vazamento, como comunicar
aos clientes afetados). Para um sistema guardando documento de identidade e
dado financeiro, isso deveria existir antes da primeira operação em escala
com um segundo cliente pagante — não é complexo de escrever (um runbook
curto: detectar → conter → avaliar escopo → notificar → corrigir → revisar),
mas precisa existir por escrito, não improvisado no momento do incidente.

## Segredos e variáveis de ambiente

- `SUPABASE_SECRET_KEY` só existe em código server-only — nunca
  `NEXT_PUBLIC_*`, nunca importada por um Client Component.
- Chaves de serviços externos (Resend, e futuramente billing) seguem o
  mesmo padrão: lidas de `process.env` em um único módulo isolado por
  serviço (ver [02](./02-software-architecture.md#portabilidade-e-vendor-lock-in-camada-de-services)),
  nunca hardcoded, nunca logadas.
- Variáveis de ambiente por ambiente (dev/produção) geridas na Vercel — a
  chave secreta de um ambiente nunca é reaproveitada em outro.

## Regras de negócio que são segurança disfarçada

- **Notas internas e riscos** (`cases.riscos`, etc.) ficam em
  colunas/policies que excluem incondicionalmente a função `client` — nunca
  aparecem no portal, mesmo que uma policy futura de "cliente vê o próprio
  processo" seja escrita de forma ampla demais. Ao adicionar um campo novo
  a uma tabela já visível ao cliente, **revise explicitamente** se aquele
  campo deveria estar numa tabela separada com RLS mais restrita — RLS do
  Postgres é por linha, não por coluna; uma policy de `select` que libera a
  linha libera **todas** as colunas para quem consulta direto.

## Antes de qualquer deploy — checklist final

1. RLS habilitada em toda tabela nova.
2. Teste pgTAP rodado e passando.
3. Nenhuma chave secreta em código client-side.
4. Nenhuma URL pública apontando para dado de cliente.
5. Nenhuma exclusão permanente de dado operacional introduzida sem essa ser
   exatamente a intenção documentada da feature.
6. Se a feature toca em armazenamento de arquivo: formatos perigosos
   continuam bloqueados independente de qualquer configuração de admin.
7. Se a feature toca em dado sensível novo (documento, financeiro,
   identidade): confirmar que ele não vaza para a função `client` nem para
   organizações que não são a dona, e que uma auditoria mínima (quem
   criou/alterou) está presente.
