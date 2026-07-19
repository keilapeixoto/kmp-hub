import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Case } from "@/lib/cases/types";
import type { ChecklistItem } from "@/lib/checklists/types";

export type PortalCase = Case & {
  client_nome: string;
  service_type_nome: string | null;
};

/**
 * Clientes que o usuário logado no portal enxerga (client_access — pode ser
 * mais de um: parceiro com acesso a mais de um processo, por exemplo).
 */
export async function getPortalClientIds(): Promise<string[]> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("client_access")
    .select("client_id")
    .or(`client_user_id.eq.${user.id},partner_id.eq.${user.id}`);

  return [...new Set((data ?? []).map((r) => r.client_id as string))];
}

export async function getPortalCases(): Promise<PortalCase[]> {
  const clientIds = await getPortalClientIds();
  if (clientIds.length === 0) return [];

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("cases")
    .select(
      "*, clients(nome), service_types!cases_service_type_id_fkey(nome)",
    )
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => ({
    ...c,
    client_nome:
      (c as { clients?: { nome: string } | null }).clients?.nome ?? "",
    service_type_nome:
      (c as { service_types?: { nome: string } | null }).service_types
        ?.nome ?? null,
  })) as PortalCase[];
}

export async function getPortalCase(caseId: string): Promise<PortalCase | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("cases")
    .select(
      "*, clients(nome), service_types!cases_service_type_id_fkey(nome)",
    )
    .eq("id", caseId)
    .maybeSingle();

  if (!data) return null;
  return {
    ...data,
    client_nome:
      (data as { clients?: { nome: string } | null }).clients?.nome ?? "",
    service_type_nome:
      (data as { service_types?: { nome: string } | null }).service_types
        ?.nome ?? null,
  } as PortalCase;
}

export async function getPortalChecklistItems(
  caseId: string,
): Promise<ChecklistItem[]> {
  const supabase = await createSupabaseClient();
  const { data: checklist } = await supabase
    .from("checklists")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!checklist) return [];

  const { data } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", checklist.id)
    .order("created_at");

  return (data ?? []) as ChecklistItem[];
}

export async function getPortalDocumentsByChecklistItem(
  caseId: string,
): Promise<Record<string, { id: string; created_at: string }[]>> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("id, checklist_item_id, created_at")
    .eq("case_id", caseId)
    .eq("arquivado", false)
    .not("checklist_item_id", "is", null);

  const byItem: Record<string, { id: string; created_at: string }[]> = {};
  for (const doc of data ?? []) {
    const key = doc.checklist_item_id as string;
    byItem[key] = byItem[key] ?? [];
    byItem[key].push({ id: doc.id, created_at: doc.created_at });
  }
  return byItem;
}
