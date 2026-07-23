import Link from "next/link";
import {
  Briefcase,
  ClipboardList,
  FileText,
  HardDrive,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";

type SettingsArea = {
  href: string;
  nome: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
};

const AREAS: SettingsArea[] = [
  {
    href: "/configuracoes/servicos",
    nome: "Tipos de serviço (pipelines)",
    descricao:
      "Criar, renomear, arquivar e duplicar pipelines; configurar etapas de cada uma.",
    icon: Briefcase,
  },
  {
    href: "/configuracoes/checklists",
    nome: "Checklists",
    descricao: "Templates de checklist por tipo de serviço, reutilizáveis.",
    icon: ClipboardList,
  },
  {
    href: "/configuracoes/formularios",
    nome: "Formulários",
    descricao: "Formulários de coleta de dados enviados aos clientes no portal.",
    icon: FileText,
  },
  {
    href: "/configuracoes/equipe",
    nome: "Equipe",
    descricao: "Adicionar, editar e desativar usuários do painel.",
    icon: UsersRound,
  },
  {
    href: "/configuracoes/armazenamento",
    nome: "Armazenamento",
    descricao: "Uso de espaço, alertas e limites de upload de documentos.",
    icon: HardDrive,
  },
];

export default async function ConfiguracoesHubPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Configurações
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          Ajustes do sistema — cada área abaixo pode ser personalizada sem
          precisar mexer no código.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <Link
              key={area.href}
              href={area.href}
              className="rounded-lg bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <Icon className="h-6 w-6 text-kmp-orange" />
              <h2 className="mt-3 font-heading text-lg text-kmp-graphite">
                {area.nome}
              </h2>
              <p className="mt-1 text-sm text-kmp-graphite/60">
                {area.descricao}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
