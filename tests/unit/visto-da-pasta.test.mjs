import test from "node:test";
import assert from "node:assert/strict";
import { melhorVisto, vistoDaPasta } from "../../lib/clients/visto-da-pasta.ts";

test("visto e situação a partir da pasta", () => {
  assert.equal(vistoDaPasta("485 APPLICATION / APLICADOS"), "485 · aplicado");
  assert.equal(vistoDaPasta("485 PARA APLICAR / 408 VISA"), "485 · a aplicar");
  assert.equal(vistoDaPasta("485 APPLICATION"), "485");
  assert.equal(vistoDaPasta("600 TOURIST VISA"), "600");
  assert.equal(vistoDaPasta("TOURIST VISA"), "600");
  assert.equal(vistoDaPasta("APPEAL / WITHDRAWAL"), "Recurso (AAT) · retirado");
  assert.equal(vistoDaPasta("USA VISAS / APROVADOS"), "EUA B1/B2 · aprovado");
  assert.equal(vistoDaPasta("BRIDDING VISA B MANUAL"), "Bridging B");
  assert.equal(vistoDaPasta("PARTNER VISA / DANILO (VISA)"), "Partner");
  assert.equal(vistoDaPasta("TEMPLATES VISTOS"), null);
  assert.equal(vistoDaPasta(""), null);
});

test("mais de uma pasta: fica a que diz a situação", () => {
  assert.equal(melhorVisto(["485", "485 · aplicado", null]), "485 · aplicado");
  assert.equal(melhorVisto([null, "600"]), "600");
  assert.equal(melhorVisto([null]), null);
});
