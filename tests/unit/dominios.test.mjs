import test from "node:test";
import assert from "node:assert/strict";
import { redirecionarPortal } from "../../lib/dominios.ts";

const P = "clientportal.kmpconsulting.com.au";

test("no clientportal, a raiz e as telas da equipe vão para o portal", () => {
  assert.equal(redirecionarPortal(P, "/"), "/portal");
  assert.equal(redirecionarPortal(P, "/inicio"), "/portal");
  assert.equal(redirecionarPortal(P, "/login"), "/portal/login");
});

test("no clientportal, portal, login por link e arquivos passam direto", () => {
  for (const caminho of ["/portal", "/portal/formulario", "/auth/callback", "/api/x", "/_next/static/a.css", "/kmp-logo-mark.svg"]) {
    assert.equal(redirecionarPortal(P, caminho), null, caminho);
  }
});

test("em outros endereços nada muda", () => {
  assert.equal(redirecionarPortal("crmportal.kmpconsulting.com.au", "/inicio"), null);
  assert.equal(redirecionarPortal("localhost:3000", "/"), null);
  assert.equal(redirecionarPortal(null, "/"), null);
});
