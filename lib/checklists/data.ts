import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type {
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  ChecklistTemplateItem,
} from "./types";

export async function getChecklistTemplate(
  id: string,
): Promise<ChecklistTemplate | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as ChecklistTemplate | null;
}

export async function getChecklistTemplateByServiceType(
  serviceTypeId: string,
): Promise<ChecklistTemplate | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("service_type_id", serviceTypeId)
    .maybeSingle();
  return data as ChecklistTemplate | null;
}

export async function getChecklistTemplateItems(
  templateId: string,
): Promise<ChecklistTemplateItem[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("checklist_template_items")
    .select("*")
    .eq("checklist_template_id", templateId)
    .order("ordem");
  return (data ?? []) as ChecklistTemplateItem[];
}

export async function getChecklistByCase(
  caseId: string,
): Promise<Checklist | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("checklists")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();
  return data as Checklist | null;
}

export async function getChecklistItems(
  checklistId: string,
): Promise<ChecklistItem[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", checklistId)
    .order("created_at");
  return (data ?? []) as ChecklistItem[];
}
