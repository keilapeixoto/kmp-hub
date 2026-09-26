import { Cormorant_Garamond, Outfit } from "next/font/google";
import type { Client } from "@/lib/clients/types";
import type { InvoiceWithItems } from "@/lib/invoices/types";

// Fonte própria da invoice — PDFs/documentos continuam em Cormorant
// Garamond + Outfit mesmo depois do redesign da interface pra Plus Jakarta
// Sans (ver "Identidade visual KMP" no CLAUDE.md). Não usar font-heading/
// font-body do tema aqui: essas classes agora resolvem pra Plus Jakarta Sans.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-invoice-heading",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-invoice-body",
});

const headingStyle = { fontFamily: "var(--font-invoice-heading)" };

function formatMoeda(value: number, moeda: string): string {
  const locale = moeda === "BRL" ? "pt-BR" : "en-AU";
  const prefix = moeda === "BRL" ? "R$ " : "AUD $";
  return prefix + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function InvoiceDocument({
  invoice,
  client,
}: {
  invoice: InvoiceWithItems;
  client: Client | null;
}) {
  return (
    <div
      className={`${cormorant.variable} ${outfit.variable} mx-auto flex w-full max-w-[720px] flex-col bg-white text-kmp-graphite shadow-sm`}
      style={{ fontFamily: "var(--font-invoice-body)" }}
    >
      {/* Gradiente e cores com opacidade em hex fixo (não classes tw com "/"):
          o html2canvas que gera o PDF não entende as funções color-mix()/
          linear-gradient(in oklab, ...) que o Tailwind v4 gera pra elas, e
          isso quebra a exportação com "Erro ao gerar PDF". */}
      <div
        className="flex items-start justify-between gap-4 px-8 py-6 text-white"
        style={{ backgroundImage: "linear-gradient(135deg, #F27B20, #C85A0E)" }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- precisa
              ser <img> simples: o html2canvas do PDF captura um clone fora
              da tela, e next/image atrapalharia esse fluxo. */}
          <img src="/kmp-logo.png" alt="KMP Consulting" className="h-9 w-auto" />
          <p className="mt-1.5 text-[11px] font-light opacity-90">
            Estratégia que conecta. Futuro que transforma.
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold" style={headingStyle}>
            Invoice
          </h1>
          <p className="mt-1 text-xs opacity-90">Nº {invoice.numero}</p>
        </div>
      </div>

      <div className="flex-1 px-8 py-7">
        <div className="mb-6 flex flex-wrap justify-between gap-4 text-sm">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-kmp-orange-deep">
              Cobrado a
            </p>
            <p>{client?.nome ?? "—"}</p>
            <p>{client?.email ?? ""}</p>
            <p>{client?.telefone ?? ""}</p>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-kmp-orange-deep">
              Detalhes
            </p>
            <p>Emissão: {formatData(invoice.data_emissao)}</p>
            <p>Vencimento: {formatData(invoice.data_vencimento)}</p>
            <p>Serviço: {invoice.servico_referente ?? "—"}</p>
          </div>
        </div>

        <table className="mb-4 w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="border-b-2 border-[#f27b2033] pb-2 text-left text-[11px] font-medium uppercase tracking-wide text-[#2c2c2c80]">
                Descrição
              </th>
              <th className="border-b-2 border-[#f27b2033] pb-2 text-right text-[11px] font-medium uppercase tracking-wide text-[#2c2c2c80]">
                Qtd
              </th>
              <th className="border-b-2 border-[#f27b2033] pb-2 text-right text-[11px] font-medium uppercase tracking-wide text-[#2c2c2c80]">
                Valor unit.
              </th>
              <th className="border-b-2 border-[#f27b2033] pb-2 text-right text-[11px] font-medium uppercase tracking-wide text-[#2c2c2c80]">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="border-b border-[#0000000d] py-2 align-top">{item.descricao}</td>
                <td className="border-b border-[#0000000d] py-2 text-right align-top">
                  {item.quantidade}
                </td>
                <td className="border-b border-[#0000000d] py-2 text-right align-top">
                  {formatMoeda(item.valor_unitario, invoice.moeda)}
                </td>
                <td className="border-b border-[#0000000d] py-2 text-right align-top">
                  {formatMoeda(item.quantidade * item.valor_unitario, invoice.moeda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-64 text-[13.5px]">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>{formatMoeda(invoice.subtotal, invoice.moeda)}</span>
          </div>
          {invoice.gst_valor > 0 ? (
            <div className="flex justify-between py-1">
              <span>GST (10%)</span>
              <span>{formatMoeda(invoice.gst_valor, invoice.moeda)}</span>
            </div>
          ) : null}
          <div
            className="mt-1.5 flex justify-between border-t-2 border-kmp-orange pt-2 text-base font-bold text-kmp-orange-deep"
            style={headingStyle}
          >
            <span>Total</span>
            <span>{formatMoeda(invoice.total, invoice.moeda)}</span>
          </div>
        </div>

        <div className="my-5 rounded-md border-l-[3px] border-kmp-orange bg-[#f27b200d] p-4 text-[13.5px]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-kmp-orange-deep">
            {invoice.forma_pagamento === "payid" ? "Pagamento via PayID" : "Pagamento via PIX"}
          </p>
          {invoice.forma_pagamento === "payid" ? (
            <>
              <div className="flex justify-between py-0.5">
                <span>PayID</span>
                <span>{invoice.payid_valor ?? "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>BSB</span>
                <span>{invoice.payid_bsb ?? "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Conta</span>
                <span>{invoice.payid_conta ?? "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Titular</span>
                <span>{invoice.payid_titular ?? "—"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-0.5">
                <span>Chave PIX</span>
                <span>{invoice.pix_chave ?? "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Titular</span>
                <span>{invoice.pix_titular ?? "—"}</span>
              </div>
            </>
          )}
        </div>

        {invoice.observacoes ? (
          <p className="mt-4 whitespace-pre-wrap text-xs text-[#2c2c2c99]">
            {invoice.observacoes}
          </p>
        ) : null}
      </div>

      <div className="bg-kmp-graphite px-6 py-4 text-center text-white">
        <p className="text-base font-semibold text-kmp-orange" style={headingStyle}>
          Obrigada pela confiança na KMP Consulting
        </p>
        <p className="mt-1 text-[11px]">KMP Consulting | vistos@kmpconsulting.com.au</p>
      </div>
    </div>
  );
}
