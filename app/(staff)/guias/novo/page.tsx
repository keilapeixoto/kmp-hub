import Link from "next/link";
import { getServiceTypes } from "@/lib/cases/data";
import { createGuide } from "../actions";
import { GuideForm } from "../_components/guide-form";

export default async function NovoGuiaPage() {
  const serviceTypes = await getServiceTypes();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/guias"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Guias
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          Novo guia
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <GuideForm action={createGuide} serviceTypes={serviceTypes} />
      </div>
    </div>
  );
}
