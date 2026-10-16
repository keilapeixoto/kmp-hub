"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FileUp } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import {
  lerCartaVisto,
  salvarCartaVisto,
  type LeituraState,
  type SalvarCartaState,
} from "../carta-actions";

// Importar carta de visto (grant notice ou VEVO): lê o PDF, mostra os dados
// para conferir e só grava depois da confirmação. O PDF não é guardado.

const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const rotulo = "mb-1 block text-xs font-semibold text-kmp-text/70";

const leituraInicial: LeituraState = { erro: null, carta: null, candidatos: [] };
const salvarInicial: SalvarCartaState = { erro: null, clienteId: null, nome: null };

function dataBr(iso: string | null) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

export function ImportarCarta() {
  // Trocar a chave recomeça o componente do zero ("Importar outra carta").
  const [versao, setVersao] = useState(0);
  return <ImportarCartaEtapas key={versao} reiniciar={() => setVersao((v) => v + 1)} />;
}

function ImportarCartaEtapas({ reiniciar }: { reiniciar: () => void }) {
  const [leitura, ler, lendo] = useActionState(lerCartaVisto, leituraInicial);
  const [salvo, salvar, salvando] = useActionState(salvarCartaVisto, salvarInicial);
  const carta = leitura.carta;

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo titulo="Importar carta do visto" cor="azul" icon={FileUp} />
      <p className="mb-3 text-sm text-kmp-text/70">
        Envie o PDF da carta de concessão (grant notice) ou da consulta VEVO. O Hub lê nome, subclasse e
        vencimento, você confere e escolhe o cliente (ou cria um novo). O PDF não fica guardado.
      </p>

      <form action={ler} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="carta"
          accept="application/pdf,.pdf"
          required
          aria-label="PDF da carta do visto"
          className="min-w-0 flex-1 text-sm text-kmp-text/70"
        />
        <button
          type="submit"
          disabled={lendo}
          className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {lendo ? "Lendo…" : "Ler carta"}
        </button>
      </form>
      {leitura.erro ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{leitura.erro}</p> : null}

      {salvo.clienteId && !salvo.erro ? (
        <p className="mt-3 rounded-2xl bg-[#dcf3e7] p-3 text-sm text-[#16673f] dark:bg-[#45c285]/20 dark:text-[#a9e6c7]">
          Visto salvo em{" "}
          <Link href={`/clientes/${salvo.clienteId}`} className="font-semibold underline">
            {salvo.nome}
          </Link>
          . Ele já aparece no radar abaixo.{" "}
          <button type="button" onClick={reiniciar} className="font-semibold underline">
            Importar outra carta
          </button>
        </p>
      ) : null}

      {carta && !(salvo.clienteId && !salvo.erro) ? (
        <form action={salvar} className="mt-4 space-y-3 rounded-2xl bg-kmp-text/5 p-4">
          <p className="text-sm font-semibold text-kmp-text">
            {carta.tipo === "vevo" ? "Consulta VEVO" : carta.tipo === "grant" ? "Carta de concessão" : "Documento"} lido.
            Confira antes de salvar:
          </p>
          {carta.avisos.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-[#8f3f07] dark:text-[#f9c39b]">
              {carta.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="carta-nome" className={rotulo}>Nome</label>
              <input id="carta-nome" name="nome" defaultValue={carta.nome ?? ""} className={campo} />
            </div>
            <div>
              <label htmlFor="carta-nasc" className={rotulo}>Data de nascimento</label>
              <input id="carta-nasc" name="data_nascimento" type="date" defaultValue={carta.dataNascimento ?? ""} className={campo} />
            </div>
            <div>
              <label htmlFor="carta-sub" className={rotulo}>Subclasse do visto</label>
              <input id="carta-sub" name="subclasse" required defaultValue={carta.subclasse ?? ""} className={campo} />
            </div>
            <div>
              <label htmlFor="carta-venc" className={rotulo}>
                {carta.permanente ? "Vencimento da autorização de viagem" : "Vencimento do visto"}
              </label>
              <input
                id="carta-venc"
                name="validade"
                type="date"
                defaultValue={carta.validadeSugerida ?? ""}
                className={campo}
              />
              <p className="mt-1 text-xs text-kmp-text/60">
                {carta.permanente
                  ? "Visto permanente não vence; esta é a data da autorização de viagem (travel facility), que entra no radar."
                  : carta.ponte
                    ? "Bridging visa não tem data: pode deixar em branco."
                    : !carta.dataVencimento && carta.permanenciaAte
                      ? "Preenchido com o \"stay until\" da carta."
                      : !carta.dataVencimento && carta.entradaAte
                        ? "Preenchido com o \"Must not arrive after\" (validade do visto; cada estadia tem o limite da carta)."
                        : "Em branco, o cliente vai para \"Sem data\" no radar."}
              </p>
            </div>
          </div>
          <p className="text-xs text-kmp-text/60">
            Concessão: {dataBr(carta.dataConcessao)}
            {carta.stream ? ` · Stream: ${carta.stream}` : ""}
            {carta.ponte
              ? ` · Bridging ${carta.ponte}${carta.aplicacaoSubclasse ? `, ligado à aplicação do ${carta.aplicacaoSubclasse}` : ""}`
              : ""}
            {carta.permanente ? " · Visto permanente" : ""}
            {carta.passaporte ? " · Passaporte encontrado na carta" : ""}
          </p>

          <fieldset>
            <legend className={rotulo}>Cliente</legend>
            <div className="space-y-1">
              {leitura.candidatos.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-kmp-text">
                  <input type="radio" name="cliente" value={c.id} required />
                  {c.nome}
                  <span className="text-xs text-kmp-text/50">
                    {c.data_nascimento ? `nasc. ${dataBr(c.data_nascimento)}` : ""}
                    {c.data_nascimento && c.data_nascimento === carta.dataNascimento ? " · mesma data de nascimento" : ""}
                    {c.visto_atual_subclasse ? ` · visto atual ${c.visto_atual_subclasse}` : ""}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm font-semibold text-kmp-text">
                <input type="radio" name="cliente" value="novo" required defaultChecked={leitura.candidatos.length === 0} />
                Criar cliente novo com esses dados
              </label>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar visto"}
            </button>
            {salvo.erro ? <span className="text-sm text-red-600 dark:text-red-400">{salvo.erro}</span> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
