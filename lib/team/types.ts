export const STAFF_ROLES = [
  { slug: "admin", label: "Admin" },
  { slug: "director", label: "Diretor(a)" },
  { slug: "consultant", label: "Consultor(a)" },
  { slug: "operations", label: "Operações" },
  { slug: "finance", label: "Financeiro" },
  { slug: "partner", label: "Parceiro(a)" },
] as const;

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  STAFF_ROLES.map((r) => [r.slug, r.label]),
);

export type TeamMember = {
  userId: string;
  email: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  fotoUrl: string | null;
  role: string;
  ativo: boolean;
  createdAt: string;
};
