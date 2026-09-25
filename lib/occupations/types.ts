export type Occupation = {
  id: string;
  nome: string;
  codigo_anzsco: string;
  categoria: string;
  autoridade_avaliadora: string;
  nivel_habilidade: number;
  na_csol: boolean;
  na_mltssl_legada: boolean;
  fonte: string | null;
  status: "ativo" | "arquivado";
  created_at: string;
  updated_at: string;
};

export type OccupationFilters = {
  q?: string;
  categoria?: string;
};
