import test from "node:test";
import assert from "node:assert/strict";
import { mensagemErroLink } from "../../lib/portal/erro-link.ts";

test("limite de e-mails do Supabase vira aviso para esperar", () => {
  assert.match(mensagemErroLink({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" }), /muitos pedidos/i);
});
test("e-mail sem cadastro no portal", () => {
  assert.match(mensagemErroLink({ status: 422, code: "otp_disabled", message: "Signups not allowed for otp" }), /não tem acesso/i);
});
test("falha de envio do servidor de e-mail", () => {
  assert.match(mensagemErroLink({ status: 500, code: "unexpected_failure", message: "Error sending magic link email" }), /servidor de e-mail/i);
});
test("e-mail inválido", () => {
  assert.match(mensagemErroLink({ status: 400, code: "validation_failed", message: "Unable to validate email address: invalid format" }), /confira o e-mail/i);
});
