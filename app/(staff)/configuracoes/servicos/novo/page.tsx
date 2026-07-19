import Link from "next/link";
import { createServiceType } from "../actions";
import { ServiceTypeForm } from "../_components/service-type-form";

export default function NovoServiceTypePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracoes/servicos"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Tipos de serviço
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          Novo tipo de serviço
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <ServiceTypeForm action={createServiceType} />
      </div>
    </div>
  );
}
