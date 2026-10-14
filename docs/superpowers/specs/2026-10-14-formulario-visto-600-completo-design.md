# Formulário do visto 600 — do cliente ao ImmiAccount (desenho)

Data: 14/10/2026. Estado: **aguardando revisão da Keila**. Nada deste documento foi implementado.

## 1. Objetivo

Um fluxo que funcione de ponta a ponta, sem surpresas:

1. O cliente novo recebe o convite, entra no portal (login por link mágico) e preenche o
   **Formulário Visto de Turista (Subclass 600) — Coleta de Dados**.
2. A equipe vê o que foi enviado, corrige se precisar e é avisada.
3. A extensão carrega o cliente e preenche as páginas do ImmiAccount que têm resposta
   direta; o que é declaração ao governo fica para a Keila marcar.

Para clientes antigos, o caminho que já existe continua: importar o PDF "Record of Responses".

## 2. Critérios de sucesso

- Um cliente de teste preenche o formulário pelo portal **sem ficar preso** em nenhuma etapa.
- Passar as 20 páginas do ImmiAccount com esse cliente e a Patricia, sem campo obrigatório
  do ImmiAccount que o formulário não coleta e que a extensão poderia preencher.
- A Keila corrige uma resposta direto no Hub, sem abrir o link do portal.
- A equipe recebe aviso por e-mail quando o cliente envia.
- Nenhuma resposta existente (ficha da Patricia) é perdida em nenhuma mudança.

## 3. Já decidido com a Keila

- Acesso **pelo portal, com login** (não haverá link aberto/formulário público; isso é Fase 2).
- Só o visto 600 por enquanto.
- O PDF de aplicação anterior **não é guardado**; só as respostas.
- Declarações de caráter e saúde: a extensão **nunca marca "Yes"**; só "No" quando o cliente
  respondeu "Não" no Hub. Declarações finais (página 20) ficam sempre manuais.

## 4. Escopo, em ordem

### A. Cobertura completa (primeiro)

Montar a tabela página × campo do ImmiAccount × campo do Hub × extensão e fechar as lacunas.

Resultado preliminar (páginas já com estrutura salva em `import/immi-pages/`):

| Página | O que a extensão não preenche | Ação proposta |
|---|---|---|
| 2 Application context | só "está fora da Austrália?" (1 de 6 obrigatórios visíveis) | **ver abaixo** |
| 3 Applicant | 4 respostas diretas + 5 perguntas novas (ver abaixo) | **ver abaixo** |
| 6 Contact details | só "Office" | manual, de propósito |
| 7 Authorised recipient | tudo (dados da KMP) | manual, de propósito |
| 8 Família que não viaja | a pergunta | decidir (ver §7) |
| 9 Entry to Australia | "estudo na Austrália", "visitará parentes/amigos" | **perguntar no formulário** (§7) |
| 11 Emprego | curso, datas | manual; datas só para estudante/aposentado |
| 16 Saúde | 7 perguntas | decidir (§7) |
| 17 Caráter | 14 perguntas além das 3 mapeadas | decidir (§7) |
| 18 Histórico de vistos | "já teve visto" | **perguntar no formulário** |
| 20 Declarações | todas | manual, sempre |

**Página 2 (estrutura recebida), o que falta e proposta:**

- *Current location* (país onde o cliente está): preencher com o **país de residência** que o Hub já tem.
- *Legal status* (Citizen, Visitor...): o Hub não pergunta. Proposta: perguntar no formulário
  ("Qual sua situação legal no país onde mora?") em vez de deduzir.
- *Stream*: o formulário do Hub é só de turista, então é sempre "Tourist stream" — a extensão marca sozinha.
- *Motivo da visita* (lista: Business, Tourism, Family visit, Study, Religious event, Other): converter o
  "Motivo da viagem" que o Hub já tem (Turismo → Tourism, Visitar família/amigos → Family visit, Negócios →
  Business, Estudo → Study, Tratamento médico/Outro → Other).
- *Datas importantes em que precisa estar na Austrália* (texto, obrigatório): o Hub não pergunta.
  Proposta: acrescentar a pergunta ao formulário.
- *Aplicação em grupo?* e *representante de governo?*: respostas quase sempre "No" para turista. Proposta:
  a extensão marca "No" só em "representante de governo" (constante para este formulário); "grupo" fica
  manual, porque família aplicando junto é grupo.

**Página 3 (estrutura recebida), o que falta e proposta:**

Já cobertos (11): nome, passaporte (país, número, datas, local), sexo, nascimento (cidade, estado, país),
estado civil, "outra nacionalidade". O que ainda falta, com resposta direta que o Hub **já tem**:

- *Já viajou à Austrália?* e *Já pediu visto para a Austrália?* ← "Já visitou a Austrália antes?" e
  "Já solicitou visto para a Austrália antes?" (Sim/Não): mapear.
- *Tem outro passaporte ou documento de viagem?* ← "Possui, ou já possuiu, outro passaporte?": só marcar "No".
- *Titular do Pacific-Australia Card?* → "No" constante (cartão de líderes do Pacífico; não se aplica ao formulário).

Sem resposta no Hub hoje (**perguntas novas propostas**, todas Sim/Não ou texto curto):

- *Já teve outros nomes?* (hoje só há um texto opcional; deduzir "No" de um campo vazio não é seguro).
- *Número de visto australiano anterior, se tiver* (a página pergunta se tem e o número).
- *Possui carteira de identidade nacional?* (Brasil: confirmar o que a Keila costuma marcar).
- *Fez exame de saúde para visto australiano nos últimos 12 meses?* (entra com o grupo de saúde, §7.1).
- *"É cidadão do país do passaporte?"*: quase sempre "Yes"; proposta **não deduzir**, perguntar.

**Páginas 4 e 5 (estrutura recebida): nada novo a coletar.**

- *4 Critical data confirmation*: tela só de conferência (nome, nascimento, passaporte em texto de leitura).
  O único campo é "A informação acima está correta?", que já vem marcado "Yes" e a extensão deixa de propósito
  para a Keila confirmar. O "Email address" fica escondido nesta aplicação.
- *5 Travelling companions*: uma pergunta visível ("há outras pessoas viajando com o candidato?"), que a
  extensão já preenche. As perguntas sobre pai/mãe/responsável só aparecem para menores de 18.

**Pendente:** só as páginas que aparecem conforme as respostas (**10, 13, 14, 15, 19**); salvar a estrutura
quando alguma delas surgir numa aplicação.
exigem; a 3 já falhou por formato de data e estado de nascimento), e 10, 13, 14, 15, 19, que só
aparecem em alguns casos.

Mudanças no formulário entram por **script incremental** (como `scripts/add-visa-600-fields.mjs`):
só insere/ajusta; nunca recria o modelo (recriar apaga respostas).

### B. Cliente sem travar

- "Próximo" sempre salva e avança; "Anterior" idem.
- Campos obrigatórios só são exigidos no **Enviar formulário**; se faltar algo, a página
  mostra a lista (etapa + campo) e leva à primeira pendência.
- Retomar de onde parou (já é assim: respostas salvas por etapa).
- Obrigatório só o que o ImmiAccount exige; RG, CPF, nome do pai e da mãe passam a opcionais.
- Remove a repetição "Nacionalidade atual" (a extensão usa "Nacionalidade conforme passaporte").
- Textos de ajuda por etapa ("escreva como está no passaporte").
- Arquivos: `app/(portal)/portal/formulario/{page.tsx,actions.ts,_components/}`.

### C. Equipe com controle

- **Editar respostas no card** do processo (hoje é só leitura): `case-form-panel.tsx` + Server Action.
  Permissões já existem por RLS (admin, diretor, consultor do processo, equipe operations).
- **Aviso por e-mail** quando o cliente enviar (usa o Resend que já existe,
  `lib/storage-admin/email.ts`; sem integração nova).
- **Tela Início:** card "Formulários" com os aguardando o cliente e os enviados para revisar.
- Sem tabela nova prevista; se surgir, vem com teste de permissão por função (regra do projeto).

### D. Prova de ponta a ponta

- Cliente de teste novo (e-mail que a Keila abra) preenche pelo portal inteiro, e a extensão
  passa as páginas dele.
- Patricia com o PDF importado, passando as 20 páginas.
- Teste automatizado (Playwright) do fluxo do portal: preencher, avançar sem obrigatório,
  tentar enviar com pendência, enviar.

## 5. Fora de escopo

Link aberto/sem login, outros tipos de visto, pagamento, integrações novas, guardar o PDF.

## 6. Riscos

- O ImmiAccount muda campos sem aviso; por isso a extensão acha campos por texto da label e
  pára sem preencher se não identifica a página.
- Banco de desenvolvimento (Supabase Free) estoura tempo em gravações grandes; já tratado
  na importação com blocos de 8. Vale o mesmo cuidado na edição pela equipe.
- Dados de passaporte são sensíveis: nada vai para log ou URL; só RLS.
- O banco de produção do Supabase ainda não existe; o site publicado usa o de desenvolvimento.

## 7. Decisões que a Keila precisa tomar

1. **Saúde (página 16) e caráter (17):** perguntar essas declarações no formulário do cliente,
   para a extensão marcar "No" quando o cliente responder "Não"? (Recomendação: **sim para
   caráter e saúde**, com texto claro de que são declarações; a extensão continua nunca marcando
   "Yes".) Ou manter manual e só você pergunta ao cliente?
2. **Estudo na Austrália / visita a parentes e amigos (9) e "já teve visto" (18):** acrescentar
   essas perguntas ao formulário? (Recomendação: sim, são Sim/Não simples.)
3. **Família que não viaja (8):** acrescentar a pergunta? (Recomendação: sim.)
4. **Pai e mãe:** opcionais (recomendado) ou obrigatórios?
5. **Situação legal e datas importantes (página 2):** acrescentar essas duas perguntas ao formulário?
   (Recomendação: sim, sem elas a página 2 fica quase toda manual.)
6. **Página 3:** acrescentar as 5 perguntas novas (outros nomes, visto anterior, RG nacional, exame de
   saúde, cidadania do passaporte)? (Recomendação: sim, todas.)

## 8. Ordem de entrega

A (cobertura + perguntas) → B (cliente) → C (equipe) → D (prova). Cada parte termina com
verificação antes da próxima; nada vai para o portal oficial sem pedido da Keila.
