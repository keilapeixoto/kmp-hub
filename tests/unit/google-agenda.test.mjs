import test from "node:test";
import assert from "node:assert/strict";
import { podeCriarEventos, corpoDoEvento, juntarAgenda } from "../../lib/google/agenda-calc.ts";

test("podeCriarEventos: só com a permissão calendar.events (ou calendar completo)", () => {
  assert.equal(podeCriarEventos("openid email https://www.googleapis.com/auth/calendar.readonly"), false);
  assert.equal(podeCriarEventos("https://www.googleapis.com/auth/calendar.events email"), true);
  assert.equal(podeCriarEventos("https://www.googleapis.com/auth/calendar"), true);
  assert.equal(podeCriarEventos(null), false);
});

test("corpoDoEvento: horários em UTC, 1 h padrão sem fim, convidado só se pedir", () => {
  const sem = corpoDoEvento({
    titulo: "Consulta",
    inicio: "2026-10-20T00:00:00.000Z",
    fim: null,
    descricao: "Cliente: Maria",
    convidarEmail: null,
  });
  assert.deepEqual(sem.start, { dateTime: "2026-10-20T00:00:00.000Z" });
  assert.deepEqual(sem.end, { dateTime: "2026-10-20T01:00:00.000Z" });
  assert.equal(sem.summary, "Consulta");
  assert.equal(sem.attendees, undefined);

  const com = corpoDoEvento({
    titulo: "Consulta",
    inicio: "2026-10-20T00:00:00.000Z",
    fim: "2026-10-20T00:30:00.000Z",
    descricao: null,
    convidarEmail: "maria@exemplo.com",
  });
  assert.deepEqual(com.end, { dateTime: "2026-10-20T00:30:00.000Z" });
  assert.deepEqual(com.attendees, [{ email: "maria@exemplo.com" }]);
});

test("juntarAgenda: mistura Hub e Google por horário e esconde o evento já ligado a um compromisso", () => {
  const hub = [
    { id: "a1", inicio: "2026-10-20T03:00:00Z", google_event_id: "g1" },
    { id: "a2", inicio: "2026-10-20T01:00:00Z", google_event_id: null },
  ];
  const google = [
    { id: "g1", inicio: "2026-10-20T03:00:00Z" },
    { id: "g2", inicio: "2026-10-20T02:00:00Z" },
  ];
  const itens = juntarAgenda(hub, google);
  assert.deepEqual(
    itens.map((i) => `${i.origem}:${i.item.id}`),
    ["hub:a2", "google:g2", "hub:a1"],
  );
});
