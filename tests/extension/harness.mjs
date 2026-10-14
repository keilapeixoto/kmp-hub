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
