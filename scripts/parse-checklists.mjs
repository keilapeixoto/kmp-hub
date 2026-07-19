// Parser dos checklists do repo kmp-forms → SQL de seed para o KMP Hub.
// Dois formatos: HTML estático (.item-main/.item-note/.item-warn) e
// array JS `const SECTIONS = [...]` (482).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];

const TEMPLATES = [
  {
    file: "checklist-single.html",
    serviceType: "Subclass 485 — Single",
    descricao: "Temporary Graduate Visa — Single Application",
    format: "html",
  },
  {
    file: "checklist-couple.html",
    serviceType: "Subclass 485 — Couple",
    descricao: "Temporary Graduate Visa — Couple Application",
    format: "html",
  },
  {
    file: "checklist-single-485-post-higher-education.html",
    serviceType: "Subclass 485 Post-Higher Education — Single",
    descricao: "Temporary Graduate Visa (Post-Higher Education) — Single Application",
    format: "html",
  },
  {
    file: "checklistcouple-485-post-higher-education.html",
    serviceType: "Subclass 485 Post-Higher Education — Couple",
    descricao: "Temporary Graduate Visa (Post-Higher Education) — Couple Application",
    format: "html",
  },
  {
    file: "checklist-482-subsequent.html",
    serviceType: "Subclass 482 — Subsequent Entrant",
    descricao: "Skills in Demand / TSS — Subsequent Entrant (parceiro/família)",
    format: "js",
  },
];

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Formato 1: HTML estático. Percorre o body na ordem, rastreando a seção
// corrente (sec-title) e coletando cada .item (item-main + note/warn).
function parseHtmlFormat(html) {
  const items = [];
  let currentSection = null;

  // Divide por marcadores na ordem em que aparecem no documento.
  const markerRe = /class="(sec-title|item-main|item-note|item-warn)"[^>]*>([\s\S]*?)<\//g;
  let match;
  let pending = null;

  while ((match = markerRe.exec(html)) !== null) {
    const kind = match[1];
    const text = stripTags(match[2]);
    if (!text) continue;

    if (kind === "sec-title") {
      currentSection = text;
    } else if (kind === "item-main") {
      if (pending) items.push(pending);
      pending = { nome: text, notas: [], section: currentSection };
    } else if (kind === "item-note" || kind === "item-warn") {
      if (pending) pending.notas.push(text);
    }
  }
  if (pending) items.push(pending);

  return items.map((it) => ({
    nome: it.nome,
    descricao: [it.section, ...it.notas].filter(Boolean).join(" · ") || null,
    obrigatorio: true,
    condicional: false,
  }));
}

// Formato 2: const SECTIONS = [...] (objeto JS literal — extraído e avaliado).
function parseJsFormat(html) {
  const start = html.indexOf("const SECTIONS = [");
  if (start === -1) throw new Error("SECTIONS não encontrado");
  const from = html.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = from; i < html.length; i++) {
    if (html[i] === "[") depth++;
    if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
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

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

let sql = `-- KMP Hub · Importação dos checklists do repositório kmp-forms
-- Gerado automaticamente a partir dos HTML do repo (não editar à mão;
-- regenerar com scripts/parse-checklists.mjs se os HTML mudarem).
--
-- Idempotente: pula templates cujo nome já existe. Cria o service_type
-- (se não existir pelo nome), o checklist_template, aponta
-- service_types.checklist_template_id e insere os itens em ordem.

do $$
declare
  v_service_type_id uuid;
  v_template_id uuid;
begin
`;

for (const t of TEMPLATES) {
  const html = readFileSync(join(SRC, t.file), "utf8");
  const items = t.format === "js" ? parseJsFormat(html) : parseHtmlFormat(html);

  if (items.length === 0) {
    console.error(`AVISO: 0 itens extraídos de ${t.file} — pulando`);
    continue;
  }

  const templateName = `Checklist ${t.serviceType}`;

  sql += `
  -- --------------------------------------------------------------------
  -- ${t.file} → ${t.serviceType} (${items.length} itens)
  -- --------------------------------------------------------------------
  if not exists (select 1 from public.checklist_templates where nome = ${sqlString(templateName)}) then
    select id into v_service_type_id from public.service_types where nome = ${sqlString(t.serviceType)};
    if v_service_type_id is null then
      insert into public.service_types (nome, descricao)
      values (${sqlString(t.serviceType)}, ${sqlString(t.descricao)})
      returning id into v_service_type_id;
    end if;

    insert into public.checklist_templates (service_type_id, nome)
    values (v_service_type_id, ${sqlString(templateName)})
    returning id into v_template_id;

    update public.service_types
    set checklist_template_id = v_template_id
    where id = v_service_type_id;

    insert into public.checklist_template_items
      (checklist_template_id, ordem, nome, descricao, obrigatorio, condicional)
    values
`;
  sql += items
    .map(
      (it, i) =>
        `      (v_template_id, ${i + 1}, ${sqlString(it.nome)}, ${sqlString(it.descricao)}, ${it.obrigatorio}, ${it.condicional})`,
    )
    .join(",\n");
  sql += `;
  end if;
`;
  console.log(`${t.file}: ${items.length} itens → ${t.serviceType}`);
}

sql += `end $$;
`;

writeFileSync(OUT, sql);
console.log(`\nSQL gerado em ${OUT}`);
