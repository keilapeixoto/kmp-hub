// Insere os templates de checklist extraídos do repo kmp-forms direto via
// API (secret key), sem precisar do SQL Editor. Mesma lógica de parsing de
// scripts/parse-checklists.mjs e mesma regra de idempotência do seed SQL:
// pula templates cujo nome já existe.
//
// Uso: node scripts/seed-checklists.mjs "<pasta do clone de kmp-forms>"

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error('Uso: node scripts/seed-checklists.mjs "<pasta kmp-forms>"');
  process.exit(1);
}

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const TEMPLATES = [
  { file: "checklist-single.html", serviceType: "Subclass 485 — Single", descricao: "Temporary Graduate Visa — Single Application", format: "html" },
  { file: "checklist-couple.html", serviceType: "Subclass 485 — Couple", descricao: "Temporary Graduate Visa — Couple Application", format: "html" },
  { file: "checklist-single-485-post-higher-education.html", serviceType: "Subclass 485 Post-Higher Education — Single", descricao: "Temporary Graduate Visa (Post-Higher Education) — Single Application", format: "html" },
  { file: "checklistcouple-485-post-higher-education.html", serviceType: "Subclass 485 Post-Higher Education — Couple", descricao: "Temporary Graduate Visa (Post-Higher Education) — Couple Application", format: "html" },
  { file: "checklist-482-subsequent.html", serviceType: "Subclass 482 — Subsequent Entrant", descricao: "Skills in Demand / TSS — Subsequent Entrant (parceiro/família)", format: "js" },
];

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function parseHtmlFormat(html) {
  const items = [];
  let currentSection = null;
  let pending = null;
  const markerRe = /class="(sec-title|item-main|item-note|item-warn)"[^>]*>([\s\S]*?)<\//g;
  let match;
  while ((match = markerRe.exec(html)) !== null) {
    const kind = match[1];
    const text = stripTags(match[2]);
    if (!text) continue;
    if (kind === "sec-title") currentSection = text;
    else if (kind === "item-main") {
      if (pending) items.push(pending);
      pending = { nome: text, notas: [], section: currentSection };
    } else if (pending) pending.notas.push(text);
  }
  if (pending) items.push(pending);
  return items.map((it) => ({
    nome: it.nome,
    descricao: [it.section, ...it.notas].filter(Boolean).join(" · ") || null,
    obrigatorio: true,
    condicional: false,
  }));
}

function parseJsFormat(html) {
  const start = html.indexOf("const SECTIONS = [");
  const from = html.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = from; i < html.length; i++) {
    if (html[i] === "[") depth++;
    if (html[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const sections = eval(html.slice(from, end + 1));
  const items = [];
  for (const sec of sections) {
    for (const item of sec.items) {
      items.push({
        nome: item.title,
        descricao: [sec.title, item.sub].filter(Boolean).join(" · ") || null,
        obrigatorio: item.tag === "required",
        condicional: item.tag === "conditional",
      });
    }
  }
  return items;
}

for (const t of TEMPLATES) {
  const templateName = `Checklist ${t.serviceType}`;

  const { data: existing } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("nome", templateName)
    .maybeSingle();
  if (existing) {
    console.log(`pulado (já existe): ${templateName}`);
    continue;
  }

  const html = readFileSync(join(SRC, t.file), "utf8");
  const items = t.format === "js" ? parseJsFormat(html) : parseHtmlFormat(html);
  if (items.length === 0) {
    console.error(`AVISO: 0 itens em ${t.file} — pulando`);
    continue;
  }

  let { data: st } = await supabase
    .from("service_types")
    .select("id")
    .eq("nome", t.serviceType)
    .maybeSingle();
  if (!st) {
    const { data, error } = await supabase
      .from("service_types")
      .insert({ nome: t.serviceType, descricao: t.descricao })
      .select("id")
      .single();
    if (error) throw error;
    st = data;
  }

  const { data: template, error: tplError } = await supabase
    .from("checklist_templates")
    .insert({ service_type_id: st.id, nome: templateName })
    .select("id")
    .single();
  if (tplError) throw tplError;

  await supabase
    .from("service_types")
    .update({ checklist_template_id: template.id })
    .eq("id", st.id);

  const { error: itemsError } = await supabase.from("checklist_template_items").insert(
    items.map((it, i) => ({
      checklist_template_id: template.id,
      ordem: i + 1,
      nome: it.nome,
      descricao: it.descricao,
      obrigatorio: it.obrigatorio,
      condicional: it.condicional,
    })),
  );
  if (itemsError) throw itemsError;

  console.log(`criado: ${templateName} (${items.length} itens)`);
}
console.log("Seed de checklists concluído.");
