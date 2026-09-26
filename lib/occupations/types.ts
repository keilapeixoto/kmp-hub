export type Occupation = {
  id: string;
  nome: string;
  codigo_anzsco: string;
  categoria: string;
  autoridade_avaliadora: string;
  nivel_habilidade: number;
  na_csol: boolean;
  na_mltssl_legada: boolean;
  visto_189: boolean | null;
  visto_190: boolean | null;
  visto_491: boolean | null;
  visto_482: boolean | null;
  visto_494: boolean | null;
  visto_186: boolean | null;
  visto_407: boolean | null;
  visto_485: boolean | null;
  fonte: string | null;
  status: "ativo" | "arquivado";
  created_at: string;
  updated_at: string;
};

export type OccupationFilters = {
  q?: string;
  categoria?: string;
};
