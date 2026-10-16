import test from "node:test";
import assert from "node:assert/strict";
import {
  iniciais,
  prazoRelativo,
  indicadoresDoCliente,
  ordenarTarefas,
  haQuantoTempo,
} from "../../lib/clients/perfil-calc.ts";

test("haQuantoTempo: minutos, horas, ontem, dias e data", () => {
  const agora = new Date("2026-10-16T12:00:00Z");
  assert.equal(haQuantoTempo("2026-10-16T11:59:40Z", agora), "agora");
  assert.equal(haQuantoTempo("2026-10-16T11:55:00Z", agora), "há 5 min");
  assert.equal(haQuantoTempo("2026-10-16T09:00:00Z", agora), "há 3 h");
  assert.equal(haQuantoTempo("2026-10-15T08:00:00Z", agora), "ontem");
  assert.equal(haQuantoTempo("2026-10-10T12:00:00Z", agora), "há 6 dias");
  assert.equal(haQuantoTempo("2026-08-01T12:00:00Z", agora), "01/08/2026");
});

const hoje = "2026-10-16";

test("iniciais: primeira letra do primeiro e do último nome", () => {
  assert.equal(iniciais("Maria da Silva Souza"), "MS");
  assert.equal(iniciais("joão"), "J");
  assert.equal(iniciais("  "), "?");
  assert.equal(iniciais("Conferência visual (temporário)"), "CT");
  assert.equal(iniciais("Élise O'Brien"), "ÉO");
});

test("prazoRelativo: hoje, futuro e atrasado", () => {
  assert.deepEqual(prazoRelativo("2026-10-16", hoje), { texto: "hoje", atrasado: false });
  assert.deepEqual(prazoRelativo("2026-10-17", hoje), { texto: "amanhã", atrasado: false });
  assert.deepEqual(prazoRelativo("2026-10-21", hoje), { texto: "em 5 dias", atrasado: false });
  assert.deepEqual(prazoRelativo("2026-10-15", hoje), { texto: "ontem", atrasado: true });
  assert.deepEqual(prazoRelativo("2026-10-02", hoje), { texto: "há 14 dias", atrasado: true });
  assert.equal(prazoRelativo(null, hoje), null);
});

test("indicadoresDoCliente: só processos ativos/pausados entram na média", () => {
  const ind = indicadoresDoCliente([
    { status: "ativo", checklistPct: 40, formularioPct: 100, pendentesCliente: 2, prazo: "2026-11-01" },
    { status: "pausado", checklistPct: 80, formularioPct: null, pendentesCliente: 1, prazo: "2026-10-20" },
    { status: "concluido", checklistPct: 100, formularioPct: 100, pendentesCliente: 0, prazo: "2026-01-01" },
  ]);
  assert.equal(ind.processosEmAndamento, 2);
  assert.equal(ind.checklistPct, 60);
  assert.equal(ind.formularioPct, 100); // processo sem formulário não puxa a média para baixo
  assert.equal(ind.pendentesCliente, 3);
  assert.equal(ind.proximoPrazo, "2026-10-20");
});

test("indicadoresDoCliente: sem processo em andamento", () => {
  const ind = indicadoresDoCliente([]);
  assert.equal(ind.processosEmAndamento, 0);
  assert.equal(ind.checklistPct, null);
  assert.equal(ind.formularioPct, null);
  assert.equal(ind.pendentesCliente, 0);
  assert.equal(ind.proximoPrazo, null);
});

test("ordenarTarefas: abertas primeiro, por prazo; sem prazo no fim; concluídas por último", () => {
  const t = (id, status, prazo) => ({ id, status, prazo });
  const ordem = ordenarTarefas([
    t("a", "concluida", "2026-10-01"),
    t("b", "pendente", null),
    t("c", "em_andamento", "2026-10-20"),
    t("d", "pendente", "2026-10-10"),
    t("e", "cancelada", null),
  ]).map((x) => x.id);
  assert.deepEqual(ordem, ["d", "c", "b", "a", "e"]);
});
