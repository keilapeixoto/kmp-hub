import type { DocumentCategory } from "@/lib/documents/types";
import { UploadMultiplo } from "@/components/documentos/upload-multiplo";
import { registrarDocumentosPortal } from "../actions";

export function PortalUploadForm({
  clientId,
  caseId,
  checklistItemId,
  categories,
  bucket,
  regras,
}: {
  clientId: string;
  caseId: string;
  checklistItemId: string | null;
  categories: DocumentCategory[];
  bucket: string;
  regras: { extensoes: string[]; maxBytes: number };
}) {
  return (
    <UploadMultiplo
      clientId={clientId}
      pastaProcesso={caseId}
      categories={categories}
      bucket={bucket}
      regras={regras}
      registrar={registrarDocumentosPortal.bind(null, clientId, caseId, checklistItemId)}
      pedirDescricao={!checklistItemId}
    />
  );
}
