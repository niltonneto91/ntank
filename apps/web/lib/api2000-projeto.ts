/**
 * Modelo de dados do projeto API 2000 (Ventilação de Tanques).
 *
 * Persistido em IndexedDB separado do projeto API 650 — estrutura de dados
 * completamente diferente; compartilham apenas id, nome, datas e criadoEm.
 *
 * Cálculo recomputado a cada renderização a partir dos dados aqui salvos.
 */

import type {
  ClasseLiquidoAPI2000,
  DispositivoAlivioAPI2000,
  ModoEntradaEmergencia,
  TipoTanqueAPI2000,
} from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

export type NormaContrucao = "API650" | "API620" | "NBR7821" | "UL142" | "outro";

// Re-exportar para uso nos componentes
export type { DispositivoAlivioAPI2000, ClasseLiquidoAPI2000, TipoTanqueAPI2000 };

// ---------------------------------------------------------------------------
// Estrutura principal
// ---------------------------------------------------------------------------

export interface ProjetoAPI2000 {
  id: string;
  tipo: "API2000";
  nome: string;
  cliente?: string;
  local?: string;
  pasta?: string;
  criadoEm: string;
  atualizadoEm: string;

  tagTanque: string;
  normaContrucao: NormaContrucao;
  tipoTanque: TipoTanqueAPI2000;

  geometria: GeometriaAPI2000;
  produto: ProdutoAPI2000;
  pressoes: PressoesAPI2000;
  operacao: OperacaoAPI2000;
  fatoresNormativos: FatoresNormativosAPI2000;

  /** Configuração do efeito térmico normal */
  termico: TermicoAPI2000;

  /** Configuração da ventilação de emergência por fogo */
  emergencia: EmergenciaAPI2000;

  /** Lista de dispositivos de alívio cadastrados */
  dispositivos: DispositivoAlivioAPI2000[];
}

// ---------------------------------------------------------------------------
// Sub-estruturas
// ---------------------------------------------------------------------------

export interface GeometriaAPI2000 {
  D_m: number;
  H_m: number;
  H_liq_max_m: number;
  areaAutoCalculada: boolean;
  A_wet_manual_m2?: number;
}

export interface ProdutoAPI2000 {
  nome: string;
  classe: ClasseLiquidoAPI2000;
  pontoFulgor_C?: number;
  pontoEbulicao_C?: number;
  T_armazenamento_C: number;
  blanketing: boolean;
  gasBlanketing?: string;
  /**
   * Calor latente de vaporização [kJ/kg] — necessário para emergência por fogo.
   * Valores típicos: gasolina ≈ 300, diesel ≈ 250, etanol ≈ 841.
   */
  L_kJ_kg?: number | null;
  /**
   * Massa molecular do vapor [kg/kmol] — necessária para emergência por fogo.
   * Valores típicos: gasolina ≈ 95, diesel ≈ 198, etanol = 46.
   */
  M_kg_kmol?: number | null;
}

export interface PressoesAPI2000 {
  P_projeto_kPa: number;
  V_projeto_kPa: number;
  P_ajuste_VPV_kPa?: number | null;
  V_ajuste_VPV_kPa?: number | null;
  /** Pressão máxima admissível em emergência [kPa(g)] */
  P_max_emergencia_kPa?: number | null;
}

export interface OperacaoAPI2000 {
  Q_enchimento_m3h: number;
  Q_esvaziamento_m3h: number;
  simultaneo: boolean;
  recuperacaoVapor: boolean;
}

export interface FatoresNormativosAPI2000 {
  /**
   * Fator de outbreathing da API 2000 Tabela 1 [adimensional].
   * null = não preenchido → mínimo físico por deslocamento.
   */
  fator_outbreathing: number | null;
  /**
   * Fator de inbreathing da API 2000 Tabela 1 [adimensional].
   * null = não preenchido → mínimo físico.
   */
  fator_inbreathing: number | null;
}

export interface TermicoAPI2000 {
  /** Considerar efeito térmico neste cálculo? */
  considerar: boolean;
  /**
   * Vazão de efeito térmico [Nm³/h] da API 2000 Tabela 2.
   * null = não preenchido (placeholder).
   */
  Q_termico_Nm3h: number | null;
}

export interface EmergenciaAPI2000 {
  /** Calcular ventilação de emergência por fogo neste cálculo? */
  calcular: boolean;
  /** Modo de entrada: via calor calculado ou vazão direta */
  modo: ModoEntradaEmergencia;
  /**
   * Taxa de absorção de calor [kW] calculada pelo usuário com API 2000 Seção 6.
   * null = não informado.
   */
  Q_calor_kW: number | null;
  /**
   * Vazão de emergência informada diretamente [Nm³/h].
   * null = não informado.
   */
  Q_emergencia_direto_Nm3h: number | null;
  /**
   * Fator ambiental F (da API 2000 Tabela 4 ou equivalente).
   * null = não informado.
   */
  F_ambiental: number | null;
  /** Temperatura de alívio [°C] para conversão calor→vapor */
  T_alivio_C: number | null;
  /** Sistema de resfriamento por água presente? */
  resfriamentoAgua: boolean;
  /** Isolamento térmico aprovado? */
  isolamentoAprovado: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const PRESSOES_DEFAULT: PressoesAPI2000 = {
  P_projeto_kPa: 1.0,
  V_projeto_kPa: 0.25,
  P_ajuste_VPV_kPa: null,
  V_ajuste_VPV_kPa: null,
  P_max_emergencia_kPa: null,
};

export const TERMICO_DEFAULT: TermicoAPI2000 = {
  considerar: true,
  Q_termico_Nm3h: null,
};

export const EMERGENCIA_DEFAULT: EmergenciaAPI2000 = {
  calcular: false,
  modo: "calor_calculado",
  Q_calor_kW: null,
  Q_emergencia_direto_Nm3h: null,
  F_ambiental: null,
  T_alivio_C: null,
  resfriamentoAgua: false,
  isolamentoAprovado: false,
};

// ---------------------------------------------------------------------------
// Fábrica
// ---------------------------------------------------------------------------

export function criarProjetoAPI2000(
  parcial?: Partial<Pick<ProjetoAPI2000, "nome" | "cliente" | "local" | "pasta" | "tagTanque">>,
): ProjetoAPI2000 {
  const agora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    tipo: "API2000",
    nome: parcial?.nome ?? "Cálculo API 2000",
    cliente: parcial?.cliente,
    local: parcial?.local,
    pasta: parcial?.pasta,
    criadoEm: agora,
    atualizadoEm: agora,
    tagTanque: parcial?.tagTanque ?? "T-001",
    normaContrucao: "API650",
    tipoTanque: "vertical-teto-fixo",
    geometria: {
      D_m: 7.64,
      H_m: 12,
      H_liq_max_m: 11.5,
      areaAutoCalculada: true,
    },
    produto: {
      nome: "",
      classe: "II",
      T_armazenamento_C: 30,
      blanketing: false,
      L_kJ_kg: null,
      M_kg_kmol: null,
    },
    pressoes: { ...PRESSOES_DEFAULT },
    operacao: {
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 80,
      simultaneo: false,
      recuperacaoVapor: false,
    },
    fatoresNormativos: {
      fator_outbreathing: null,
      fator_inbreathing: null,
    },
    termico: { ...TERMICO_DEFAULT },
    emergencia: { ...EMERGENCIA_DEFAULT },
    dispositivos: [],
  };
}

export function novoDispositivoId(): string {
  return `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
