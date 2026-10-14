import test from "node:test";
import assert from "node:assert/strict";
import { semana, agruparPorDia, nomeRemetente, iniciais, quandoRecebido } from "../../lib/google/visual.ts";

const TZ = "Australia/Sydney";
// 14/out/2026 10:00 em Sydney (UTC+11) = 13/out 23:00 UTC
const agora = new Date("2026-10-13T23:00:00Z");

test("semana: 7 dias a partir de hoje, no fuso da KMP", () => {
  const s = semana(agora, TZ);
  assert.equal(s.length, 7);
  assert.equal(s[0].hoje, true);
  assert.equal(s[0].dia, 14);
  assert.equal(s[1].dia, 15);
});

test("agrupa eventos em hoje, amanhã e próximos dias", () => {
  const ev = (id, inicio) => ({ id, titulo: id, inicio, fim: inicio, diaInteiro: false, local: null, link: null });
  const g = agruparPorDia(
    [ev("a", "2026-10-14T09:00:00+11:00"), ev("b", "2026-10-15T08:00:00+11:00"), ev("c", "2026-10-18T10:00:00+11:00")],
    agora,
    TZ,
  );
  assert.deepEqual(g.hoje.map((e) => e.id), ["a"]);
  assert.deepEqual(g.amanha.map((e) => e.id), ["b"]);
  assert.deepEqual(g.depois.map((e) => e.id), ["c"]);
});

test("evento de dia inteiro conta no dia certo", () => {
  const g = agruparPorDia(
    [{ id: "x", titulo: "x", inicio: "2026-10-15", fim: "2026-10-16", diaInteiro: true, local: null, link: null }],
    agora,
    TZ,
  );
  assert.deepEqual(g.amanha.map((e) => e.id), ["x"]);
});

test("remetente: nome sem o e-mail, e iniciais", () => {
  assert.equal(nomeRemetente('"Renata Croaro" <renata@gmail.com>'), "Renata Croaro");
  assert.equal(nomeRemetente("noreply@homeaffairs.gov.au"), "noreply@homeaffairs.gov.au");
  assert.equal(iniciais("Renata Croaro"), "RC");
  assert.equal(iniciais("gemini-notes@google.com"), "G");
});

test("quando: hora se for hoje, dia e mês se for antes", () => {
  assert.equal(quandoRecebido("Wed, 14 Oct 2026 09:30:00 +1100", agora, TZ), "09:30");
  assert.equal(quandoRecebido("Mon, 12 Oct 2026 09:30:00 +1100", agora, TZ), "12 out");
});
