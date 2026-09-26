"use client";

import { useRef, useState } from "react";
import type { Client } from "@/lib/clients/types";
import type { InvoiceWithItems } from "@/lib/invoices/types";
import { InvoiceDocument } from "./invoice-document";

const FIXED_WIDTH = 720;
const TARGET_WIDTH_PX = 2480; // ~300dpi a 210mm de largura
const A4_RATIO = 297 / 210; // altura/largura da página
const PAGE_MIN_HEIGHT = Math.round(FIXED_WIDTH * A4_RATIO); // altura de 1 página A4 nessa largura

function waitForImages(root: HTMLElement): Promise<void[]> {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
}

export function InvoicePdfButton({
  invoice,
  client,
}: {
  invoice: InvoiceWithItems;
  client: Client | null;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function exportPdf() {
    const original = previewRef.current;
    if (!original) return;

    setPending(true);
    setStatus("Gerando PDF…");

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = `${FIXED_WIDTH}px`;
    host.style.pointerEvents = "none";

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const clone = original.cloneNode(true) as HTMLElement;
      // previewRef aponta pro wrapper simples em volta do <InvoiceDocument>;
      // quem precisa da largura/altura fixas é a raiz flex-col do documento
      // em si (1º filho), senão o rodapé não fica esticado até a base.
      const docRoot = (clone.firstElementChild as HTMLElement | null) ?? clone;
      docRoot.style.width = `${FIXED_WIDTH}px`;
      docRoot.style.maxWidth = `${FIXED_WIDTH}px`;
      docRoot.style.margin = "0";
      docRoot.style.boxShadow = "none";
      // Preenche pelo menos 1 página A4 inteira (documento tem menos conteúdo
      // que isso na maioria das invoices) — o rodapé usa flex-1 no conteúdo
      // do meio pra ficar colado na base da página, não no meio dela.
      docRoot.style.minHeight = `${PAGE_MIN_HEIGHT}px`;
      host.appendChild(clone);
      document.body.appendChild(host);
      await waitForImages(clone);

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(clone, {
        scale: TARGET_WIDTH_PX / FIXED_WIDTH,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const imgWidthMm = pageWidthMm;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      let heightLeft = imgHeightMm;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidthMm, imgHeightMm, undefined, "MEDIUM");
      heightLeft -= pageHeightMm;
      while (heightLeft > 1) {
        position = heightLeft - imgHeightMm;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidthMm, imgHeightMm, undefined, "MEDIUM");
        heightLeft -= pageHeightMm;
      }

      const clientName = (client?.nome ?? "Cliente").replace(/\s+/g, "_");
      pdf.save(`Invoice_KMP_${clientName}_${invoice.numero}.pdf`);
      setStatus("PDF salvo com sucesso.");
    } catch (err) {
      console.error("Erro ao gerar PDF da invoice:", err);
      setStatus("Erro ao gerar PDF. Tente novamente.");
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host);
      setPending(false);
      setTimeout(() => setStatus(null), 4000);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={exportPdf}
        disabled={pending}
        className="rounded-md bg-kmp-orange px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Gerando…" : "Baixar PDF"}
      </button>
      {status ? <p className="mt-2 text-xs text-kmp-graphite/60">{status}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <div ref={previewRef}>
          <InvoiceDocument invoice={invoice} client={client} />
        </div>
      </div>
    </div>
  );
}
