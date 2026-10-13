# KMP Hub — ImmiAccount Autofill

Extensão de navegador (Chrome/Edge) que preenche sozinho o código de
autenticação do ImmiAccount, buscando no Gmail conectado ao KMP Hub.

## Como instalar (modo desenvolvedor — ainda não publicada na loja)

1. Baixe/clone esta pasta `browser-extension/` no seu computador.
2. No Chrome, acesse `chrome://extensions`.
3. Ative **"Modo do desenvolvedor"** (canto superior direito).
4. Clique em **"Carregar sem compactação"** e selecione esta pasta
   (`browser-extension/`).
5. O ícone "K" laranja aparece na barra de extensões.

## Como configurar

1. No KMP Hub, vá em **Configurações → Integrações** (precisa ter
   conectado sua conta Google primeiro).
2. No card "Extensão ImmiAccount", clique em **"Gerar token"** e copie o
   token mostrado (só aparece uma vez).
3. Clique no ícone da extensão no navegador, cole o token, clique em
   **"Salvar"**.

## Como usar

Nada a clicar — abra a tela de login do ImmiAccount normalmente. Quando
chegar na etapa "Email authentication" (campo do código), a extensão
busca o código mais recente no seu Gmail sozinha e preenche + envia. Um
aviso pequeno aparece no canto da tela mostrando o progresso.

Se não achar um código recente (até 10 minutos), mostra um aviso pra você
digitar manualmente — nunca trava a tela nem impede o uso normal.

## Revogar acesso

Em Configurações → Integrações, clique em **"Revogar"** no card da
extensão — qualquer token salvo em qualquer computador para de funcionar
imediatamente.

## Preenchimento do formulário de visto (Subclass 600 — em construção)

A primeira metade do pedido (login automático) já funciona. Esta segunda
parte reaproveita o sistema de "Formulários de coleta de dados" que já
existe no Hub (o cliente preenche no portal, em etapas) — a extensão só
copia o que ele já respondeu para os campos do ImmiAccount. **Nunca
envia a aplicação sozinha** — só preenche, a Keila revisa e clica em
enviar manualmente.

### Como usar (visto)

1. No popup da extensão, na seção "Preenchimento do visto (Subclass 600)",
   busque o cliente pelo nome e clique em "Usar" — carrega os dados que
   ele já preencheu no formulário do portal (mesma regra de permissão do
   Hub: cada consultor só vê os processos dele, salvo
   admin/diretor/financeiro; só aparecem processos com o formulário já
   preenchido pelo cliente).
2. Abra a aplicação do Visitor Visa (600) no ImmiAccount normalmente
   (`online.immi.gov.au/elp/app...`). Em cada página com campos
   conhecidos, a extensão preenche sozinha e mostra um aviso no canto
   com quantos campos preencheu.
3. **Confira os campos preenchidos antes de clicar "Next"** — a
   extensão nunca clica em Previous/Next/Save/Submit, só preenche.

### Status do mapeamento de campos

Os campos do ImmiAccount usam `id`/`name` gerados de novo a cada sessão
— a extensão acha cada campo pelo **texto da label em inglês**
(`browser-extension/visa-autofill.js`, `FIELD_MAP`), que é estável.
Cobertura atual: página 2/20 (Application context — localização
atual), página 3/20 (Applicant — nome/sexo/nascimento/passaporte),
página 4/20 (Critical data confirmation — só o e-mail é editável, o
resto é conferência somente-leitura dos dados da página anterior) e
página 5/20 (Travelling companions — se tem acompanhante na viagem).
Página 1 (Terms and Conditions) não precisa de mapeamento, é só o
aceite dos termos, deixado manual de propósito — e a pergunta "Is the
above information correct?" da página 4 também fica sempre manual de
propósito, por ser a confirmação da própria Keila. Página 20/20
(Declarations, última página numerada) também fica sempre manual de
propósito: são nove declarações/consentimentos legais ("Have read and
understood...", "Give consent to the collection of their fingerprints
and facial image...", "Agree to leave Australia on or before the
expiry..." etc.) sem campo correspondente no formulário de coleta de
dados do Hub — não é dado do cliente pra copiar, é atestação que a
própria Keila/o cliente precisa conferir e marcar conscientemente
antes de enviar.

Depois da página 20 vêm mais duas telas, sem numeração própria: uma
**Review Page** (resumo de tudo que foi preenchido, todos os campos
somente-leitura — não há nada pra autopreencher, é só conferência) e
uma página de **Attach documents** (anexar arquivos — upload de
arquivo não é um campo de texto/rádio, e escolher automaticamente
qual documento do Hub corresponde a qual tipo exigido pelo
ImmiAccount seria uma funcionalidade bem maior, fora de escopo deste
preenchimento). As demais páginas do meio (trabalho/finanças,
histórico, saúde/caráter etc., página 6/20 a 19/20) ainda não foram
mapeadas — precisam do `outerHTML` de cada uma (mesmo processo usado
pra mapear as anteriores) antes de a extensão preencher algo nelas.
