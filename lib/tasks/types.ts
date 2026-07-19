import type { TaskStatus } from "./constants";
import type { CasePriority } from "@/lib/cases/constants";

export type Task = {
  id: string;
  titulo: string;
  descricao: string | null;
  client_id: string | null;
  case_id: string | null;
  responsavel: string;
  participantes: string[];
  criado_por: string;
  prioridade: CasePriority;
  prazo: string | null;
  status: TaskStatus;
  dependencia_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  autor: string;
  texto: string;
  anexo: string | null;
  created_at: string;
};

export type TaskFilters = {
  status?: string;
  prioridade?: string;
  responsavel?: string;
};
