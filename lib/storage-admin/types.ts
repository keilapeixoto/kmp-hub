export type StorageSettings = {
  id: true;
  max_file_size_bytes: number;
  allowed_extensions: string[];
  alert_thresholds_pct: number[];
  alert_emails: string[];
  internal_limit_bytes: number;
  large_file_warning_bytes: number;
  archived_case_review_days: number;
  updated_at: string;
  updated_by: string | null;
};

export type StorageDailySnapshot = {
  id: string;
  snapshot_date: string;
  total_bytes: number;
  total_bytes_ativos: number;
  total_bytes_arquivados: number;
  total_arquivos: number;
  por_categoria: Record<string, number>;
  created_at: string;
};

export type StorageAuditRun = {
  id: string;
  run_at: string;
  total_bytes: number;
  orfaos_sem_processo: number;
  duplicados_grupos: number;
  duplicados_bytes: number;
  thresholds_cruzados: number[];
  status: "ok" | "erro";
  detalhe: string | null;
  duracao_ms: number | null;
};

export type StorageAlertEvent = {
  id: string;
  threshold_pct: number;
  triggered_at: string;
  total_bytes: number;
  emails_sent_to: string[];
  email_status: "pendente" | "enviado" | "falhou" | "sem_destinatario";
  detalhe: string | null;
  reconhecido_em: string | null;
  reconhecido_por: string | null;
};
