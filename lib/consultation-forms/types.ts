import type { ActionRespSlug, ActionStatusSlug, TrajStatusSlug } from "./constants";

export type PanoramaEntry = {
  name: string;
  chegada: string;
  idade: string;
  situacao: string;
};

export type ExperienciaEntry = {
  name: string;
  area: string;
  br: string;
  au: string;
};

export type TrajRow = {
  course: string;
  country: "BR" | "AU";
  status: TrajStatusSlug;
};

export type TrajEntry = {
  name: string;
  rows: TrajRow[];
};

export type NoteEntry = {
  title: string;
  body: string;
};

export type ActionEntry = {
  text: string;
  resp: ActionRespSlug;
  status: ActionStatusSlug;
};

export type ConsultationFormData = {
  clientNames: string;
  date: string;
  panorama: PanoramaEntry[];
  exp: ExperienciaEntry[];
  traj: TrajEntry[];
  notes: NoteEntry[];
  steps: string[];
  strategyNote: string;
  benefitNote: string;
  actions: ActionEntry[];
};

export const EMPTY_CONSULTATION_DATA: ConsultationFormData = {
  clientNames: "",
  date: "",
  panorama: [],
  exp: [],
  traj: [],
  notes: [],
  steps: [],
  strategyNote: "",
  benefitNote: "",
  actions: [],
};

export type ConsultationForm = {
  id: string;
  client_id: string;
  consult_date: string;
  data: ConsultationFormData;
  ai_pending_sections: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
};
