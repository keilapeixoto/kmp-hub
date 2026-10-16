import test from "node:test";
import assert from "node:assert/strict";
import { ehEmailDoFormularioAntigo, lerEmailDoFormulario, mapEmailTo600 } from "../../lib/formulario-antigo/parse.ts";

// E-mail sintético (nenhum dado real), no formato do formulário antigo
// impresso pelo Gmail: rótulos quebrados em linhas, cabeçalho de página no meio.
const EMAIL = `17/10/2026, 09:12 Mail - Nova Solicitação de Visto Turista — Ana Souza
Nova solicitação de visto de turista
Data: 14/10/2026, 18:22:01
Nome completo (conforme passaporte): Ana Maria Souza
Você já mudou de nome (por exemplo, por casamento ou divórcio)?: SIM/YES
Gênero: Feminino/Female
Data de nascimento: 1960-04-03
Estado civil: Divorciado(a)/Divorced
Você possui outra nacionalidade ou cidadania?: NÃO/NO
Número do passaporte: FX123456
Documento nacional de identidade (RG e CPF): 12.345.678-9 · 123.456.789-09
Endereço residencial completo: Rua A, 10, Campinas, SP, 13000-000
Você tem filhos?: SIM/YES — João, 01/02/1985, não viaja
https://mail.google.com/mail/u/0/?ik=abc&view=pt
2/3
17/10/2026, 09:12 Mail - Nova Solicitação de Visto Turista — Ana Souza
Você tem algum familiar ou amigo na Austrália?: SIM/YES — Maria, filha, 1 George St
Motivo da viagem à Austrália: Visitar família/amigos / Visit family/friends
Tempo de permanência pretendido: 1 a 3 meses/1 to 3 months
Situação profissional atual: Aposentado(a)/Retired
Renda mensal aproximada (R$): R$ 3.001 a R$ 6.000
Você ou qualquer pessoa incluída nesta aplicação, já teve um pedido de visto recusado ou
cancelado em qualquer país?: NÃO/NO
Assinatura digital: Ana Maria Souza
Cópia do passaporte (página de dados): foto.jpg
Certidão de casamento: certidao.pdf
ATENÇÃO: os documentos anexados pelo cliente não puderam ser incluídos (erro: x)`;

test("reconhece o e-mail do formulário antigo", () => {
  assert.equal(ehEmailDoFormularioAntigo(EMAIL), true);
  assert.equal(ehEmailDoFormularioAntigo("Record of Responses"), false);
});

test("cabeçalho de página do Gmail não entra no valor", () => {
  const r = lerEmailDoFormulario(EMAIL);
  assert.equal(r["Você tem filhos?"], "SIM/YES — João, 01/02/1985, não viaja");
  assert.equal(
    r["Você ou qualquer pessoa incluída nesta aplicação, já teve um pedido de visto recusado ou cancelado em qualquer país?"],
    "NÃO/NO",
  );
});

test("converte nos campos do Hub", () => {
  const { campos, avisos } = mapEmailTo600(EMAIL);
  assert.equal(campos["Nome"], "Ana");
  assert.equal(campos["Sobrenome"], "Maria Souza");
  assert.equal(campos["Gênero"], "Feminino");
  assert.equal(campos["Estado civil"], "Divorciado(a)");
  assert.equal(campos["Data de nascimento"], "1960-04-03");
  assert.equal(campos["Possui, ou já possuiu, outra nacionalidade ou cidadania?"], "Não");
  assert.equal(campos["RG / Documento de identidade"], "12.345.678-9");
  assert.equal(campos["CPF"], "123.456.789-09");
  assert.equal(campos["CEP"], "13000-000");
  assert.equal(campos["Você tem filhos?"], "Sim");
  assert.equal(campos["Nome, data de nascimento e se viaja junto (cada filho)"], "João, 01/02/1985, não viaja");
  assert.equal(campos["Nome, relação e endereço na Austrália"], "Maria, filha, 1 George St");
  assert.equal(campos["Motivo da viagem à Austrália"], "Visitar família/amigos");
  assert.equal(campos["Tempo de permanência pretendido"], "1 a 3 meses");
  assert.equal(campos["Situação profissional atual"], "Aposentado(a)");
  assert.equal(campos["Renda mensal aproximada (BRL)"], "R$ 3.001 a R$ 6.000");
  assert.equal(campos["Já teve pedido de visto recusado ou cancelado em qualquer país?"], "Não");
  assert.equal(campos["Assinatura digital (nome completo)"], "Ana Maria Souza");
  assert.match(avisos.join(" "), /mudou de nome/);
  assert.match(avisos.join(" "), /anexou: passaporte, certidão de casamento/);
});
