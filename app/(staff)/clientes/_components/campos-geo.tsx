"use client";

import { useState } from "react";
import { ESTADOS, codigoDoPais, type Endereco, type Fuso, type Pais } from "@/lib/geo";

// Campos de escolher (país, nacionalidade, fuso, endereço) do cadastro do cliente.

const inputClass =
  "mt-1 w-full rounded-md border border-kmp-divider px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-text";

export function PaisSelect({
  id,
  name,
  valor,
  paises,
  vazio = "Escolha o país",
}: {
  id: string;
  name: string;
  valor: string | null | undefined;
  paises: Pais[];
  vazio?: string;
}) {
  // Valor antigo que não está na lista (ex.: "Brasileira") continua aparecendo.
  const naLista = !valor || paises.some((p) => p.nome === valor);
  return (
    <select id={id} name={name} defaultValue={valor ?? ""} className={inputClass}>
      <option value="">{vazio}</option>
      {!naLista ? <option value={valor!}>{valor} (cadastro antigo)</option> : null}
      {paises.map((p) => (
        <option key={p.codigo} value={p.nome}>
          {p.nome}
        </option>
      ))}
    </select>
  );
}

export function FusoSelect({ valor, fusos }: { valor: string | null | undefined; fusos: Fuso[] }) {
  const regioes = [...new Set(fusos.map((f) => f.regiao))];
  const principais = ["America/Sao_Paulo", "Australia/Sydney", "Australia/Brisbane", "Australia/Melbourne", "Australia/Perth"];
  const naLista = !valor || fusos.some((f) => f.id === valor);
  return (
    <select id="fuso_horario" name="fuso_horario" defaultValue={valor ?? ""} className={inputClass}>
      <option value="">Escolha o fuso</option>
      {!naLista ? <option value={valor!}>{valor}</option> : null}
      <optgroup label="Mais usados">
        {fusos
          .filter((f) => principais.includes(f.id))
          .map((f) => (
            <option key={`p-${f.id}`} value={f.id}>
              {f.id.replace(/_/g, " ")} ({f.rotulo.split("(").pop()}
            </option>
          ))}
      </optgroup>
      {regioes.map((r) => (
        <optgroup key={r} label={r}>
          {fusos
            .filter((f) => f.regiao === r)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.rotulo}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Endereço em campos separados; o estado vira lista para Austrália e Brasil. */
export function EnderecoCampos({
  name,
  titulo,
  inicial,
  paises,
  paisFixo,
}: {
  name: string;
  titulo: string;
  inicial: Endereco;
  paises: Pais[];
  /** Ex.: "Austrália" no endereço na Austrália. */
  paisFixo?: string;
}) {
  const [e, setE] = useState<Endereco>({ ...inicial, pais: paisFixo ?? inicial.pais });
  const muda = (campo: keyof Endereco) => (ev: { target: { value: string } }) =>
    setE((atual) => ({ ...atual, [campo]: ev.target.value || null, ...(campo === "pais" ? { estado: null } : {}) }));
  const codigo = codigoDoPais(e.pais);
  const estados = codigo ? ESTADOS[codigo] : undefined;
  const br = codigo === "BR";
  const vazio = Object.values({ ...e, pais: null }).every((v) => !v);

  return (
    <fieldset className="rounded-2xl border border-kmp-divider p-4">
      <legend className="px-1 text-sm font-medium text-kmp-text">{titulo}</legend>
      <input type="hidden" name={name} value={vazio ? "" : JSON.stringify(e)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        {!paisFixo ? (
          <div className="sm:col-span-3">
            <label className={labelClass}>País</label>
            <select value={e.pais ?? ""} onChange={muda("pais")} className={inputClass}>
              <option value="">Escolha o país</option>
              {e.pais && !paises.some((p) => p.nome === e.pais) ? <option value={e.pais}>{e.pais}</option> : null}
              {paises.map((p) => (
                <option key={p.codigo} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="sm:col-span-3">
          <label className={labelClass}>{br ? "Estado" : "Estado / território"}</label>
          {estados ? (
            <select value={e.estado ?? ""} onChange={muda("estado")} className={inputClass}>
              <option value="">Escolha</option>
              {estados.map((s) => (
                <option key={s.sigla} value={s.sigla}>
                  {s.sigla} — {s.nome}
                </option>
              ))}
            </select>
          ) : (
            <input value={e.estado ?? ""} onChange={muda("estado")} className={inputClass} />
          )}
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>{br ? "Cidade" : "Cidade / suburb"}</label>
          <input value={e.cidade ?? ""} onChange={muda("cidade")} className={inputClass} />
        </div>
        {br ? (
          <div className="sm:col-span-3">
            <label className={labelClass}>Bairro</label>
            <input value={e.bairro ?? ""} onChange={muda("bairro")} className={inputClass} />
          </div>
        ) : null}
        <div className="sm:col-span-4">
          <label className={labelClass}>{br ? "Rua" : "Rua / street"}</label>
          <input value={e.rua ?? ""} onChange={muda("rua")} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Número</label>
          <input value={e.numero ?? ""} onChange={muda("numero")} className={inputClass} />
        </div>
        <div className="sm:col-span-4">
          <label className={labelClass}>Complemento</label>
          <input
            value={e.complemento ?? ""}
            onChange={muda("complemento")}
            placeholder={br ? "Apto, bloco" : "Unit, level"}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>{br ? "CEP" : codigo === "AU" ? "Postcode" : "CEP / código postal"}</label>
          <input value={e.cep ?? ""} onChange={muda("cep")} className={inputClass} />
        </div>
      </div>
    </fieldset>
  );
}
