/**
 * Modelo de dados do Projeto API 653 — Inspeção e Vida Útil de Tanques.
 *
 * Armazenado na store "calc-api653" do IndexedDB.
 *
 * Diferente de ProjetoNTANK (que guarda parâmetros de projeto de tanque NOVO),
 * ProjetoAPI653 guarda os dados de campo de uma campanha de inspeção:
 * espessuras medidas por curso, dados do fundo e dados do produto,
 * para calcular RUL (vida útil restante) e datas de próxima inspeção.
 */

import type { CursoMedido, FundoMedido, MetodologiaInspecao } from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Sub-tipos
// ---------------------------------------------------------------------------

/** Norma de construção original do tanque. */
export type NormaConstrucao =
  | "API650"
  | "NBR7821"
  | "API620"
  | "outra"
  | "desconhecida";

/** Geometria básica do tanque inspecionado. */
export interface GeometriaAPI653 {
  /** Diâmetro nominal do tanque (m). */
  D_m: number;
  /** Altura total do costado (m). */
  H_m: number;
  /** Número de cursos (anéis) do costado. */
  numCursos: number;
}

/** Dados do material do costado. */
export interface MaterialAPI653 {
  /** Identificador do material (ex.: "A36", "A516-Gr60"). */
  materialId: string;
  /** Tensão admissível do material (MPa). Default: 137,9 MPa para A36. */
  S_MPa: number;
  /** Eficiência de junta do costado. Padrão: 0,85. */
  E: number;
}

/** Dados do produto armazenado. */
export interface ProdutoAPI653 {
  /** Nome do produto (ex.: "Diesel S10", "Etanol Hidratado"). */
  nome: string;
  /** Densidade relativa do produto (G). */
  G: number;
}

// ---------------------------------------------------------------------------
// Projeto
// ---------------------------------------------------------------------------

export interface ProjetoAPI653 {
  readonly id: string;
  /** Discriminador fixo — sempre "API653". */
  readonly tipo: "API653";
  /** Nome amigável do projeto de inspeção (ex.: "T-101 — Inspeção 2024"). */
  nome: string;
  /** Cliente / empresa responsável (opcional). */
  cliente?: string;
  /** Localidade da instalação (opcional). */
  local?: string;
  /** Pasta / agrupador (ex.: "Base Sombrio"). */
  pasta: string;
  /** ISO datetime da criação do registro. */
  readonly criadoEm: string;
  /** ISO datetime da última edição. */
  atualizadoEm: string;

  // --- Identificação do tanque ---
  /** TAG do tanque no processo (ex.: "T-101", "TQ-003"). */
  tagTanque: string;
  /** Norma de construção original. */
  normaConstrucao: NormaConstrucao;
  /** Ano de fabricação (ex.: 2008). */
  anoFabricacao?: number;
  /** Data de entrada em operação (ISO: "YYYY-MM-DD"). */
  dataEntradaOperacao?: string;

  // --- Inspeção atual ---
  /** Data da inspeção atual (ISO: "YYYY-MM-DD"). */
  dataInspecao: string;
  /** Metodologia de inspeção utilizada. */
  metodologia: MetodologiaInspecao;
  /** Responsável técnico pela análise (nome + registro). */
  responsavelAnalise: string;

  // --- Dados técnicos ---
  geometria: GeometriaAPI653;
  material: MaterialAPI653;
  produto: ProdutoAPI653;

  /**
   * Cursos do costado, do 1° (base) ao N° (topo).
   * Cada curso tem espessura medida e, opcionalmente, medição anterior.
   */
  cursos: CursoMedido[];

  /**
   * Taxa de corrosão global assumida (mm/ano).
   * Usada quando não há medição anterior por curso.
   * Pode ser sobrescrita por taxa histórica calculada por curso.
   */
  CR_global_mm_ano: number;

  /** Dados do fundo do tanque (opcional — pode não ter sido inspecionado). */
  fundo?: FundoMedido;

  /** Nível de produto para o cálculo de MAST (m). Padrão = H_m. */
  H_liq_m: number;

  /** Observações técnicas livres para o laudo. */
  observacoes?: string;
}

// ---------------------------------------------------------------------------
// Defaults e factory
// ---------------------------------------------------------------------------

export const MATERIAL_API653_DEFAULT: MaterialAPI653 = {
  materialId: "A36",
  S_MPa: 137.9,  // 20.000 psi — tensão admissível API 653 para A36
  E: 0.85,
};

export function novoProjetoAPI653Id(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `api653-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Cria um novo projeto API 653 com valores padrão.
 * Preenche campos obrigatórios com valores razoáveis para o formulário.
 */
export function criarProjetoAPI653(
  parcial?: Partial<Omit<ProjetoAPI653, "id" | "tipo" | "criadoEm" | "atualizadoEm">>,
): ProjetoAPI653 {
  const agora = new Date().toISOString();
  const hoje = agora.slice(0, 10); // "YYYY-MM-DD"

  return {
    id: novoProjetoAPI653Id(),
    tipo: "API653",
    nome: parcial?.nome?.trim() || "Inspeção sem nome",
    cliente: parcial?.cliente,
    local: parcial?.local,
    pasta: parcial?.pasta ?? "",
    criadoEm: agora,
    atualizadoEm: agora,

    tagTanque: parcial?.tagTanque ?? "",
    normaConstrucao: parcial?.normaConstrucao ?? "API650",
    anoFabricacao: parcial?.anoFabricacao,
    dataEntradaOperacao: parcial?.dataEntradaOperacao,

    dataInspecao: parcial?.dataInspecao ?? hoje,
    metodologia: parcial?.metodologia ?? "UT-convencional",
    responsavelAnalise: parcial?.responsavelAnalise ?? "",

    geometria: parcial?.geometria ?? {
      D_m: 10,
      H_m: 10,
      numCursos: 4,
    },
    material: parcial?.material ?? { ...MATERIAL_API653_DEFAULT },
    produto: parcial?.produto ?? { nome: "", G: 0.85 },

    cursos: parcial?.cursos ?? [],
    CR_global_mm_ano: parcial?.CR_global_mm_ano ?? 0.1,
    fundo: parcial?.fundo,

    H_liq_m: parcial?.H_liq_m ?? (parcial?.geometria?.H_m ?? 10),

    observacoes: parcial?.observacoes,
  };
}
