import test from "node:test";
import assert from "node:assert/strict";
import { montarLinhaDoTempo } from "../../lib/portal/linha-do-tempo.ts";

test("junta início, etapas, status, formulário e documentos, do mais novo para o mais antigo", () => {
  const ev = montarLinhaDoTempo({
    inicio: "2026-10-01",
    historico: [
      { campo: "etapa", para: "Documentação", created_at: "2026-10-03T10:00:00Z" },
      { campo: "status", para: "pausado", created_at: "2026-10-05T10:00:00Z" },
      { campo: "status", para: "valor_estranho", created_at: "2026-10-06T10:00:00Z" },
      { campo: "etapa", para: null, created_at: "2026-10-07T10:00:00Z" },
    ],
    formularioEnviadoEm: "2026-10-04T10:00:00Z",
    documentos: [{ nome: "passaporte.pdf", created_at: "2026-10-02T10:00:00Z" }],
  });
  assert.deepEqual(
    ev.map((e) => e.titulo),
    [
      "Processo pausado",
      "Formulário de dados enviado",
      "Etapa: Documentação",
      "Você enviou: passaporte.pdf",
      "Início do processo",
    ],
  );
});

test("recado da equipe entra na linha do tempo como evento próprio", () => {
  const ev = montarLinhaDoTempo({
    inicio: null,
    historico: [],
    formularioEnviadoEm: null,
    documentos: [],
    recados: [{ mensagem: "Aguardando resposta do Home Affairs", created_at: "2026-10-10T00:00:00Z" }],
  });
  assert.deepEqual(ev, [{ data: "2026-10-10T00:00:00Z", titulo: "Aguardando resposta do Home Affairs", tipo: "recado" }]);
});
