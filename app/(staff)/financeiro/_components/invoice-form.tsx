"use client";

import { useActionState, useMemo, useState } from "react";
import type { Case, ServiceType } from "@/lib/cases/types";
import type { Client } from "@/lib/clients/types";
import {
  DEFAULT_PAYID,
  DEFAULT_PIX,
  GST_RATE,
  INVOICE_CURRENCIES,
  INVOICE_PAYMENT_METHODS,
  SERVICO_REFERENTE_OPTIONS,
} from "@/lib/invoices/constants";
import { createQuickClient } from "../actions";
import type { InvoiceFormState } from "../actions";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

type ItemRow = { descricao: string; quantidade: string; valor_unitario: string };

function emptyItem(): ItemRow {
  return { descricao: "", quantidade: "1", valor_unitario: "" };
}

function formatMoeda(value: number, moeda: string): string {
  const locale = moeda === "BRL" ? "pt-BR" : "en-AU";
  const prefix = moeda === "BRL" ? "R$ " : "AUD $";
  return prefix + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoiceForm({
  action,
  invoice,
  clients,
  cases,
  serviceTypes,
}: {
  action: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  invoice?: InvoiceWithItems;
  clients: Client[];
  cases: Case[];
  serviceTypes: ServiceType[];
}) {
  const initialState: InvoiceFormState = { error: null };
  const [state, formAction, pending] = useActionState(action, initialState);

  const [clientsList, setClientsList] = useState(clients);
  const [clientId, setClientId] = useState(invoice?.client_id ?? "");
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteEmail, setNovoClienteEmail] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");
  const [novoClienteErro, setNovoClienteErro] = useState<string | null>(null);
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [moeda, setMoeda] = useState(invoice?.moeda ?? "AUD");
  const [descontoTipo, setDescontoTipo] = useState(invoice?.desconto_tipo ?? "none");
  const [descontoValor, setDescontoValor] = useState(String(invoice?.desconto_valor ?? 0));
  const [gstIncluido, setGstIncluido] = useState(invoice?.gst_incluido ?? false);
  const [formaPagamento, setFormaPagamento] = useState(invoice?.forma_pagamento ?? "payid");
  const servicoJaConhecido =
    !invoice?.servico_referente ||
    (SERVICO_REFERENTE_OPTIONS as readonly string[]).includes(invoice.servico_referente);
  const [servicoOpcao, setServicoOpcao] = useState(
    invoice?.servico_referente && servicoJaConhecido ? invoice.servico_referente : "Outro",
  );
  const [servicoOutro, setServicoOutro] = useState(
    invoice?.servico_referente && !servicoJaConhecido ? invoice.servico_referente : "",
  );
  const [items, setItems] = useState<ItemRow[]>(
    invoice && invoice.items.length > 0
      ? invoice.items.map((item) => ({
          descricao: item.descricao,
          quantidade: String(item.quantidade),
          valor_unitario: String(item.valor_unitario),
        }))
      : [emptyItem()],
  );

  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "Sem tipo de serviço";
  const casesDoCliente = useMemo(
    () => cases.filter((c) => c.client_id === clientId),
    [cases, clientId],
  );

  const totals = useMemo(() => {
    const bruto = items.reduce((acc, item) => {
      const qtd = Number(item.quantidade) || 0;
      const unit = Number(item.valor_unitario) || 0;
      return acc + qtd * unit;
    }, 0);
    const desconto =
      descontoTipo === "value"
        ? Number(descontoValor) || 0
        : descontoTipo === "percent"
          ? bruto * ((Number(descontoValor) || 0) / 100)
          : 0;
    const subtotal = Math.max(bruto - desconto, 0);
    const gstValor = gstIncluido ? subtotal * GST_RATE : 0;
    return { subtotal, gstValor, total: subtotal + gstValor };
  }, [items, descontoTipo, descontoValor, gstIncluido]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleCriarCliente() {
    setCriandoCliente(true);
    setNovoClienteErro(null);
    const result = await createQuickClient(novoClienteNome, novoClienteEmail, novoClienteTelefone);
    setCriandoCliente(false);
    if (result.error || !result.client) {
      setNovoClienteErro(result.error ?? "Não foi possível criar o cliente.");
      return;
    }
    setClientsList((prev) =>
      [...prev, result.client as Client].sort((a, b) => a.nome.localeCompare(b.nome)),
    );
    setClientId(result.client.id);
    setShowNovoCliente(false);
    setNovoClienteNome("");
    setNovoClienteEmail("");
    setNovoClienteTelefone("");
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Fatura</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="client_id" className={labelClass}>
                Cliente *
              </label>
              <button
                type="button"
                onClick={() => setShowNovoCliente((prev) => !prev)}
                className="text-xs font-medium text-kmp-orange hover:underline"
              >
                {showNovoCliente ? "Cancelar" : "+ Novo cliente"}
              </button>
            </div>
            <select
              id="client_id"
              name="client_id"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione um cliente</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            {showNovoCliente ? (
              <div className="mt-2 space-y-2 rounded-md border border-black/10 bg-black/5 p-3">
                <input
                  type="text"
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  placeholder="Nome do cliente *"
                  className={inputClass + " mt-0"}
                />
                <input
                  type="email"
                  value={novoClienteEmail}
                  onChange={(e) => setNovoClienteEmail(e.target.value)}
                  placeholder="E-mail (opcional)"
                  className={inputClass + " mt-0"}
                />
                <input
                  type="text"
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(e.target.value)}
                  placeholder="Telefone (opcional)"
                  className={inputClass + " mt-0"}
                />
                {novoClienteErro ? (
                  <p className="text-xs text-red-600">{novoClienteErro}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleCriarCliente}
                  disabled={criandoCliente || !novoClienteNome.trim()}
                  className="rounded-md bg-kmp-orange px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {criandoCliente ? "Criando…" : "Criar cliente"}
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <label htmlFor="case_id" className={labelClass}>
              Processo (opcional)
            </label>
            <select
              id="case_id"
              name="case_id"
              defaultValue={invoice?.case_id ?? ""}
              disabled={!clientId}
              className={inputClass}
            >
              <option value="">Nenhum processo específico</option>
              {casesDoCliente.map((c) => (
                <option key={c.id} value={c.id}>
                  {serviceTypeName(c.service_type_id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="moeda" className={labelClass}>
              Moeda
            </label>
            <select
              id="moeda"
              name="moeda"
              value={moeda}
              onChange={(e) => setMoeda(e.target.value as typeof moeda)}
              className={inputClass}
            >
              {INVOICE_CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="servico_referente_opcao" className={labelClass}>
              Serviço referente
            </label>
            <select
              id="servico_referente_opcao"
              value={servicoOpcao}
              onChange={(e) => setServicoOpcao(e.target.value)}
              className={inputClass}
            >
              {SERVICO_REFERENTE_OPTIONS.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </select>
            {servicoOpcao === "Outro" ? (
              <input
                id="servico_referente"
                name="servico_referente"
                type="text"
                value={servicoOutro}
                onChange={(e) => setServicoOutro(e.target.value)}
                placeholder="Ex: Subclass 485 Post Higher Education"
                className={inputClass}
              />
            ) : (
              <input type="hidden" name="servico_referente" value={servicoOpcao} />
            )}
          </div>
          <div>
            <label htmlFor="data_emissao" className={labelClass}>
              Data de emissão
            </label>
            <input
              id="data_emissao"
              name="data_emissao"
              type="date"
              defaultValue={invoice?.data_emissao ?? new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="data_vencimento" className={labelClass}>
              Data de vencimento
            </label>
            <input
              id="data_vencimento"
              name="data_vencimento"
              type="date"
              defaultValue={invoice?.data_vencimento ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Itens do serviço</h2>
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
              <input
                type="text"
                value={item.descricao}
                onChange={(e) => updateItem(index, { descricao: e.target.value })}
                placeholder="Ex: Taxa de Serviço KMP Consulting"
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                step="1"
                value={item.quantidade}
                onChange={(e) => updateItem(index, { quantidade: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.valor_unitario}
                onChange={(e) => updateItem(index, { valor_unitario: e.target.value })}
                placeholder="0.00"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                aria-label="Remover item"
                className="mt-1 rounded-md border border-black/10 px-3 text-kmp-alert-deep transition hover:bg-kmp-alert/10 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mt-3 rounded-md border border-dashed border-kmp-orange/50 bg-kmp-orange/5 px-4 py-2 text-sm font-medium text-kmp-orange-deep transition hover:bg-kmp-orange/10"
        >
          + Adicionar item
        </button>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Desconto e GST</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="desconto_tipo" className={labelClass}>
              Tipo de desconto
            </label>
            <select
              id="desconto_tipo"
              name="desconto_tipo"
              value={descontoTipo}
              onChange={(e) => setDescontoTipo(e.target.value as typeof descontoTipo)}
              className={inputClass}
            >
              <option value="none">Sem desconto</option>
              <option value="value">Valor fixo</option>
              <option value="percent">Percentual</option>
            </select>
          </div>
          <div>
            <label htmlFor="desconto_valor" className={labelClass}>
              Valor do desconto
            </label>
            <input
              id="desconto_valor"
              name="desconto_valor"
              type="number"
              min="0"
              step="0.01"
              value={descontoValor}
              onChange={(e) => setDescontoValor(e.target.value)}
              disabled={descontoTipo === "none"}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-kmp-graphite">
              <input
                type="checkbox"
                name="gst_incluido"
                checked={gstIncluido}
                onChange={(e) => setGstIncluido(e.target.checked)}
                className="h-4 w-4 rounded border-black/20 text-kmp-orange focus:ring-kmp-orange"
              />
              Incluir GST (10%)
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-black/5 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-kmp-graphite/60">Subtotal</span>
            <span>{formatMoeda(totals.subtotal, moeda)}</span>
          </div>
          {totals.gstValor > 0 ? (
            <div className="flex justify-between">
              <span className="text-kmp-graphite/60">GST (10%)</span>
              <span>{formatMoeda(totals.gstValor, moeda)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-black/10 pt-1 font-heading text-lg font-extrabold text-kmp-orange-deep">
            <span>Total</span>
            <span>{formatMoeda(totals.total, moeda)}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Forma de pagamento</h2>
        <div className="mt-4 flex gap-2">
          {INVOICE_PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setFormaPagamento(m.value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                formaPagamento === m.value
                  ? "border-kmp-orange bg-kmp-orange text-white"
                  : "border-black/10 text-kmp-graphite hover:border-kmp-orange"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="forma_pagamento" value={formaPagamento} />

        {formaPagamento === "payid" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="payid_valor" className={labelClass}>
                PayID
              </label>
              <input
                id="payid_valor"
                name="payid_valor"
                type="text"
                defaultValue={invoice?.payid_valor ?? DEFAULT_PAYID.valor}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="payid_titular" className={labelClass}>
                Nome do titular
              </label>
              <input
                id="payid_titular"
                name="payid_titular"
                type="text"
                defaultValue={invoice?.payid_titular ?? DEFAULT_PAYID.titular}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="payid_bsb" className={labelClass}>
                BSB
              </label>
              <input
                id="payid_bsb"
                name="payid_bsb"
                type="text"
                defaultValue={invoice?.payid_bsb ?? DEFAULT_PAYID.bsb}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="payid_conta" className={labelClass}>
                Conta
              </label>
              <input
                id="payid_conta"
                name="payid_conta"
                type="text"
                defaultValue={invoice?.payid_conta ?? DEFAULT_PAYID.conta}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pix_chave" className={labelClass}>
                Chave PIX
              </label>
              <input
                id="pix_chave"
                name="pix_chave"
                type="text"
                defaultValue={invoice?.pix_chave ?? DEFAULT_PIX.chave}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="pix_titular" className={labelClass}>
                Nome do titular
              </label>
              <input
                id="pix_titular"
                name="pix_titular"
                type="text"
                defaultValue={invoice?.pix_titular ?? DEFAULT_PIX.titular}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </section>

      <section>
        <label htmlFor="observacoes" className={labelClass}>
          Observações (aparece na invoice)
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={invoice?.observacoes ?? ""}
          placeholder="Ex: Pagamento referente à primeira parcela do serviço."
          className={inputClass}
        />
      </section>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : invoice ? "Salvar alterações" : "Criar invoice"}
      </button>
    </form>
  );
}
