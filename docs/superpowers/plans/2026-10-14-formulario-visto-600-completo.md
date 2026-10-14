# Formulário do visto 600 completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cliente novo preenche o formulário do visto 600 no portal sem travar; a equipe vê, edita e é avisada; a extensão preenche o ImmiAccount com tudo o que tem resposta direta.

**Architecture:** O modelo de formulário (`case_form_templates/steps/fields`) ganha 35 perguntas por script incremental (nunca recriar o modelo). A extensão (`browser-extension/visa-autofill.js`) ganha três capacidades (`prefixo`, `fixo`, `presenca`) e as entradas novas do `FIELD_MAP`. O portal deixa de bloquear "Próximo" e valida os obrigatórios só no envio. A equipe ganha edição no card do processo, e-mail de aviso (Resend existente) e um card no Início.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (RLS), TypeScript, extensão Chrome (JS puro), `node:test` + `jsdom` para testes, Playwright para o fluxo do portal.

**Spec:** `docs/superpowers/specs/2026-10-14-formulario-visto-600-completo-design.md` (decisões 1–6 aprovadas pela Keila: todas "sim", pai e mãe opcionais).

## Global Constraints

- Acesso do cliente **só pelo portal com login**; nenhum formulário público (Fase 2).
- Só o visto 600. Nada de integração externa nova; e-mail só pelo Resend que já existe (`lib/storage-admin/email.ts`).
- A extensão **nunca marca "Yes"** em saúde, caráter ou histórico adverso (páginas 16, 17 e o "descumpriu/recusado" da 18); só "No" quando o cliente respondeu "Não". Página 20 sempre manual.
- A extensão **só preenche campos**: nunca clica em Previous/Next/Save/Submit.
- **Nunca recriar o modelo de formulário** (`scripts/import-case-forms.mjs` apaga respostas). Mudanças no modelo: só por `scripts/add-visa-600-fields.mjs` e `scripts/adjust-visa-600-form.mjs` (incrementais, idempotentes, com simulação antes de `--apply`).
- Gravações de respostas em **blocos de 8 com 1 nova tentativa** (o banco de dev estoura `57014` em upserts grandes).
- O PDF "Record of Responses" **não é guardado**; só as respostas.
- Dados de passaporte e de cliente **nunca** em log, URL, teste versionado ou mensagem de commit. Fixtures de teste são sintéticas.
- Lógica nova que precise de teste fica em arquivos **sem import com alias `@/`** (rodam no `node --test`); o código que usa `@/` só liga as peças.
- **Commits locais por tarefa; nunca `git push`** — o envio ao portal oficial é decisão da Keila. Fecho de cada commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Comentários e textos de interface em português, sem emoji.

## Review Focus

Entradas e falhas que o desenho implica e que mais podem incomodar quem usa, cada uma com o teste na tarefa dona:

1. **Cliente envia com obrigatório vazio (ou só espaços)** → não envia, mostra a lista com etapa e campo. (Task 5: `camposPendentes`)
2. **A gravação falha no meio** (2º bloco de 8 estoura) → informa quantos foram gravados e o que já está salvo é mantido. (Task 6: `salvarRespostasEmBlocos`)
3. **Nome de cliente com HTML** (`<script>`) no e-mail de aviso → escapado, nunca executa. (Task 7: `buildSubmittedEmail`)
4. **O Resend falha ou não tem chave** → o cliente consegue enviar o formulário do mesmo jeito. (Task 7: `avisarEnvio`)
5. **Extensão: "Yes" nunca marcado nas declarações, e perguntas de prefixo parecido não se confundem** ("citizen of the selected country" × "citizen of any other country"). (Task 2 e Task 3)

---

### Task 1: Base de testes (node:test + jsdom) e decisões no desenho

**Files:**
- Modify: `package.json` (scripts `test:unit`, `test:extension`; devDependency `jsdom`)
- Create: `tests/extension/harness.mjs`
- Create: `tests/extension/formatos.test.mjs`
- Modify: `docs/superpowers/specs/2026-10-14-formulario-visto-600-completo-design.md` (§7: decisões aprovadas)

**Interfaces:**
- Produces: `tests/extension/harness.mjs` exporta `pagina(n, corpo)`, `campoTexto(id, rotulo, max?)`, `campoData(id, rotulo)`, `campoLista(id, rotulo, opcoes)`, `pergunta(id, texto, opcoes?)`, `rodar(t, html, campos, esperarMs?)` → `Document`, `texto(doc, id)`, `escolhido(doc, id)`, `opcaoLista(doc, id)`. Usado por todos os testes da extensão (Tasks 2 e 3).

- [ ] **Step 1: Instalar jsdom e registrar os scripts**

Run: `npm install -D jsdom`

Em `package.json`, dentro de `"scripts"`, acrescentar (depois de `"lint": "eslint",`):

```json
    "test:unit": "node --test tests/unit/",
    "test:extension": "node --test tests/extension/",
```

- [ ] **Step 2: Criar o harness**

```js
// tests/extension/harness.mjs
// Roda browser-extension/visa-autofill.js dentro de um jsdom com uma página
// montada à mão e devolve o documento resultante. Sem dado real de cliente.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const SCRIPT = readFileSync(
  new URL("../../browser-extension/visa-autofill.js", import.meta.url),
  "utf8",
);

export const pagina = (n, corpo) =>
  `<progress class="wc-progressbar" value="${n}" max="20"></progress>${corpo}`;

export const campoTexto = (id, rotulo, max = 100) =>
  `<label class="wc-label" for="${id}">${rotulo}</label><input id="${id}" type="text" maxlength="${max}">`;

export const campoData = (id, rotulo) =>
  `<label class="wc-label" for="${id}">${rotulo}</label><span class="wc-datefield"><input id="${id}" type="text"></span>`;

export const campoLista = (id, rotulo, opcoes) =>
  `<label class="wc-label" for="${id}">${rotulo}</label><select id="${id}"><option value=""></option>${opcoes
    .map((o) => `<option value="${o}">${o}</option>`)
    .join("")}</select>`;

export const pergunta = (id, texto, opcoes = ["Yes", "No"]) =>
  `<fieldset id="${id}"><legend class="wc-moved-label">${texto}<i class="fa fa-asterisk"></i></legend><div>${opcoes
    .map(
      (o) =>
        `<label class="wc-option"><input type="radio" name="${id}"><span class="wc-labeltext">${o}</span></label>`,
    )
    .join("")}</div></fieldset>`;

/** Carrega a extensão com os dados do cliente e espera ela preencher. */
export async function rodar(t, html, campos, esperarMs = 300) {
  const dom = new JSDOM(`<body>${html}</body>`, { runScripts: "outside-only" });
  t.after(() => dom.window.close()); // cancela os timers de nova tentativa da extensão
  const w = dom.window;
  w.chrome = {
    storage: { local: { get: async () => ({ kmpVisaData: { etapas: [{ campos }] } }) } },
  };
  w.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, esperarMs));
  return w.document;
}

export const texto = (doc, id) => doc.getElementById(id).value;
export const escolhido = (doc, id) =>
  doc.querySelector(`#${id} input:checked`)?.closest("label").textContent ?? null;
export const opcaoLista = (doc, id) => doc.getElementById(id).selectedOptions[0]?.textContent ?? "";
```

- [ ] **Step 3: Escrever os testes que travam o comportamento atual**

```js
// tests/extension/formatos.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { pagina, campoTexto, campoData, pergunta, rodar, texto, escolhido } from "./harness.mjs";

test("datas saem com o mês em letras (o ImmiAccount recusa dd/mm/aaaa)", async (t) => {
  const doc = await rodar(t, pagina(3, campoData("dn", "Date of birth")), [
    { label: "Data de nascimento", valor: "1970-07-13" },
  ]);
  assert.equal(texto(doc, "dn"), "13 Jul 1970");
});

test("telefone vai só com dígitos e sem o +55", async (t) => {
  const doc = await rodar(t, pagina(6, campoTexto("cel", "Mobile / Cell phone", 20)), [
    { label: "Celular", valor: "+55 11 95808-0252" },
  ]);
  assert.equal(texto(doc, "cel"), "11958080252");
});

test("campo de outra página não é preenchido", async (t) => {
  const doc = await rodar(t, pagina(8, campoData("dn", "Date of birth")), [
    { label: "Data de nascimento", valor: "1970-07-13" },
  ]);
  assert.equal(texto(doc, "dn"), "");
});

const CONDENADO =
  "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?";

test("declaração adversa: marca No quando o cliente respondeu Não", async (t) => {
  const doc = await rodar(t, pagina(17, pergunta("q", CONDENADO)), [
    { label: "Já foi condenado por crime em qualquer país?", valor: "Não" },
  ]);
  assert.equal(escolhido(doc, "q"), "No");
});

test("declaração adversa: nunca marca Yes", async (t) => {
  const doc = await rodar(t, pagina(17, pergunta("q", CONDENADO)), [
    { label: "Já foi condenado por crime em qualquer país?", valor: "Sim" },
  ]);
  assert.equal(escolhido(doc, "q"), null);
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:extension`
Expected: 5 testes PASS (travam o que já funciona hoje; nenhum código novo ainda).

- [ ] **Step 5: Registrar as decisões aprovadas no desenho**

Em `docs/superpowers/specs/2026-10-14-formulario-visto-600-completo-design.md`, trocar a linha `## 7. Decisões que a Keila precisa tomar` por `## 7. Decisões (aprovadas pela Keila em 14/10/2026: todas conforme a recomendação)` e acrescentar logo abaixo do título: `Estado: 1 sim, 2 sim, 3 sim, 4 pai e mãe opcionais, 5 sim, 6 sim. Observação: a página 17 tem 15 perguntas sem mapeamento (não 14).`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/extension docs/superpowers/specs
git commit -m "Base de testes da extensão (node:test + jsdom) e decisões aprovadas

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Extensão — `prefixo`, `fixo`, `presenca` e as páginas 2 e 3 com o que o Hub já tem

**Files:**
- Modify: `browser-extension/visa-autofill.js`
- Test: `tests/extension/paginas-2-3.test.mjs`

**Interfaces:**
- Consumes: `harness.mjs` (Task 1).
- Produces: três chaves novas nas entradas do `FIELD_MAP`, usadas pela Task 3: `prefixo: true` (rótulo casa pelo começo), `fixo: "<valor>"` (valor constante, sem campo no Hub), `tipo: "presenca"` (marca "Yes" se o campo do Hub tiver qualquer texto). E `prefixoOpcao: true` (a opção do radio casa pelo começo).

- [ ] **Step 1: Escrever os testes que falham**

```js
// tests/extension/paginas-2-3.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  pagina, campoTexto, campoLista, pergunta, rodar, texto, escolhido, opcaoLista,
} from "./harness.mjs";

test("pág. 2: país atual, situação legal, motivo, stream e governo", async (t) => {
  const html = pagina(
    2,
    campoLista("loc", "Current location", ["BRAZIL", "PORTUGAL"]) +
      campoLista("leg", "Legal status", ["Citizen", "Visitor", "Other"]) +
      campoLista("mot", "Select an option", ["Business", "Tourism", "Family visit", "Other"]) +
      pergunta("str", "Select the stream the applicant is applying for:", [
        "Business Visitor stream (business visit)",
        "Tourist stream (tourism/visit family or friends)",
      ]) +
      pergunta("gov", "Is the applicant travelling as a representative of a foreign government, travelling on a United Nations Laissez-Passer or a member of an exempt group?"),
  );
  const doc = await rodar(t, html, [
    { label: "País", valor: "Brasil" },
    { label: "Qual é a sua situação legal no país onde mora?", valor: "Cidadão" },
    { label: "Motivo da viagem à Austrália", valor: "Visitar família/amigos" },
  ]);
  assert.equal(opcaoLista(doc, "loc"), "BRAZIL");
  assert.equal(opcaoLista(doc, "leg"), "Citizen");
  assert.equal(opcaoLista(doc, "mot"), "Family visit");
  assert.match(escolhido(doc, "str"), /^Tourist stream/);
  assert.equal(escolhido(doc, "gov"), "No");
});

test("pág. 2: texto longo das datas importantes (rótulo com ou sem dois-pontos)", async (t) => {
  const html = pagina(
    2,
    `<label class="wc-label" for="dt">Give details of any significant dates on which the applicant needs to be in Australia:</label><textarea id="dt"></textarea>`,
  );
  const doc = await rodar(t, html, [
    { label: "Há datas importantes em que você precisa estar na Austrália? (evento, casamento, formatura...)", valor: "Formatura em 12/03" },
  ]);
  assert.equal(doc.getElementById("dt").value, "Formatura em 12/03");
});

const VIAJOU = "Has this applicant previously travelled to Australia?";
const PEDIU = "Has this applicant previously applied for a visa to Australia?";
const OUTRO_PASS = "Does this applicant have any other passports or documents for travel?";
const PACIFICO = "Is the applicant a Pacific-Australia Card holder?";
const CIDADAO_PASS = "Is this applicant a citizen of the selected country of passport (BRAZIL)?";
const CIDADAO_OUTRO = "Is this applicant a citizen of any other country?";

test("pág. 3: viagem anterior, pedido anterior, outro passaporte e Pacific card", async (t) => {
  const html = pagina(
    3,
    pergunta("v", VIAJOU) + pergunta("p", PEDIU) + pergunta("o", OUTRO_PASS) + pergunta("c", PACIFICO),
  );
  const doc = await rodar(t, html, [
    { label: "Já visitou a Austrália antes?", valor: "Sim" },
    { label: "Já solicitou visto para a Austrália antes?", valor: "Não" },
    { label: "Possui, ou já possuiu, outro passaporte?", valor: "Não" },
  ]);
  assert.equal(escolhido(doc, "v"), "Yes");
  assert.equal(escolhido(doc, "p"), "No");
  assert.equal(escolhido(doc, "o"), "No");
  assert.equal(escolhido(doc, "c"), "No");
});

test("pág. 3: outro passaporte — Sim não é marcado (só No)", async (t) => {
  const doc = await rodar(t, pagina(3, pergunta("o", OUTRO_PASS)), [
    { label: "Possui, ou já possuiu, outro passaporte?", valor: "Sim" },
  ]);
  assert.equal(escolhido(doc, "o"), null);
});

test("pág. 3: perguntas de cidadania com começo parecido não se confundem", async (t) => {
  const html = pagina(3, pergunta("cp", CIDADAO_PASS) + pergunta("co", CIDADAO_OUTRO));
  const doc = await rodar(t, html, [
    { label: "É cidadão do país do passaporte?", valor: "Sim" },
    { label: "Possui, ou já possuiu, outra nacionalidade ou cidadania?", valor: "Não" },
  ]);
  assert.equal(escolhido(doc, "cp"), "Yes");
  assert.equal(escolhido(doc, "co"), "No");
});

test("pág. 3: número do visto australiano — marca Yes só se o cliente informou", async (t) => {
  const html = pagina(
    3,
    pergunta("g", "Does this applicant have an Australian visa grant number?") +
      campoTexto("gn", "Australian visa grant number (if known)", 13),
  );
  const com = await rodar(t, html, [
    { label: "Número do visto australiano anterior (se tiver)", valor: "0123456789012" },
  ]);
  assert.equal(escolhido(com, "g"), "Yes");
  assert.equal(texto(com, "gn"), "0123456789012");

  const sem = await rodar(t, html, []);
  assert.equal(escolhido(sem, "g"), null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:extension`
Expected: os testes novos FAIL (extensão ainda não conhece `prefixo`, `fixo`, `presenca` nem essas entradas).

- [ ] **Step 3: Suporte a `prefixo`, `prefixoOpcao`, `fixo` e `presenca` em `visa-autofill.js`**

3a. Em `acharControlePorLabel`, trocar a assinatura e as duas comparações. Substituir

```js
function acharControlePorLabel(labelEn, scopeHeadingEn) {
  const alvo = normalize(labelEn);
  const raiz = acharEscopo(scopeHeadingEn);
  const labels = raiz.querySelectorAll(
    "label.wc-label[for], span.wc-label[data-wc-for]",
  );
  for (const lab of labels) {
    if (normalize(lab.textContent) !== alvo) continue;
```

por

```js
// `prefixo`: o rótulo do ImmiAccount pode ter um pedaço que muda (país entre
// parênteses, dois-pontos no fim); casa pelo começo em vez de igualdade.
function mesmoTexto(textoDaPagina, alvo, prefixo) {
  const t = normalize(textoDaPagina);
  return prefixo ? t.startsWith(alvo) : t === alvo;
}

function acharControlePorLabel(labelEn, scopeHeadingEn, prefixo = false) {
  const alvo = normalize(labelEn);
  const raiz = acharEscopo(scopeHeadingEn);
  const labels = raiz.querySelectorAll(
    "label.wc-label[for], span.wc-label[data-wc-for]",
  );
  for (const lab of labels) {
    if (!mesmoTexto(lab.textContent, alvo, prefixo)) continue;
```

e, no fallback de `<legend>`, trocar `normalize(legenda.textContent) === alvo` por `mesmoTexto(legenda.textContent, alvo, prefixo)`.

3b. Em `preencherControle`, no ramo `FIELDSET`, trocar `if (normalize(textoOpcao) === alvo) {` por

```js
      const t = normalize(textoOpcao);
      if (opcoes.prefixoOpcao ? t.startsWith(alvo) : t === alvo) {
```

3c. Em `rodar()`, dentro de `passada`, trocar as linhas

```js
      const valor = respostas[campo.pt];
      if (!valor) continue;
      const controle =
        acharControlePorLabel(campo.en, campo.scopeHeadingEn) ||
        (campo.escopoOpcional ? acharControlePorLabel(campo.en) : null);
```

por

```js
      // fixo: constante sem campo no Hub; presenca: "Yes" se o cliente informou algo.
      const doHub = respostas[campo.pt];
      const valor = campo.fixo ?? (campo.tipo === "presenca" ? (doHub ? "Yes" : null) : doHub);
      if (!valor) continue;
      const controle =
        acharControlePorLabel(campo.en, campo.scopeHeadingEn, campo.prefixo) ||
        (campo.escopoOpcional ? acharControlePorLabel(campo.en, undefined, campo.prefixo) : null);
```

e acrescentar `prefixoOpcao: campo.prefixoOpcao,` no objeto de opções passado a `preencherControle`.

- [ ] **Step 4: Tabelas de conversão e entradas novas do `FIELD_MAP`**

Junto das outras constantes (antes de `const FIELD_MAP`), acrescentar:

```js
const SITUACAO_LEGAL = {
  Cidadão: "Citizen",
  "Residente permanente": "Permanent Resident",
  Visitante: "Visitor",
  Estudante: "Student",
  "Visto de trabalho": "Work Visa",
  "Sem situação legal": "No Legal Status",
  Outro: "Other",
};

const MOTIVO_VISITA = {
  Turismo: "Tourism",
  "Visitar família/amigos": "Family visit",
  Negócios: "Business",
  "Estudo de curta duração (até 12 semanas)": "Study",
  "Tratamento médico": "Other",
  Outro: "Other",
};
```

No `FIELD_MAP`, logo depois da entrada da página 2 já existente (`Localização atual`), acrescentar:

```js
  { pagina: 2, pt: "País", en: "Current location", tipo: "pais" },
  { pagina: 2, pt: "Qual é a sua situação legal no país onde mora?", en: "Legal status", valueMap: SITUACAO_LEGAL },
  { pagina: 2, fixo: "Tourist stream", en: "Select the stream the applicant is applying for", prefixo: true, prefixoOpcao: true },
  { pagina: 2, pt: "Motivo da viagem à Austrália", en: "Select an option", valueMap: MOTIVO_VISITA },
  {
    pagina: 2,
    pt: "Há datas importantes em que você precisa estar na Austrália? (evento, casamento, formatura...)",
    en: "Give details of any significant dates on which the applicant needs to be in Australia",
    prefixo: true,
  },
  // Formulário só de turista: nunca é representante de governo.
  { pagina: 2, fixo: "No", en: "Is the applicant travelling as a representative of a foreign government", prefixo: true },
```

e, junto das entradas da página 3:

```js
  { pagina: 3, pt: "Já visitou a Austrália antes?", en: "Has this applicant previously travelled to Australia?", valueMap: SIM_NAO },
  { pagina: 3, pt: "Já solicitou visto para a Austrália antes?", en: "Has this applicant previously applied for a visa to Australia?", valueMap: SIM_NAO },
  // "já possuiu" é mais amplo que a pergunta do ImmiAccount: Sim fica manual.
  { pagina: 3, pt: "Possui, ou já possuiu, outro passaporte?", en: "Does this applicant have any other passports or documents for travel?", valueMap: SO_NAO },
  { pagina: 3, fixo: "No", en: "Is the applicant a Pacific-Australia Card holder?" },
  { pagina: 3, pt: "É cidadão do país do passaporte?", en: "Is this applicant a citizen of the selected country of passport", prefixo: true, valueMap: SIM_NAO },
  {
    pagina: 3,
    pt: "Número do visto australiano anterior (se tiver)",
    en: "Does this applicant have an Australian visa grant number?",
    tipo: "presenca",
  },
  { pagina: 3, pt: "Número do visto australiano anterior (se tiver)", en: "Australian visa grant number (if known)" },
```

`SO_NAO` está definido mais abaixo no arquivo, depois de `SIM_NAO`/`SEXO`; mover a declaração `const SO_NAO = { Não: "No" };` para junto de `SIM_NAO` (antes de `FIELD_MAP`) se o arquivo reclamar de uso antes da declaração.

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run test:extension`
Expected: todos PASS (os 5 da Task 1 e os novos).

- [ ] **Step 6: Commit**

```bash
git add browser-extension/visa-autofill.js tests/extension/paginas-2-3.test.mjs
git commit -m "Extensão: perguntas por prefixo, valores fixos e presença; páginas 2 e 3 com o que o Hub já tem

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: As 35 perguntas novas — modelo, banco e mapeamento da extensão

**Files:**
- Create: `scripts/visa-600-new-fields.json`
- Modify: `scripts/add-visa-600-fields.mjs` (ler o JSON)
- Modify: `scripts/import-case-forms.mjs` (formulário-base do 600 recebe os mesmos campos)
- Modify: `browser-extension/visa-autofill.js` (entradas das páginas 8, 9, 16, 17, 18)
- Test: `tests/extension/declaracoes.test.mjs`, `tests/unit/visa-600-campos.test.mjs`

**Interfaces:**
- Consumes: `prefixo`, `fixo`, `presenca`, `SIM_NAO`, `SO_NAO` (Task 2).
- Produces: `scripts/visa-600-new-fields.json` — array de `{ etapa, label, tipo, opcoes, ajuda, obrigatorio }`; os `label` são a chave que a extensão usa (`pt`) e que a Task 4 usa na importação do PDF.

- [ ] **Step 1: Escrever o teste de consistência e o das declarações (falham)**

```js
// tests/unit/visa-600-campos.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const campos = JSON.parse(readFileSync(new URL("../../scripts/visa-600-new-fields.json", import.meta.url), "utf8"));
const extensao = readFileSync(new URL("../../browser-extension/visa-autofill.js", import.meta.url), "utf8");
const ETAPAS = [
  "Dados Pessoais", "Passaporte", "Contato e Endereço", "Família", "Detalhes da Viagem",
  "Trabalho e Finanças", "Histórico de Viagens", "Saúde e Caráter", "Declaração e Assinatura",
];

test("são 35 perguntas novas, todas opcionais, com etapa e tipo válidos", () => {
  assert.equal(campos.length, 35);
  for (const c of campos) {
    assert.ok(ETAPAS.includes(c.etapa), `etapa inválida: ${c.etapa}`);
    assert.ok(["text", "textarea", "select", "radio", "date"].includes(c.tipo), c.label);
    assert.equal(c.obrigatorio, false, `${c.label} deveria ser opcional`);
    if (c.tipo === "radio") assert.deepEqual(c.opcoes, ["Sim", "Não"], c.label);
    if (c.tipo === "select") assert.ok(c.opcoes.length >= 2, c.label);
  }
});

test("rótulos únicos", () => {
  assert.equal(new Set(campos.map((c) => c.label)).size, campos.length);
});

test("todo campo novo tem entrada no FIELD_MAP da extensão (pelo mesmo rótulo)", () => {
  for (const c of campos) {
    assert.ok(extensao.includes(JSON.stringify(c.label)), `sem mapeamento: ${c.label}`);
  }
});
```

```js
// tests/extension/declaracoes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { pagina, pergunta, rodar, escolhido } from "./harness.mjs";

const ENTRADAS = [
  // [pág., rótulo no Hub, texto do ImmiAccount]
  [16, "Nos últimos 5 anos, morou ou ficou mais de 3 meses seguidos fora do país do passaporte (sem contar a Austrália)?", "In the last five years, has any applicant visited, or lived, outside their country of passport, for more than 3 consecutive months? Do not include time spent in Australia."],
  [17, "Já foi removido, deportado ou excluído de algum país (inclusive da Austrália)?", "Has any applicant ever been removed, deported or excluded from any country (including Australia)?"],
  [17, "Já serviu em força militar, polícia, milícia ou serviço de inteligência?", "Has any applicant ever served in a military force, police force, state sponsored / private militia or intelligence agency (including secret police)?"],
];

for (const [pg, rotuloHub, textoIm] of ENTRADAS) {
  test(`pág. ${pg}: "${rotuloHub.slice(0, 40)}…" — Não vira No`, async (t) => {
    const doc = await rodar(t, pagina(pg, pergunta("q", textoIm)), [{ label: rotuloHub, valor: "Não" }]);
    assert.equal(escolhido(doc, "q"), "No");
  });
  test(`pág. ${pg}: "${rotuloHub.slice(0, 40)}…" — Sim nunca é marcado`, async (t) => {
    const doc = await rodar(t, pagina(pg, pergunta("q", textoIm)), [{ label: rotuloHub, valor: "Sim" }]);
    assert.equal(escolhido(doc, "q"), null);
  });
}

test("pág. 9: estudo e visita a parentes — Sim e Não são marcados (fatos da viagem)", async (t) => {
  const html = pagina(
    9,
    pergunta("e", "Will the applicant undertake a course of study in Australia?") +
      pergunta("v", "Will the applicant visit any relatives, friends or contacts while in Australia?"),
  );
  const doc = await rodar(t, html, [
    { label: "Pretende fazer algum curso na Austrália?", valor: "Não" },
    { label: "Vai visitar parentes, amigos ou outros contatos na Austrália?", valor: "Sim" },
  ]);
  assert.equal(escolhido(doc, "e"), "No");
  assert.equal(escolhido(doc, "v"), "Yes");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:unit; npm run test:extension`
Expected: FAIL — o JSON ainda não existe e a extensão não tem as entradas.

- [ ] **Step 3: Criar `scripts/visa-600-new-fields.json`**

Cada item segue `{ "etapa", "label", "tipo", "opcoes", "ajuda", "obrigatorio": false }`. Perguntas Sim/Não usam `"tipo": "radio", "opcoes": ["Sim", "Não"]`; as demais `"opcoes": null`.

```json
[
  { "etapa": "Contato e Endereço", "label": "Qual é a sua situação legal no país onde mora?", "tipo": "select", "opcoes": ["Cidadão", "Residente permanente", "Visitante", "Estudante", "Visto de trabalho", "Sem situação legal", "Outro"], "ajuda": "Para quem mora no país de origem, em geral Cidadão.", "obrigatorio": false },
  { "etapa": "Detalhes da Viagem", "label": "Há datas importantes em que você precisa estar na Austrália? (evento, casamento, formatura...)", "tipo": "textarea", "opcoes": null, "ajuda": "Se não houver, escreva: não há datas específicas.", "obrigatorio": false },
  { "etapa": "Dados Pessoais", "label": "Já usou ou usa outros nomes (nome de solteira, apelido legal)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": "Se sim, escreva os nomes no campo \"Outros nomes já utilizados\".", "obrigatorio": false },
  { "etapa": "Passaporte", "label": "É cidadão do país do passaporte?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Passaporte", "label": "Possui carteira de identidade nacional (RG)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Histórico de Viagens", "label": "Número do visto australiano anterior (se tiver)", "tipo": "text", "opcoes": null, "ajuda": "Deixe em branco se nunca teve visto australiano.", "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Fez exame de saúde para visto australiano nos últimos 12 meses?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Família", "label": "Tem familiares (cônjuge ou filhos dependentes) que não vão viajar e não são cidadãos nem residentes permanentes da Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Detalhes da Viagem", "label": "Pretende fazer algum curso na Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Detalhes da Viagem", "label": "Vai visitar parentes, amigos ou outros contatos na Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Histórico de Viagens", "label": "Já teve algum visto da Austrália ou de outro país?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },

  { "etapa": "Saúde e Caráter", "label": "Nos últimos 5 anos, morou ou ficou mais de 3 meses seguidos fora do país do passaporte (sem contar a Austrália)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": "Declaração ao governo australiano: responda com atenção.", "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Pretende entrar em hospital ou unidade de saúde (inclusive casas de repouso) na Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Pretende trabalhar, estudar ou fazer estágio como profissional de saúde, ou trabalhar em unidade de saúde na Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Pretende trabalhar, estudar ou fazer estágio em cuidado de idosos ou de pessoas com deficiência na Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Pretende trabalhar ou fazer estágio em creche ou pré-escola na Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Pretende ficar em sala de aula por mais de 3 meses (como aluno, professor ou observador)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já teve ou tem tuberculose, teve contato próximo com alguém com tuberculose ativa, ou já fez raio-X do tórax com alteração?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Espera ter custos médicos ou precisar de tratamento na Austrália (por exemplo câncer, doença cardíaca, hepatite B ou C, HIV, doença renal, doença mental)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Precisa de cuidados médicos contínuos, equipamento especial ou ajuda de outras pessoas no dia a dia?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },

  { "etapa": "Saúde e Caráter", "label": "Já esteve sujeito a medida protetiva de violência doméstica ou familiar, ou outra ordem judicial de proteção a outra pessoa?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": "Declaração ao governo australiano: responda com atenção.", "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já foi alvo de mandado de prisão ou notificação da Interpol?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já foi considerado culpado de crime sexual envolvendo criança (mesmo sem condenação registrada)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já constou em cadastro de agressores sexuais?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já foi absolvido de algum crime por insanidade ou falta de discernimento?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já foi considerado por um tribunal incapaz de responder a um processo?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já esteve envolvido ou associado a atividades que representem risco à segurança nacional da Austrália ou de outro país?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já foi acusado de genocídio, crimes de guerra, crimes contra a humanidade, tortura, escravidão ou outro crime internacional grave?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já esteve associado a pessoa, grupo ou organização envolvida em conduta criminosa?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já esteve associado a organização que pratica violência ou atos violentos (guerra, insurgência, terrorismo, protesto)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já serviu em força militar, polícia, milícia ou serviço de inteligência?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já teve treinamento militar ou paramilitar, com armas, explosivos ou produtos químicos ou biológicos?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já esteve envolvido em tráfico ou contrabando de pessoas?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Já foi removido, deportado ou excluído de algum país (inclusive da Austrália)?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false },
  { "etapa": "Saúde e Caráter", "label": "Tem dívidas pendentes com o governo australiano ou órgão público da Austrália?", "tipo": "radio", "opcoes": ["Sim", "Não"], "ajuda": null, "obrigatorio": false }
]
```

(11 de perfil/viagem + 9 de saúde + 15 de caráter = 35.)

- [ ] **Step 4: Fazer o script incremental ler o JSON e o formulário-base também**

Em `scripts/add-visa-600-fields.mjs`, logo depois do array `const NOVOS = [ ... ];`, acrescentar:

```js
// As 35 perguntas de cobertura completa ficam num JSON só (também lido pelo
// import-case-forms.mjs e pelo teste de consistência com a extensão).
NOVOS.push(...JSON.parse(readFileSync("scripts/visa-600-new-fields.json", "utf8")));
```

Em `scripts/import-case-forms.mjs`, logo depois da declaração `const FORM_600 = { ... };` (antes de `FORM_485`/`ALL_FORMS`), acrescentar:

```js
for (const f of JSON.parse(readFileSync("scripts/visa-600-new-fields.json", "utf8"))) {
  const etapa = FORM_600.steps.find((s) => s.titulo === f.etapa);
  etapa.fields.push({
    label: f.label,
    ajuda: f.ajuda ?? undefined,
    tipo: f.tipo,
    opcoes: f.opcoes ?? undefined,
    obrigatorio: f.obrigatorio,
  });
}
```

- [ ] **Step 5: Entradas do `FIELD_MAP` para as páginas 8, 9, 16, 17 e 18**

No `FIELD_MAP` de `browser-extension/visa-autofill.js`, junto das entradas de cada página:

```js
  // Página 3 — perguntas novas do formulário
  { pagina: 3, pt: "Já usou ou usa outros nomes (nome de solteira, apelido legal)?", en: "Is this applicant currently, or have they ever been known by any other names?", valueMap: SIM_NAO },
  { pagina: 3, pt: "Possui carteira de identidade nacional (RG)?", en: "Does this applicant have a national identity card?", valueMap: SIM_NAO },
  { pagina: 3, pt: "Fez exame de saúde para visto australiano nos últimos 12 meses?", en: "Has this applicant undertaken a health examination for an Australian visa in the last 12 months?", valueMap: SO_NAO },

  // Página 8
  { pagina: 8, pt: "Tem familiares (cônjuge ou filhos dependentes) que não vão viajar e não são cidadãos nem residentes permanentes da Austrália?", en: "Does the applicant have any members of their family unit not travelling to Australia", prefixo: true, valueMap: SIM_NAO },

  // Página 9
  { pagina: 9, pt: "Pretende fazer algum curso na Austrália?", en: "Will the applicant undertake a course of study in Australia?", valueMap: SIM_NAO },
  { pagina: 9, pt: "Vai visitar parentes, amigos ou outros contatos na Austrália?", en: "Will the applicant visit any relatives, friends or contacts while in Australia?", valueMap: SIM_NAO },

  // Página 18 — fato de histórico, não declaração adversa
  { pagina: 18, pt: "Já teve algum visto da Austrália ou de outro país?", en: "Has the applicant held or does the applicant currently hold a visa to Australia or any other country?", valueMap: SIM_NAO },
```

E, para as páginas 16 e 17, um bloco gerado a partir de uma lista (só "No", nunca "Yes"), colocado logo depois do fechamento do `FIELD_MAP` (`];`):

```js
// Declarações de saúde (16) e caráter (17): só "No", nunca "Yes". O texto do
// ImmiAccount é longo e tem pontuação própria — casa pelo começo (prefixo).
const DECLARACOES_SO_NAO = [
  [16, "Nos últimos 5 anos, morou ou ficou mais de 3 meses seguidos fora do país do passaporte (sem contar a Austrália)?", "In the last five years, has any applicant visited, or lived, outside their country of passport"],
  [16, "Pretende entrar em hospital ou unidade de saúde (inclusive casas de repouso) na Austrália?", "Does any applicant intend to enter a hospital or a health care facility"],
  [16, "Pretende trabalhar, estudar ou fazer estágio como profissional de saúde, ou trabalhar em unidade de saúde na Austrália?", "Does any applicant intend to work as, or study or train to be, a health care worker"],
  [16, "Pretende trabalhar, estudar ou fazer estágio em cuidado de idosos ou de pessoas com deficiência na Austrália?", "Does any applicant intend to work, study or train within aged care or disability care"],
  [16, "Pretende trabalhar ou fazer estágio em creche ou pré-escola na Austrália?", "Does any applicant intend to work or be a trainee at a child care centre"],
  [16, "Pretende ficar em sala de aula por mais de 3 meses (como aluno, professor ou observador)?", "Does any applicant intend to be in a classroom situation for more than 3 months"],
  [16, "Já teve ou tem tuberculose, teve contato próximo com alguém com tuberculose ativa, ou já fez raio-X do tórax com alteração?", "Has any applicant: ever had, or currently have, tuberculosis"],
  [16, "Espera ter custos médicos ou precisar de tratamento na Austrália (por exemplo câncer, doença cardíaca, hepatite B ou C, HIV, doença renal, doença mental)?", "During their proposed visit to Australia, does any applicant expect to incur medical costs"],
  [16, "Precisa de cuidados médicos contínuos, equipamento especial ou ajuda de outras pessoas no dia a dia?", "Does any applicant require ongoing medical care or need special equipment"],
  [17, "Já esteve sujeito a medida protetiva de violência doméstica ou familiar, ou outra ordem judicial de proteção a outra pessoa?", "Has any applicant ever been the subject of a domestic violence or family violence order"],
  [17, "Já foi alvo de mandado de prisão ou notificação da Interpol?", "Has any applicant ever been the subject of an arrest warrant or Interpol notice"],
  [17, "Já foi considerado culpado de crime sexual envolvendo criança (mesmo sem condenação registrada)?", "Has any applicant ever been found guilty of a sexually based offence involving a child"],
  [17, "Já constou em cadastro de agressores sexuais?", "Has any applicant ever been named on a sex offender register"],
  [17, "Já foi absolvido de algum crime por insanidade ou falta de discernimento?", "Has any applicant ever been acquitted of any offence on the grounds of unsoundness of mind or insanity"],
  [17, "Já foi considerado por um tribunal incapaz de responder a um processo?", "Has any applicant ever been found by a court not fit to plead"],
  [17, "Já esteve envolvido ou associado a atividades que representem risco à segurança nacional da Austrália ou de outro país?", "Has any applicant ever been directly or indirectly involved in, or associated with, activities which would represent a risk to national security"],
  [17, "Já foi acusado de genocídio, crimes de guerra, crimes contra a humanidade, tortura, escravidão ou outro crime internacional grave?", "Has any applicant ever been charged with, or indicted for: genocide"],
  [17, "Já esteve associado a pessoa, grupo ou organização envolvida em conduta criminosa?", "Has any applicant ever been associated with a person, group or organisation that has been or is involved in criminal conduct"],
  [17, "Já esteve associado a organização que pratica violência ou atos violentos (guerra, insurgência, terrorismo, protesto)?", "Has any applicant ever been associated with an organisation engaged in violence"],
  [17, "Já serviu em força militar, polícia, milícia ou serviço de inteligência?", "Has any applicant ever served in a military force, police force"],
  [17, "Já teve treinamento militar ou paramilitar, com armas, explosivos ou produtos químicos ou biológicos?", "Has any applicant ever undergone any military/paramilitary training"],
  [17, "Já esteve envolvido em tráfico ou contrabando de pessoas?", "Has any applicant ever been involved in people smuggling or people trafficking"],
  [17, "Já foi removido, deportado ou excluído de algum país (inclusive da Austrália)?", "Has any applicant ever been removed, deported or excluded from any country"],
  [17, "Tem dívidas pendentes com o governo australiano ou órgão público da Austrália?", "Has any applicant ever had any outstanding debts to the Australian Government"],
];
for (const [pagina, pt, en] of DECLARACOES_SO_NAO) {
  FIELD_MAP.push({ pagina, pt, en, prefixo: true, valueMap: SO_NAO });
}
```

(O teste de consistência da Step 1 só exige que o rótulo apareça, entre aspas, em qualquer ponto de `visa-autofill.js`; assim vale para as entradas do `FIELD_MAP` e para a lista `DECLARACOES_SO_NAO`.)

- [ ] **Step 6: Rodar e ver passar**

Run: `npm run test:unit; npm run test:extension`
Expected: PASS. (Se o teste de consistência acusar um rótulo, o texto do JSON e o da extensão divergem: copiar de um para o outro.)

- [ ] **Step 7: Simular e aplicar no banco**

Run: `node scripts/add-visa-600-fields.mjs`
Expected: lista "inseriria" para os 35 (mais os já existentes aparecem como "já existe") e "nenhum formulário será alterado".

Depois de conferir a lista, Run: `node scripts/add-visa-600-fields.mjs --apply`
Expected: "Concluído." Rodar de novo sem `--apply`: tudo "já existe".

- [ ] **Step 8: Commit**

```bash
git add scripts/visa-600-new-fields.json scripts/add-visa-600-fields.mjs scripts/import-case-forms.mjs browser-extension/visa-autofill.js tests
git commit -m "Formulário 600: 35 perguntas novas e o mapeamento delas na extensão

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Importação do PDF traz os campos de perfil novos

**Files:**
- Modify: `lib/record-of-responses/map-600.ts`
- Test: `tests/unit/map-600.test.mjs`

**Interfaces:**
- Consumes: `mapRecordTo600(texto: string): { campos: Record<string,string>; avisos: string[] }` (já existe) e os rótulos da Task 3.
- Produces: o mesmo `mapRecordTo600`, agora com 5 rótulos a mais.

Só entra o que é **perfil** (vale para a nova aplicação): situação legal, outros nomes, cidadania do passaporte, carteira de identidade nacional e número do visto anterior. Saúde, caráter, estudo, visita, datas e exame ficam de fora: são da viagem anterior.

- [ ] **Step 1: Escrever o teste com um PDF sintético (falha)**

```js
// tests/unit/map-600.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mapRecordTo600 } from "../../lib/record-of-responses/map-600.ts";

// Texto sintético no formato do "Record of Responses" (sem dado real).
const TEXTO = `
Application context
Current location
Is the applicant currently outside Australia?
Yes
Give the current location of the applicant and their legal status at this location.
Current location: BRAZIL
Legal status: Citizen
National identity card
Does this applicant have a national identity card?
No
Other names / spellings
Is this applicant currently, or have they ever been known by any other names?
Yes
Citizenship
Is this applicant a citizen of the selected country of passport (BRAZIL)?
Yes
Is this applicant a citizen of any other country?
No
Grant number
Does this applicant have an Australian visa grant number?
Yes
Australian visa grant number (if known): 0123456789012
`;

test("traz situação legal, outros nomes, cidadania, RG nacional e número do visto", () => {
  const { campos } = mapRecordTo600(TEXTO);
  assert.equal(campos["Qual é a sua situação legal no país onde mora?"], "Cidadão");
  assert.equal(campos["Já usou ou usa outros nomes (nome de solteira, apelido legal)?"], "Sim");
  assert.equal(campos["É cidadão do país do passaporte?"], "Sim");
  assert.equal(campos["Possui carteira de identidade nacional (RG)?"], "Não");
  assert.equal(campos["Número do visto australiano anterior (se tiver)"], "0123456789012");
});

test("não importa declarações de saúde nem de caráter", () => {
  const { campos } = mapRecordTo600(
    `${TEXTO}\nCharacter declarations\nHas any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?\nNo`,
  );
  assert.equal(campos["Já foi condenado por crime em qualquer país?"], undefined);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:unit`
Expected: FAIL (`campos[...]` indefinido).

- [ ] **Step 3: Implementar em `map-600.ts`**

Junto das tabelas de conversão acrescentar:

```ts
const SITUACAO_LEGAL: Record<string, string> = {
  Citizen: "Cidadão",
  "Permanent Resident": "Residente permanente",
  Visitor: "Visitante",
  Student: "Estudante",
  "Work Visa": "Visto de trabalho",
  "No Legal Status": "Sem situação legal",
  Other: "Outro",
};
```

E, dentro de `mapRecordTo600`, antes do `return`, acrescentar:

```ts
  // ---- Perfil que vale para a nova aplicação (a viagem em si NÃO é trazida)
  poeLista("Qual é a sua situação legal no país onde mora?", pega(rec, "Legal status", { secao: "Application context" }), SITUACAO_LEGAL);
  poe("Já usou ou usa outros nomes (nome de solteira, apelido legal)?", sim(simNao(rec, "Is this applicant currently, or have they ever been known by any other names")) ?? undefined);
  poe("É cidadão do país do passaporte?", sim(simNao(rec, "Is this applicant a citizen of the selected country of passport")) ?? undefined);
  poe("Possui carteira de identidade nacional (RG)?", sim(simNao(rec, "Does this applicant have a national identity card")) ?? undefined);
  poe("Número do visto australiano anterior (se tiver)", pega(rec, "Australian visa grant number (if known)"));
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:unit`
Expected: PASS. Depois: `node scripts/dry-run-import-record.mjs "<PDF da Patricia>"` deve listar mais campos que antes (conferir sem mostrar valores).

- [ ] **Step 5: Commit**

```bash
git add lib/record-of-responses/map-600.ts tests/unit/map-600.test.mjs
git commit -m "Importação do PDF traz situação legal, outros nomes, cidadania, RG nacional e visto anterior

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cliente sem travar — Próximo sempre avança, obrigatórios só no envio

**Files:**
- Create: `lib/case-forms/validate.ts`
- Create: `scripts/adjust-visa-600-form.mjs`
- Modify: `lib/case-forms/data.ts` (acrescentar `getEtapasComCampos`)
- Modify: `app/(portal)/portal/formulario/_components/form-field-input.tsx` (tirar `required`)
- Modify: `app/(portal)/portal/formulario/actions.ts` (validar no envio)
- Modify: `app/(portal)/portal/formulario/page.tsx` (lista de pendências)
- Test: `tests/unit/validate.test.mjs`, `tests/e2e/portal/formulario.spec.ts`

**Interfaces:**
- Produces: `camposPendentes(etapas: EtapaComCampos[], respostas: Record<string,string>): Pendente[]` com `Pendente = { etapa: number; titulo: string; fieldId: string; label: string }` (etapa 1-based) e `getEtapasComCampos(templateId): Promise<(CaseFormStep & { fields: CaseFormField[] })[]>`. A Task 6 usa `FormFieldInput` sem `required`.

- [ ] **Step 1: Escrever o teste (falha)**

```js
// tests/unit/validate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { camposPendentes } from "../../lib/case-forms/validate.ts";

const etapas = [
  { titulo: "Dados Pessoais", fields: [
    { id: "a", label: "Nome", obrigatorio: true },
    { id: "b", label: "Outros nomes", obrigatorio: false },
  ] },
  { titulo: "Passaporte", fields: [{ id: "c", label: "Número", obrigatorio: true }] },
];

test("lista obrigatórios vazios com etapa (1-based) e rótulo", () => {
  const r = camposPendentes(etapas, { a: "Maria" });
  assert.deepEqual(r, [{ etapa: 2, titulo: "Passaporte", fieldId: "c", label: "Número" }]);
});

test("só espaços conta como vazio; opcional vazio não conta", () => {
  const r = camposPendentes(etapas, { a: "   ", c: "FU1" });
  assert.deepEqual(r.map((p) => p.fieldId), ["a"]);
});

test("tudo preenchido: nenhuma pendência", () => {
  assert.deepEqual(camposPendentes(etapas, { a: "x", c: "y" }), []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:unit`
Expected: FAIL (módulo `validate.ts` não existe).

- [ ] **Step 3: Implementar `validate.ts`**

```ts
// lib/case-forms/validate.ts
// Quais campos obrigatórios ainda estão vazios. Sem dependências: roda no
// servidor e nos testes.
import type { CaseFormField } from "./types";

export type EtapaComCampos = {
  titulo: string;
  fields: Pick<CaseFormField, "id" | "label" | "obrigatorio">[];
};

export type Pendente = { etapa: number; titulo: string; fieldId: string; label: string };

export function camposPendentes(
  etapas: EtapaComCampos[],
  respostas: Record<string, string>,
): Pendente[] {
  const pendentes: Pendente[] = [];
  etapas.forEach((etapa, i) => {
    for (const f of etapa.fields) {
      if (f.obrigatorio && !(respostas[f.id] ?? "").trim()) {
        pendentes.push({ etapa: i + 1, titulo: etapa.titulo, fieldId: f.id, label: f.label });
      }
    }
  });
  return pendentes;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: `getEtapasComCampos` em `lib/case-forms/data.ts`**

Ao fim do arquivo:

```ts
export async function getEtapasComCampos(
  templateId: string,
): Promise<(CaseFormStep & { fields: CaseFormField[] })[]> {
  const steps = await getCaseFormSteps(templateId);
  return Promise.all(
    steps.map(async (s) => ({ ...s, fields: await getCaseFormFields(s.id) })),
  );
}
```

- [ ] **Step 6: Tirar o bloqueio do navegador**

Em `form-field-input.tsx`, remover as 5 linhas `required={field.obrigatorio}` (textarea, select, radio, date, text). O asterisco laranja no rótulo permanece.

- [ ] **Step 7: Validar no envio (`actions.ts`)**

No topo, acrescentar os imports:

```ts
import { getEtapasComCampos, getCaseFormResponses } from "@/lib/case-forms/data";
import { camposPendentes } from "@/lib/case-forms/validate";
```

Substituir o bloco `if (direction === "enviar") { ... }` por:

```ts
  if (direction === "enviar") {
    // Obrigatórios só valem aqui: "Próximo" sempre avança e salva.
    const etapas = await getEtapasComCampos(templateId);
    const respostas = await getCaseFormResponses(caseFormId);
    const pendentes = camposPendentes(etapas, respostas);
    if (pendentes.length > 0) {
      revalidatePath("/portal/formulario");
      redirect(
        `/portal/formulario?processo=${caseId}&etapa=${pendentes[0].etapa}&pendentes=${pendentes.length}`,
      );
    }
    await supabase
      .from("case_forms")
      .update({ status: "enviado", enviado_em: new Date().toISOString() })
      .eq("id", caseFormId);
    revalidatePath("/portal");
    redirect(`/portal/formulario?processo=${caseId}&enviado=1`);
  }
```

(O aviso por e-mail entra na Task 7, depois do `update`.)

- [ ] **Step 8: Mostrar a lista de pendências em `page.tsx`**

No topo, importar `getEtapasComCampos` e `camposPendentes`. Depois de calcular `caseForm` e `responses`, acrescentar:

```tsx
  const mostrarPendentes = sp.pendentes !== undefined;
  const pendentes = mostrarPendentes
    ? camposPendentes(await getEtapasComCampos(template.id), caseForm ? await getCaseFormResponses(caseForm.id) : {})
    : [];
```

E, acima do `<form>`:

```tsx
        {pendentes.length > 0 ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">
              Faltam {pendentes.length} campo(s) obrigatório(s) para enviar:
            </p>
            <ul className="mt-2 space-y-1">
              {pendentes.map((p) => (
                <li key={p.fieldId}>
                  <Link
                    href={`/portal/formulario?processo=${caseId}&etapa=${p.etapa}`}
                    className="underline"
                  >
                    Etapa {p.etapa} — {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
```

- [ ] **Step 9: Ajustar o modelo (obrigatórios, repetição, ajuda)**

```js
// scripts/adjust-visa-600-form.mjs
// Ajustes incrementais do formulário do 600 (nunca recria o modelo):
//  - RG, CPF e nome do pai/da mãe deixam de ser obrigatórios (o ImmiAccount não pede);
//  - "Nacionalidade atual" sai (repete "Nacionalidade conforme passaporte");
//  - textos de ajuda onde o cliente costuma errar.
// Uso: node scripts/adjust-visa-600-form.mjs [--apply]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const apply = process.argv.includes("--apply");
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const TEMPLATE = "Formulário Visto de Turista (Subclass 600) — Coleta de Dados";
const OPCIONAIS = ["RG / Documento de identidade", "CPF", "Nome da mãe", "Nome do pai"];
const REMOVER = ["Nacionalidade atual"];
const AJUDA = {
  Nome: "Escreva exatamente como está no passaporte.",
  Sobrenome: "Escreva exatamente como está no passaporte.",
  "Número do passaporte": "Confira letra por letra no passaporte.",
  "Local de emissão": "Como aparece no passaporte (ex.: SR/DPF/SP).",
};

const { data: tpl } = await s.from("case_form_templates").select("id").eq("nome", TEMPLATE).single();
const { data: steps } = await s.from("case_form_steps").select("id").eq("template_id", tpl.id);
const { data: campos } = await s
  .from("case_form_fields")
  .select("id,label,obrigatorio,ajuda")
  .in("step_id", steps.map((x) => x.id));

for (const c of campos) {
  if (OPCIONAIS.includes(c.label) && c.obrigatorio) {
    console.log(`${apply ? "tornando" : "tornaria"} opcional: ${c.label}`);
    if (apply) await s.from("case_form_fields").update({ obrigatorio: false }).eq("id", c.id);
  }
  if (AJUDA[c.label] && !c.ajuda) {
    console.log(`${apply ? "gravando" : "gravaria"} ajuda em: ${c.label}`);
    if (apply) await s.from("case_form_fields").update({ ajuda: AJUDA[c.label] }).eq("id", c.id);
  }
  if (REMOVER.includes(c.label)) {
    const { count } = await s.from("case_form_responses").select("id", { count: "exact", head: true }).eq("field_id", c.id);
    console.log(`${apply ? "removendo" : "removeria"}: ${c.label} (${count ?? 0} resposta(s) que serão apagadas junto)`);
    if (apply) await s.from("case_form_fields").delete().eq("id", c.id);
  }
}
console.log(apply ? "\nConcluído." : "\nSimulação — nada foi gravado. Rode com --apply.");
```

Run: `node scripts/adjust-visa-600-form.mjs` (conferir a lista), depois `node scripts/adjust-visa-600-form.mjs --apply`.
Em `lib/record-of-responses/map-600.ts`, remover a linha `poe("Nacionalidade atual", paisParaPt(nacPassaporte));` (o campo deixa de existir).

No `FORM_600` de `scripts/import-case-forms.mjs` (instalações novas), remover a linha `t("Nacionalidade atual"),` e trocar `t("RG / Documento de identidade")`, `t("CPF")`, `t("Nome da mãe")` e `t("Nome do pai")` por `tOpt(...)` com o mesmo texto.

- [ ] **Step 10: Teste e2e do portal**

```ts
// tests/e2e/portal/formulario.spec.ts
import { test, expect } from "@playwright/test";

/**
 * Fluxo do formulário no portal. Precisa da sessão do portal salva
 * (npm run test:e2e:login:portal) e de E2E_FORM_CASE_ID = id de um processo
 * de teste do visto 600 desse cliente. Sem a variável, o teste é pulado.
 */
const caso = process.env.E2E_FORM_CASE_ID;

test.describe("Formulário no portal", () => {
  test.skip(!caso, "defina E2E_FORM_CASE_ID");

  test("Próximo avança mesmo com obrigatórios vazios", async ({ page }) => {
    await page.goto(`/portal/formulario?processo=${caso}&etapa=1`);
    await page.getByRole("button", { name: /Próximo/ }).click();
    await expect(page).toHaveURL(/etapa=2/);
  });

  test("Enviar com pendência mostra a lista e não envia", async ({ page }) => {
    await page.goto(`/portal/formulario?processo=${caso}&etapa=9`);
    await page.getByRole("button", { name: /Enviar formulário/ }).click();
    await expect(page.getByText(/Faltam \d+ campo\(s\) obrigatório\(s\)/)).toBeVisible();
    await expect(page.getByText(/Formulário enviado com sucesso/)).toHaveCount(0);
  });
});
```

Run: `npx eslint lib/case-forms app/\(portal\) && npx tsc --noEmit 2>&1 | grep -E "case-forms|portal/formulario" || echo "tipos ok"`.
Run (com sessão do portal e `E2E_FORM_CASE_ID` definidos): `npx playwright test tests/e2e/portal/formulario.spec.ts --project=portal`. Expected: 2 PASS.

- [ ] **Step 11: Commit**

```bash
git add lib/case-forms scripts/adjust-visa-600-form.mjs lib/record-of-responses/map-600.ts "app/(portal)/portal/formulario" tests
git commit -m "Formulário no portal: Próximo não trava; obrigatórios só no envio, com a lista do que falta

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Equipe edita as respostas no card do processo

**Files:**
- Create: `lib/case-forms/save.ts`
- Create: `app/(staff)/processos/case-form-edit-actions.ts`
- Create: `app/(staff)/processos/_components/case-form-edit.tsx`
- Modify: `app/(staff)/processos/_components/case-form-panel.tsx`
- Modify: `app/(staff)/processos/import-record-actions.ts` (usar o helper de blocos)
- Modify: `app/(portal)/portal/formulario/actions.ts` (usar `linhasDeFormData`)
- Test: `tests/unit/save.test.mjs`

**Interfaces:**
- Produces: `linhasDeFormData(caseFormId, fields, formData): LinhaResposta[]`, `salvarRespostasEmBlocos(supabase, linhas, tamanho?): Promise<{ gravados: number; total: number; erro: { code?: string; message: string } | null }>` e a Server Action `saveCaseFormByStaff(caseId, templateId, fields, formData)`.

- [ ] **Step 1: Escrever os testes (falham)**

```js
// tests/unit/save.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { linhasDeFormData, salvarRespostasEmBlocos } from "../../lib/case-forms/save.ts";

test("campo apagado vira valor nulo (não mantém o antigo)", () => {
  const fd = new FormData();
  fd.set("a", "  Maria  ");
  fd.set("b", "   ");
  const linhas = linhasDeFormData("cf1", [{ id: "a" }, { id: "b" }, { id: "c" }], fd);
  assert.deepEqual(linhas, [
    { case_form_id: "cf1", field_id: "a", valor: "Maria" },
    { case_form_id: "cf1", field_id: "b", valor: null },
    { case_form_id: "cf1", field_id: "c", valor: null },
  ]);
});

function falso(falhasPorChamada) {
  let chamada = 0;
  return {
    chamadas: () => chamada,
    from: () => ({
      upsert: async () => {
        const erro = falhasPorChamada[chamada++] ?? null;
        return { error: erro };
      },
    }),
  };
}
const linhas = (n) => Array.from({ length: n }, (_, i) => ({ case_form_id: "x", field_id: `f${i}`, valor: "v" }));

test("grava em blocos de 8", async () => {
  const sb = falso([]);
  const r = await salvarRespostasEmBlocos(sb, linhas(20));
  assert.deepEqual([r.gravados, r.total, r.erro], [20, 20, null]);
  assert.equal(sb.chamadas(), 3);
});

test("um bloco que falha uma vez é repetido e passa", async () => {
  const sb = falso([{ code: "57014", message: "timeout" }]);
  const r = await salvarRespostasEmBlocos(sb, linhas(8));
  assert.equal(r.erro, null);
  assert.equal(sb.chamadas(), 2);
});

test("falha no 2º bloco: informa quantos foram gravados e para", async () => {
  const sb = falso([null, { code: "57014", message: "t" }, { code: "57014", message: "t" }]);
  const r = await salvarRespostasEmBlocos(sb, linhas(20));
  assert.equal(r.gravados, 8);
  assert.equal(r.total, 20);
  assert.equal(r.erro.code, "57014");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:unit`
Expected: FAIL (`save.ts` não existe).

- [ ] **Step 3: Implementar `save.ts`**

```ts
// lib/case-forms/save.ts
// Montagem e gravação das respostas de um formulário. Sem dependências do
// app (roda nos testes). A gravação é em blocos pequenos com uma nova
// tentativa: cada linha gera também um registro de auditoria, e um upsert
// grande estourou o limite de tempo do banco (57014).
import type { CaseFormField } from "./types";

export type LinhaResposta = { case_form_id: string; field_id: string; valor: string | null };
type Erro = { code?: string; message: string };

export function linhasDeFormData(
  caseFormId: string,
  fields: Pick<CaseFormField, "id">[],
  formData: FormData,
): LinhaResposta[] {
  return fields.map((f) => {
    const raw = formData.get(f.id);
    const valor = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    return { case_form_id: caseFormId, field_id: f.id, valor };
  });
}

type Upserter = {
  from: (tabela: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert: (linhas: any, opcoes: { onConflict: string }) => PromiseLike<{ error: Erro | null }>;
  };
};

export async function salvarRespostasEmBlocos(
  supabase: Upserter,
  linhas: LinhaResposta[],
  tamanho = 8,
): Promise<{ gravados: number; total: number; erro: Erro | null }> {
  let gravados = 0;
  for (let i = 0; i < linhas.length; i += tamanho) {
    const bloco = linhas.slice(i, i + tamanho);
    let erro: Erro | null = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const { error } = await supabase
        .from("case_form_responses")
        .upsert(bloco, { onConflict: "case_form_id,field_id" });
      erro = error;
      if (!error) break;
    }
    if (erro) return { gravados, total: linhas.length, erro };
    gravados += bloco.length;
  }
  return { gravados, total: linhas.length, erro: null };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Usar o helper no portal e na importação**

Em `app/(portal)/portal/formulario/actions.ts`, trocar o bloco `if (fields.length > 0) { const rows = ...; await supabase.from("case_form_responses").upsert(...) }` por:

```ts
  if (fields.length > 0) {
    await salvarRespostasEmBlocos(supabase, linhasDeFormData(caseFormId, fields, formData));
  }
```

(importando `linhasDeFormData, salvarRespostasEmBlocos` de `@/lib/case-forms/save`).

Em `app/(staff)/processos/import-record-actions.ts`, substituir o laço de blocos (de `const TAMANHO_BLOCO = 8;` até o fim do `for`) por:

```ts
  const r = await salvarRespostasEmBlocos(supabase, linhas);
  const gravados = r.gravados;
  if (r.erro) {
    console.error("[importPreviousApplication] upsert falhou:", r.erro.code, r.erro.message);
    const tempo = r.erro.code === "57014";
    const rede = /fetch failed|ECONN|ENOTFOUND/i.test(r.erro.message);
    revalidatePath(`/processos/${caseId}`);
    voltar(caseId, {
      importados: String(gravados),
      mantidos: String(mantidos),
      importErro: `${tempo ? "O banco demorou demais para responder" : rede ? "A conexão com o banco falhou" : "Não consegui gravar as respostas"}. ${gravados} de ${linhas.length} campos foram gravados — clique em Importar de novo para completar (o que já está gravado é mantido).`,
    });
  }
```

- [ ] **Step 6: Ação e tela de edição da equipe**

```ts
// app/(staff)/processos/case-form-edit-actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaseFormField } from "@/lib/case-forms/types";
import { linhasDeFormData, salvarRespostasEmBlocos } from "@/lib/case-forms/save";

/**
 * A equipe corrige as respostas direto no card do processo. As permissões
 * são as do próprio formulário (RLS em case_forms/case_form_responses).
 */
export async function saveCaseFormByStaff(
  caseId: string,
  templateId: string,
  fields: CaseFormField[],
  formData: FormData,
) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/processos/${caseId}?editErro=${encodeURIComponent("Sessão expirada. Entre de novo.")}`);

  let { data: cf } = await supabase
    .from("case_forms").select("id").eq("case_id", caseId).eq("template_id", templateId).maybeSingle();
  if (!cf) {
    const { data: criado, error } = await supabase
      .from("case_forms")
      .insert({ case_id: caseId, template_id: templateId, status: "em_preenchimento" })
      .select("id").single();
    if (error || !criado) redirect(`/processos/${caseId}?editErro=${encodeURIComponent("Sem permissão para editar este formulário.")}`);
    cf = criado;
  }

  const r = await salvarRespostasEmBlocos(supabase, linhasDeFormData(cf.id as string, fields, formData));
  revalidatePath(`/processos/${caseId}`);
  if (r.erro) {
    redirect(`/processos/${caseId}?editErro=${encodeURIComponent(`${r.gravados} de ${r.total} campos foram gravados. Salve de novo para completar.`)}`);
  }
  redirect(`/processos/${caseId}?formSalvo=1`);
}
```

```tsx
// app/(staff)/processos/_components/case-form-edit.tsx
import { FormFieldInput } from "@/app/(portal)/portal/formulario/_components/form-field-input";
import { saveCaseFormByStaff } from "../case-form-edit-actions";
import type { StepWithFields } from "./case-form-panel";

export function CaseFormEdit({
  caseId,
  templateId,
  steps,
  responses,
  aviso,
}: {
  caseId: string;
  templateId: string;
  steps: StepWithFields[];
  responses: Record<string, string>;
  aviso: { ok: boolean; texto: string } | null;
}) {
  const fields = steps.flatMap((s) => s.fields);
  const action = saveCaseFormByStaff.bind(null, caseId, templateId, fields);

  return (
    <details className="mt-4 border-t border-kmp-divider pt-4">
      <summary className="cursor-pointer text-xs font-medium text-kmp-text/70">
        Editar respostas
      </summary>
      {aviso ? (
        <p className={`mt-3 rounded-md px-3 py-2 text-xs ${aviso.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {aviso.texto}
        </p>
      ) : null}
      <form action={action} className="mt-3 space-y-6">
        {steps.map((step) => (
          <fieldset key={step.id} className="space-y-4">
            <legend className="text-sm font-semibold text-kmp-text">{step.titulo}</legend>
            {step.fields.map((f) => (
              <FormFieldInput key={f.id} field={f} defaultValue={responses[f.id] ?? ""} />
            ))}
          </fieldset>
        ))}
        <button type="submit" className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white">
          Salvar respostas
        </button>
      </form>
    </details>
  );
}
```

Em `case-form-panel.tsx`: importar `CaseFormEdit`, acrescentar a prop `editAviso: { ok: boolean; texto: string } | null` e renderizar `<CaseFormEdit caseId={caseId} templateId={...} steps={steps} responses={responses} aviso={editAviso} />` logo depois de `<ImportRecordForm ... />`. O `templateId` vem de uma nova prop `templateId: string` (em `[id]/page.tsx` já existe `dataFormTemplate.id`). Em `[id]/page.tsx`, ler `sp.formSalvo` e `sp.editErro` e passar:

```tsx
            templateId={dataFormTemplate.id}
            editAviso={
              um(sp.editErro)
                ? { ok: false, texto: um(sp.editErro)! }
                : um(sp.formSalvo)
                  ? { ok: true, texto: "Respostas salvas." }
                  : null
            }
```

- [ ] **Step 7: Verificar**

Run: `npx eslint lib/case-forms "app/(staff)/processos" "app/(portal)" && npx tsc --noEmit 2>&1 | grep -E "case-form|processos|portal/formulario" || echo "tipos ok"`
Expected: sem erros. Verificação manual: abrir o processo da Patricia, abrir "Editar respostas", alterar um campo, salvar → faixa verde "Respostas salvas." e o valor novo aparece na lista.

- [ ] **Step 8: Commit**

```bash
git add lib/case-forms/save.ts "app/(staff)/processos" "app/(portal)/portal/formulario/actions.ts" tests/unit/save.test.mjs
git commit -m "Equipe edita as respostas no card do processo; gravação em blocos compartilhada

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Aviso por e-mail quando o cliente envia o formulário

**Files:**
- Create: `lib/case-forms/notify.ts` (puro)
- Create: `lib/case-forms/notify-server.ts` (liga ao Supabase e ao Resend)
- Modify: `app/(portal)/portal/formulario/actions.ts`
- Test: `tests/unit/notify.test.mjs`

**Interfaces:**
- Produces: `buildSubmittedEmail({ clienteNome, link }): { subject: string; html: string }`, `avisarEnvio(deps, caseId): Promise<void>` com `deps: { buscarDestino(caseId): Promise<{ email: string | null; clienteNome: string } | null>; enviar(to: string[], subject: string, html: string): Promise<{ ok: boolean; error: string | null }>; siteUrl: string }` (nunca lança), e `notifyFormSubmitted(caseId): Promise<void>` (versão ligada, em `notify-server.ts`).

- [ ] **Step 1: Escrever os testes (falham)**

```js
// tests/unit/notify.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmittedEmail, avisarEnvio } from "../../lib/case-forms/notify.ts";

test("nome com HTML é escapado no corpo do e-mail", () => {
  const { html, subject } = buildSubmittedEmail({
    clienteNome: '<script>alert("x")</script>\nBcc: a@b.c',
    link: "https://site/processos/1",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!/[\r\n]/.test(subject));
});

const base = { siteUrl: "https://site" };

test("envia para a consultora do processo com o link", async () => {
  let enviado;
  await avisarEnvio(
    { ...base, buscarDestino: async () => ({ email: "k@x.com", clienteNome: "Maria" }), enviar: async (to, s, h) => ((enviado = { to, s, h }), { ok: true, error: null }) },
    "caso-1",
  );
  assert.deepEqual(enviado.to, ["k@x.com"]);
  assert.ok(enviado.h.includes("https://site/processos/caso-1"));
});

test("falha do Resend não derruba o envio do formulário", async () => {
  await avisarEnvio({ ...base, buscarDestino: async () => ({ email: "k@x.com", clienteNome: "M" }), enviar: async () => ({ ok: false, error: "sem chave" }) }, "c");
  await avisarEnvio({ ...base, buscarDestino: async () => ({ email: "k@x.com", clienteNome: "M" }), enviar: async () => { throw new Error("rede"); } }, "c");
  await avisarEnvio({ ...base, buscarDestino: async () => { throw new Error("banco"); }, enviar: async () => ({ ok: true, error: null }) }, "c");
});

test("sem e-mail da consultora: não envia nada", async () => {
  let chamou = false;
  await avisarEnvio({ ...base, buscarDestino: async () => ({ email: null, clienteNome: "M" }), enviar: async () => ((chamou = true), { ok: true, error: null }) }, "c");
  assert.equal(chamou, false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:unit`
Expected: FAIL (`notify.ts` não existe).

- [ ] **Step 3: Implementar `notify.ts`**

```ts
// lib/case-forms/notify.ts
// Aviso à equipe quando o cliente envia o formulário. Sem imports com alias
// (testável); a ligação com Supabase e Resend fica em notify-server.ts.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSubmittedEmail({ clienteNome, link }: { clienteNome: string; link: string }) {
  const nomeLinha = clienteNome.replace(/[\r\n]+/g, " ").trim();
  return {
    subject: `Formulário enviado: ${nomeLinha}`,
    html: `<p>O cliente <strong>${escapeHtml(nomeLinha)}</strong> enviou o formulário de dados.</p><p><a href="${escapeHtml(link)}">Abrir o processo no Hub</a></p>`,
  };
}

export type DepsAviso = {
  buscarDestino: (caseId: string) => Promise<{ email: string | null; clienteNome: string } | null>;
  enviar: (to: string[], subject: string, html: string) => Promise<{ ok: boolean; error: string | null }>;
  siteUrl: string;
};

/** Nunca lança: o envio do formulário pelo cliente não pode depender do e-mail. */
export async function avisarEnvio(deps: DepsAviso, caseId: string): Promise<void> {
  try {
    const destino = await deps.buscarDestino(caseId);
    if (!destino?.email) return;
    const { subject, html } = buildSubmittedEmail({
      clienteNome: destino.clienteNome,
      link: `${deps.siteUrl}/processos/${caseId}`,
    });
    const r = await deps.enviar([destino.email], subject, html);
    if (!r.ok) console.error("[avisarEnvio] e-mail não enviado:", r.error);
  } catch (e) {
    console.error("[avisarEnvio] falhou:", e instanceof Error ? e.message : "erro desconhecido");
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Ligar ao Supabase/Resend e chamar no envio**

```ts
// lib/case-forms/notify-server.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/storage-admin/email";
import { avisarEnvio } from "./notify";

export async function notifyFormSubmitted(caseId: string): Promise<void> {
  await avisarEnvio(
    {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      enviar: sendEmail,
      buscarDestino: async (id) => {
        const admin = createAdminClient();
        const { data: c } = await admin
          .from("cases")
          .select("consultor_id, clients(nome)")
          .eq("id", id)
          .single();
        if (!c) return null;
        const { data: u } = await admin.auth.admin.getUserById(c.consultor_id as string);
        const cliente = (c as { clients?: { nome: string } | null }).clients;
        return { email: u.user?.email ?? null, clienteNome: cliente?.nome ?? "Cliente" };
      },
    },
    caseId,
  );
}
```

Em `app/(portal)/portal/formulario/actions.ts`, importar `notifyFormSubmitted` e, no bloco `enviar`, logo depois do `update(... status: "enviado" ...)`:

```ts
    await notifyFormSubmitted(caseId);
```

- [ ] **Step 6: Verificar e commit**

Run: `npx eslint lib/case-forms "app/(portal)" && npm run test:unit`
Expected: sem erros e PASS. Verificação manual (precisa do `RESEND_API_KEY` no `.env.local` e de um cliente de teste): enviar o formulário completo → a consultora do processo recebe o e-mail; sem a chave, o formulário envia normalmente e o servidor registra "e-mail não enviado".

```bash
git add lib/case-forms "app/(portal)/portal/formulario/actions.ts" tests/unit/notify.test.mjs
git commit -m "Aviso por e-mail à consultora quando o cliente envia o formulário

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Card "Formulários" na tela Início

**Files:**
- Create: `lib/case-forms/overview.ts` (puro)
- Create: `lib/case-forms/overview-server.ts`
- Create: `app/(staff)/inicio/_components/forms-overview-card.tsx`
- Modify: `app/(staff)/inicio/page.tsx`
- Test: `tests/unit/overview.test.mjs`

**Interfaces:**
- Produces: `contarFormularios(rows: LinhaProcesso[]): { aguardando: number; enviados: number }` e `getFormsOverview(): Promise<{ aguardando: number; enviados: number }>`.

- [ ] **Step 1: Escrever o teste (falha)**

```js
// tests/unit/overview.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { contarFormularios } from "../../lib/case-forms/overview.ts";

const comModelo = { case_form_template_id: "t1" };

test("conta aguardando (sem formulário ou em preenchimento) e enviados", () => {
  const r = contarFormularios([
    { service_types: comModelo, case_forms: [] },
    { service_types: comModelo, case_forms: [{ status: "em_preenchimento" }] },
    { service_types: comModelo, case_forms: [{ status: "enviado" }] },
    { service_types: comModelo, case_forms: [{ status: "aprovado" }] },
  ]);
  assert.deepEqual(r, { aguardando: 2, enviados: 1 });
});

test("processo de tipo sem formulário não conta", () => {
  assert.deepEqual(
    contarFormularios([{ service_types: { case_form_template_id: null }, case_forms: [] }, { service_types: null, case_forms: [] }]),
    { aguardando: 0, enviados: 0 },
  );
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:unit`
Expected: FAIL (`overview.ts` não existe).

- [ ] **Step 3: Implementar**

```ts
// lib/case-forms/overview.ts
export type LinhaProcesso = {
  service_types: { case_form_template_id: string | null } | null;
  case_forms: { status: string }[];
};

export function contarFormularios(rows: LinhaProcesso[]): { aguardando: number; enviados: number } {
  let aguardando = 0;
  let enviados = 0;
  for (const r of rows) {
    if (!r.service_types?.case_form_template_id) continue;
    const f = r.case_forms[0];
    if (!f || f.status === "em_preenchimento") aguardando++;
    else if (f.status === "enviado") enviados++;
  }
  return { aguardando, enviados };
}
```

```ts
// lib/case-forms/overview-server.ts
import { createClient } from "@/lib/supabase/server";
import { contarFormularios, type LinhaProcesso } from "./overview";

export async function getFormsOverview() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cases")
    .select("id, service_types!cases_service_type_id_fkey(case_form_template_id), case_forms(status)")
    .eq("status", "ativo");
  return contarFormularios((data ?? []) as unknown as LinhaProcesso[]);
}
```

```tsx
// app/(staff)/inicio/_components/forms-overview-card.tsx
import Link from "next/link";

export function FormsOverviewCard({ aguardando, enviados }: { aguardando: number; enviados: number }) {
  return (
    <div className="rounded-lg bg-kmp-surface p-5 shadow-sm">
      <h2 className="font-heading text-base text-kmp-text">Formulários dos clientes</h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-kmp-text/60">Aguardando o cliente</dt>
          <dd className="text-2xl font-semibold text-kmp-text">{aguardando}</dd>
        </div>
        <div>
          <dt className="text-xs text-kmp-text/60">Enviados para revisar</dt>
          <dd className="text-2xl font-semibold text-kmp-orange">{enviados}</dd>
        </div>
      </dl>
      <Link href="/processos" className="mt-3 inline-block text-xs text-kmp-text/60 underline hover:text-kmp-orange">
        Ver processos
      </Link>
    </div>
  );
}
```

Em `app/(staff)/inicio/page.tsx`: importar `getFormsOverview` e `FormsOverviewCard`; incluir `getFormsOverview()` no `Promise.all` existente (guardando em `formsOverview`) e renderizar `<FormsOverviewCard {...formsOverview} />` ao lado do `<GoogleDaySummaryCard ... />`.

- [ ] **Step 4: Rodar e verificar**

Run: `npm run test:unit && npx eslint lib/case-forms "app/(staff)/inicio" && npx tsc --noEmit 2>&1 | grep -E "inicio|case-forms/overview" || echo "tipos ok"`
Expected: PASS e sem erros. Manual: abrir `/inicio` → o card mostra os números (hoje, 1 processo aguardando).

- [ ] **Step 5: Commit**

```bash
git add lib/case-forms/overview.ts lib/case-forms/overview-server.ts "app/(staff)/inicio" tests/unit/overview.test.mjs
git commit -m "Início: card com formulários aguardando o cliente e enviados para revisar

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Prova de ponta a ponta, documentação e fechamento

**Files:**
- Modify: `CLAUDE.md` (seção do formulário e da extensão)
- Modify: `docs/superpowers/specs/2026-10-14-formulario-visto-600-completo-design.md` (estado: implementado)

- [ ] **Step 1: Rodar tudo**

Run: `npm run test:unit && npm run test:extension && npm run lint && npm run build`
Expected: todos os testes PASS, lint sem erro novo e build completo.

- [ ] **Step 2: Cliente novo, do convite ao ImmiAccount (verificação manual com a Keila)**

1. Criar um cliente de teste com e-mail que a Keila abra e um processo "Tourist Visa — Subclass 600".
2. No perfil, convidar para o portal; entrar pelo link recebido.
3. Preencher o formulário **clicando em Próximo sem preencher os obrigatórios** em pelo menos uma etapa: deve avançar. Na última etapa clicar em **Enviar formulário**: deve listar o que falta, com links para as etapas. Completar e enviar.
4. Conferir: a consultora recebeu o e-mail de aviso; o card "Formulários" do Início passou de "aguardando" para "enviados"; o card do processo mostra as respostas e o "Editar respostas" corrige um campo.
5. Carregar o cliente na extensão e passar as páginas 2 a 6, 9, 11, 12, 16, 17 e 18 de uma aplicação nova no ImmiAccount (parar antes do Submit): anotar qualquer campo vazio ou errado.

- [ ] **Step 3: Patricia, as 20 páginas**

Reenviar o PDF da Patricia pelo card (completa o que faltar), recarregar o cliente na extensão e passar as 20 páginas, anotando campos vazios ou errados. As páginas 10, 13, 14, 15 e 19 só aparecem em alguns casos: se aparecerem, salvar a estrutura (`pbpaste | python3 scripts/immi-page-skeleton.py`) e abrir um item novo.

- [ ] **Step 4: Atualizar a documentação**

No `CLAUDE.md`, na seção "Preenchimento do formulário de visto", substituir a lista de cobertura pela atual (páginas 2 a 6, 9, 11, 12, 16, 17 e 18 preenchidas; 1, 7, 8 manual/sob regras, 20 sempre manual) e acrescentar um parágrafo "Formulário 600 completo (out/2026)": 35 perguntas novas, validação só no envio, edição pela equipe, aviso por e-mail, card no Início, testes (`npm run test:unit`, `npm run test:extension`) e os dois scripts incrementais (`add-visa-600-fields.mjs`, `adjust-visa-600-form.mjs`). No desenho, trocar `Estado: aguardando revisão da Keila` por `Estado: implementado (ver plano)`.

- [ ] **Step 5: Commit e entrega**

```bash
git add CLAUDE.md docs
git commit -m "Documenta o formulário 600 completo e a cobertura da extensão

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Entregar à Keila: lista dos commits locais, o resultado do Step 2 e do Step 3, e o comando `git push origin main` para ela decidir quando publicar no portal oficial. **Não executar o push.**
