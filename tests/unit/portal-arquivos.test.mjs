import test from "node:test";
import assert from "node:assert/strict";
import { problemaDoArquivo, caminhoNoBucket, caminhoDoProcesso, textoDeFormatos } from "../../lib/portal/arquivos.ts";

const regras = { extensoes: ["pdf", "jpg", "jpeg", "png"], maxBytes: 25 * 1024 * 1024 };

test("aceita formato permitido dentro do limite", () => {
  assert.equal(problemaDoArquivo({ nome: "Passaporte.PDF", tamanho: 1000 }, regras), null);
});

test("recusa sem extensão, perigoso, fora da lista, grande ou vazio", () => {
  assert.match(problemaDoArquivo({ nome: "arquivo", tamanho: 10 }, regras), /extensão/);
  assert.match(problemaDoArquivo({ nome: "x.exe", tamanho: 10 }, { ...regras, extensoes: ["exe"] }), /não é aceito/);
  assert.match(problemaDoArquivo({ nome: "x.zip", tamanho: 10 }, regras), /não é aceito/);
  assert.match(problemaDoArquivo({ nome: "x.pdf", tamanho: 26 * 1024 * 1024 }, regras), /25 MB/);
  assert.match(problemaDoArquivo({ nome: "x.pdf", tamanho: 0 }, regras), /vazio/);
});

test("caminho fica na pasta do processo e o servidor confere isso", () => {
  const c = caminhoNoBucket("cli", "caso", "meu passaporte (1).pdf", 123);
  assert.ok(c.startsWith("cli/caso/123-"));
  assert.ok(c.endsWith("-meu_passaporte__1_.pdf"));
  assert.ok(caminhoDoProcesso(c, "cli", "caso"));
  assert.ok(!caminhoDoProcesso("outro/caso/a.pdf", "cli", "caso"));
  assert.ok(!caminhoDoProcesso("cli/caso/sub/a.pdf", "cli", "caso"));
  assert.ok(!caminhoDoProcesso("cli/caso/../x/a.pdf", "cli", "caso"));
});

test("texto de formatos para o cliente", () => {
  assert.equal(textoDeFormatos(regras), "PDF, JPG, PNG · até 25 MB por arquivo · vários arquivos de uma vez");
});

test("nome do documento com o que o cliente escreveu", async () => {
  const { nomeComDescricao } = await import("../../lib/portal/arquivos.ts");
  assert.equal(nomeComDescricao("foto.jpg", "  Escritura da casa \n"), "Escritura da casa (foto.jpg)");
  assert.equal(nomeComDescricao("foto.jpg", null), "foto.jpg");
  assert.equal(nomeComDescricao("foto.jpg", "   "), "foto.jpg");
});
