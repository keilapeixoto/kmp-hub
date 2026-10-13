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
