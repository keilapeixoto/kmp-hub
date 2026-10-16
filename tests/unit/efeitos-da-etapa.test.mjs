import test from "node:test";
import assert from "node:assert/strict";
import { efeitosDaEtapa, mais28Dias } from "../../lib/cases/efeitos-da-etapa.ts";

test("etapas do 485 e o que cada uma faz sozinha", () => {
  assert.deepEqual(efeitosDaEtapa("Análise de documentos"), {});
  assert.deepEqual(efeitosDaEtapa("Lodgement do visto"), {});
  assert.deepEqual(efeitosDaEtapa("Skill Assessment aplicado"), { skills: "aplicado" });
  assert.deepEqual(efeitosDaEtapa("Visto aplicado"), { aplicacao: "em_analise" });
  assert.deepEqual(efeitosDaEtapa("Aguardando aprovação do Skill Assessment"), { skills: "aplicado" });
  assert.deepEqual(efeitosDaEtapa("Aguardando agendamento do exame médico"), { prazo: "exame_medico" });
  assert.deepEqual(efeitosDaEtapa("Request recebido da imigração"), { aplicacao: "pedido_informacao", prazo: "informacao_adicional" });
  assert.deepEqual(efeitosDaEtapa("Visto aprovado"), { aplicacao: "concedida" });
});

test("28 dias corridos", () => {
  assert.equal(mais28Dias("2026-10-17"), "2026-11-14");
  assert.equal(mais28Dias("2026-02-10"), "2026-03-10");
});
