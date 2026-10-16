import { Paperclip, X } from "lucide-react";
import { addTemplateAttachment, deleteTemplateAttachment } from "../actions";

// Anexos fixos de um template de e-mail: vão marcados sempre que o template
// é usado em "Enviar e-mail" no perfil do cliente. Só admin envia/remove.

function tamanho(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function TemplateAttachments({
  templateId,
  anexos,
  isAdmin,
}: {
  templateId: string;
  anexos: { id: string; nome: string; tamanho: number }[];
  isAdmin: boolean;
}) {
  if (!isAdmin && anexos.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl bg-kmp-text/5 p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-kmp-text/70">
        <Paperclip className="h-3.5 w-3.5" /> Anexos que vão junto
      </p>
      {anexos.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full bg-kmp-surface py-1 pl-3 pr-1 text-xs text-kmp-text shadow-sm">
              {a.nome}
              <span className="text-kmp-text/50">· {tamanho(a.tamanho)}</span>
              {isAdmin ? (
                <form action={deleteTemplateAttachment.bind(null, a.id)}>
                  <button
                    type="submit"
                    aria-label={`Remover o anexo ${a.nome}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-kmp-text/50 hover:bg-kmp-text/10 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-kmp-text/60">Nenhum anexo fixo.</p>
      )}
      {isAdmin ? (
        <form action={addTemplateAttachment.bind(null, templateId)} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="arquivo"
            required
            aria-label="Arquivo para anexar ao template"
            className="min-w-0 flex-1 text-xs text-kmp-text/70"
          />
          <button
            type="submit"
            className="rounded-full bg-kmp-text/10 px-3 py-1 text-xs font-semibold text-kmp-text hover:bg-kmp-text/15"
          >
            Anexar
          </button>
          <span className="text-[11px] text-kmp-text/50">até 9 MB por arquivo</span>
        </form>
      ) : null}
    </div>
  );
}
