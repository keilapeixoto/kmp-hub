// KMP Hub · Preenche clients.visto_aplicado a partir das pastas da KEY
// MIGRATION (import/key-migration-map.csv, fora do git). Liga a pasta ao
// cliente pelo nome proposto na importação. Só preenche quem está vazio;
// nunca sobrescreve o que a equipe digitou. Não mostra nomes: só contagens.
//
// Simulação: node --env-file=.env.local scripts/visto-da-key-migration.mjs [caminho/do/map.csv]
// Gravar:    ... --apply
// Precisa da migração 20261017130000_clients_perfil_completo.sql.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { melhorVisto, vistoDaPasta } from "../lib/clients/visto-da-pasta.ts";

const aplicar = process.argv.includes("--apply");
const arquivo = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "import/key-migration-map.csv";
const normalizar = (t) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const linhas = readFileSync(arquivo, "utf8").split(/\r?\n/).filter(Boolean);
const cab = linhas.shift().split(";");
const col = (n) => cab.indexOf(n);
const porCliente = new Map();
for (const l of linhas) {
  const c = l.split(";");
  if (c[col("acao")] !== "importar") continue;
  const nome = normalizar(c[col("cliente_proposto")] ?? "");
  if (!nome) continue;
  const lista = porCliente.get(nome) ?? [];
  lista.push(vistoDaPasta(c[col("tipo_processo")] ?? ""));
  porCliente.set(nome, lista);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const { data: clientes, error } = await supabase.from("clients").select("id, nome, visto_aplicado").eq("is_demo", false);
if (error) {
  console.error("Erro lendo clientes:", error.message, "(a migração 20261017130000 já foi aplicada?)");
  process.exit(1);
}

const plano = [];
let semPasta = 0;
let jaTinha = 0;
let pastaSemVisto = 0;
for (const c of clientes) {
  const rotulos = porCliente.get(normalizar(c.nome));
  if (!rotulos) { semPasta++; continue; }
  const visto = melhorVisto(rotulos);
  if (!visto) { pastaSemVisto++; continue; }
  if (c.visto_aplicado) { jaTinha++; continue; }
  plano.push({ id: c.id, visto });
}

const contagem = {};
for (const p of plano) contagem[p.visto] = (contagem[p.visto] ?? 0) + 1;
console.log({ clientes: clientes.length, vaoReceber: plano.length, semPastaNaKeyMigration: semPasta, pastaSemVistoIdentificado: pastaSemVisto, jaTinhamVisto: jaTinha });
console.log("Por visto:", contagem);

if (!aplicar) {
  console.log("\nSimulação. Rode com --apply para gravar.");
  process.exit(0);
}
let gravados = 0;
for (const p of plano) {
  const { error: e } = await supabase
    .from("clients")
    .update({ visto_aplicado: p.visto, visto_aplicado_origem: "Pasta KEY MIGRATION" })
    .eq("id", p.id)
    .is("visto_aplicado", null);
  if (e) console.error("Falhou um cliente:", e.code);
  else gravados++;
}
console.log(`Gravados: ${gravados}`);
