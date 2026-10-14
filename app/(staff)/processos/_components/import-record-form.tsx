import { importPreviousApplication } from "../import-record-actions";

export type ImportResult = {
  importados: number;
  mantidos: number;
  avisos: string[];
  erro: string | null;
};

export function ImportRecordForm({
  caseId,
  resultado,
}: {
  caseId: string;
  resultado: ImportResult | null;
}) {
  const action = importPreviousApplication.bind(null, caseId);

  return (
    <div className="mt-4 border-t border-kmp-divider pt-4">
      <p className="mb-1 text-xs font-medium text-kmp-text/60">
        Preencher a partir de uma aplicação anterior
      </p>
      <p className="mb-2 text-xs text-kmp-text/50">
        Envie o PDF &quot;Record of Responses&quot; que o ImmiAccount gera depois que a
        aplicação é enviada. O arquivo não fica guardado — só as respostas, e só nos
        campos que ainda estão vazios.
      </p>
      <form action={action} className="flex flex-wrap items-center gap-3 text-xs">
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          required
          className="max-w-full text-xs text-kmp-text/70 file:mr-3 file:rounded-md file:border-0 file:bg-kmp-graphite/10 file:px-2.5 file:py-1 file:font-medium file:text-kmp-text"
        />
        <button
          type="submit"
          className="rounded-full bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-text transition hover:bg-kmp-graphite/20"
        >
          Importar respostas
        </button>
      </form>

      {resultado?.erro ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{resultado.erro}</p>
      ) : null}
      {resultado && !resultado.erro ? (
        <div className="mt-3 space-y-1 rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">
          <p>
            {resultado.importados} campo(s) preenchido(s) como rascunho
            {resultado.mantidos > 0
              ? `; ${resultado.mantidos} já tinham resposta e foram mantidos`
              : ""}
            . Revise antes de enviar ao cliente.
          </p>
          {resultado.avisos.map((a) => (
            <p key={a} className="text-amber-800">
              Atenção: {a}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
