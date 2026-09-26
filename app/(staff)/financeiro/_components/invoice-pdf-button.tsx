"use client";

import { useRef, useState } from "react";
import type { Client } from "@/lib/clients/types";
import type { InvoiceWithItems } from "@/lib/invoices/types";
import { InvoiceDocument } from "./invoice-document";

const FIXED_WIDTH = 720;
const TARGET_WIDTH_PX = 2480; // ~300dpi a 210mm de largura

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
      clone.style.width = `${FIXED_WIDTH}px`;
      clone.style.maxWidth = `${FIXED_WIDTH}px`;
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
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
    } catch {
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
