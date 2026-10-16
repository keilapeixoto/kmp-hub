import test from "node:test";
import assert from "node:assert/strict";
import { preencherVariaveis, textoParaHtml } from "../../lib/email/variaveis.ts";
import { htmlDaAssinatura } from "../../lib/email/assinatura.ts";
import { montarMensagem } from "../../lib/email/mime.ts";

const vars = {
  nome_cliente: "Maria da Silva",
  primeiro_nome: "Maria",
  visto: "Subclass 500",
  etapa: "Lodgement",
  prazo: "20/11/2026",
  consultor: "Keila Peixoto",
  link_portal: "https://portal.exemplo/portal",
};

test("preencherVariaveis: troca as variáveis conhecidas e mantém as desconhecidas", () => {
  const t = "Olá {{primeiro_nome}}, seu {{visto}} está em {{etapa}} até {{prazo}}. {{outra}}";
  assert.equal(
    preencherVariaveis(t, vars),
    "Olá Maria, seu Subclass 500 está em Lodgement até 20/11/2026. {{outra}}",
  );
});

test("preencherVariaveis: aceita espaços e o nome antigo {{nome_estudante}}", () => {
  assert.equal(preencherVariaveis("{{ nome_cliente }} / {{nome_estudante}}", vars), "Maria da Silva / Maria da Silva");
});

test("preencherVariaveis: variável sem valor vira vazio, não fica {{...}}", () => {
  assert.equal(preencherVariaveis("Prazo: {{prazo}}.", { ...vars, prazo: "" }), "Prazo: .");
});

test("textoParaHtml: escapa HTML e respeita parágrafos e quebras", () => {
  assert.equal(
    textoParaHtml("Olá <b>Maria</b>\nlinha 2\n\nNovo parágrafo & fim"),
    "<p>Olá &lt;b&gt;Maria&lt;/b&gt;<br>linha 2</p><p>Novo parágrafo &amp; fim</p>",
  );
});

test("htmlDaAssinatura: imagem, fecho e links clicáveis", () => {
  const html = htmlDaAssinatura({
    url: "https://cdn/x.png",
    fecho: "Atenciosamente,",
    whatsapp: "+61 451 051 806",
    instagram: "@keilamayara",
    nome: "Keila",
  });
  assert.match(html, /<p[^>]*>Atenciosamente,<\/p>/);
  assert.match(html, /<img src="https:\/\/cdn\/x.png" alt="Keila"/);
  assert.match(html, /href="https:\/\/wa.me\/61451051806"/);
  assert.match(html, /href="https:\/\/instagram.com\/keilamayara"/);
});

test("htmlDaAssinatura: sem nada configurado devolve vazio; só aceita imagem https", () => {
  assert.equal(htmlDaAssinatura({ url: null, fecho: null, whatsapp: null, instagram: null, nome: "X" }), "");
  assert.doesNotMatch(
    htmlDaAssinatura({ url: "javascript:alert(1)", fecho: null, whatsapp: null, instagram: null, nome: "X" }),
    /<img/,
  );
});

test("montarMensagem: sem anexo é text/html simples", () => {
  const m = montarMensagem({ to: "a@b.com", subject: "Olá", html: "<p>oi</p>", anexos: [] });
  assert.match(m, /^To: a@b\.com\r\n/);
  assert.match(m, /Content-Type: text\/html; charset=UTF-8/);
  assert.doesNotMatch(m, /multipart\/mixed/);
});

test("montarMensagem: com anexo vira multipart/mixed com o arquivo em base64", () => {
  const m = montarMensagem({
    to: "a@b.com",
    subject: "Documentos",
    html: "<p>segue</p>",
    anexos: [{ nome: "Contrato São Paulo.pdf", contentType: "application/pdf", conteudo: Buffer.from("PDF!") }],
  });
  const boundary = m.match(/boundary="([^"]+)"/)[1];
  assert.match(m, /Content-Type: multipart\/mixed/);
  assert.equal(m.split(`--${boundary}`).length, 4); // início, html, anexo, fim
  assert.match(m, /filename\*=UTF-8''Contrato%20S%C3%A3o%20Paulo\.pdf/);
  assert.match(m, new RegExp(Buffer.from("PDF!").toString("base64")));
  assert.match(m, new RegExp(`--${boundary}--`));
});

test("montarMensagem: cabeçalho não aceita quebra de linha injetada", () => {
  const m = montarMensagem({ to: "a@b.com\r\nBcc: x@y.com", subject: "x\r\nBcc: z", html: "", anexos: [] });
  assert.doesNotMatch(m, /\r\nBcc:/);
});
