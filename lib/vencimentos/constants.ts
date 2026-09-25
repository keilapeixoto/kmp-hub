import type { VisaUrgency } from "@/lib/clients/constants";

export type VisaBucket = VisaUrgency | "sem_data";

export const BUCKET_ORDER: VisaBucket[] = [
  "vencido",
  "critico",
  "atencao",
  "monitorar",
  "sem_urgencia",
  "sem_data",
];
