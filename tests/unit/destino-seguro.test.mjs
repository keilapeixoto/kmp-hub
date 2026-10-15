import test from "node:test";
import assert from "node:assert/strict";
import { destinoSeguro, tipoDoLink } from "../../lib/auth/link.ts";

test("só aceita caminho interno (evita mandar o usuário para outro site)", () => {
  assert.equal(destinoSeguro("/portal"), "/portal");
  assert.equal(destinoSeguro("/portal/formulario?processo=1"), "/portal/formulario?processo=1");
  assert.equal(destinoSeguro("https://outro.site"), "/portal");
  assert.equal(destinoSeguro("//outro.site"), "/portal");
  assert.equal(destinoSeguro(null), "/portal");
});

test("tipos de link aceitos", () => {
  assert.equal(tipoDoLink("email"), "email");
  assert.equal(tipoDoLink("invite"), "invite");
  assert.equal(tipoDoLink("magiclink"), "magiclink");
  assert.equal(tipoDoLink("qualquer"), null);
  assert.equal(tipoDoLink(null), null);
});
