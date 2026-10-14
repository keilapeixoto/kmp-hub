import { createClient } from "@/lib/supabase/server";
import { contarFormularios, type LinhaProcesso } from "./overview";

export async function getFormsOverview() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cases")
    .select("id, service_types!cases_service_type_id_fkey(case_form_template_id), case_forms(status)")
    .eq("status", "ativo");
  return contarFormularios((data ?? []) as unknown as LinhaProcesso[]);
}
