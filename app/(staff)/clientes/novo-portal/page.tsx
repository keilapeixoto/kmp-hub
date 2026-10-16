import Link from "next/link";
import { getCurrentUserId, getCurrentUserRole } from "@/lib/auth";
import { getConsultants } from "@/lib/leads/data";
import { getServiceTypes } from "@/lib/cases/data";
import { CadastroPortalForm } from "./cadastro-portal-form";

// Cliente novo em um passo: cadastro, processo, checklist e convite do portal.

export default async function NovoClienteComPortalPage() {
  const [role, usuarioId, consultants, tipos] = await Promise.all([
    getCurrentUserRole(),
    getCurrentUserId(),
    getConsultants(),
    getServiceTypes(),
  ]);
  const podeConvidar = role === "admin" || role === "director";
  const visiveis = tipos.filter((t) => !t.nome.startsWith("[DEMO]"));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/clientes" className="text-sm text-kmp-text/60 hover:text-kmp-orange">
          ← Clientes
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-text">Novo cliente com portal</h1>
        <p className="mt-1 text-sm text-kmp-text/70">
          Cria o cliente, o processo na primeira etapa e o checklist de documentos, e manda o convite do portal. O
          cliente preenche o formulário e envia os documentos por lá, e tudo cai direto no perfil dele.
        </p>
      </div>

      <div className="rounded-3xl bg-kmp-surface p-6 shadow-sm">
        <CadastroPortalForm
          tipos={visiveis.map((t) => ({ id: t.id, nome: t.nome, temChecklist: Boolean(t.checklist_template_id) }))}
          consultants={consultants}
          usuarioId={usuarioId ?? ""}
          podeConvidar={podeConvidar}
        />
      </div>
    </div>
  );
}
