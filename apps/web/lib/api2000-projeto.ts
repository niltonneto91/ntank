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
  TipoTanqueAPI2000,
} from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

export type NormaContrucao = "API650" | "API620" | "NBR7821" | "UL142" | "outro";

// ---------------------------------------------------------------------------
// Estrutura principal
// ---------------------------------------------------------------------------

export interface ProjetoAPI2000 {
  /** UUID v4 gerado na criação */
  id: string;
  /** Discriminador de tipo — sempre "API2000" */
  tipo: "API2000";
  /** Nome do cálculo / projeto */
  nome: string;
  /** Cliente ou unidade (opcional) */
  cliente?: string;
  /** Localidade (opcional) */
  local?: string;
  /** Pasta organizacional (opcional) */
  pasta?: string;
  /** ISO 8601 — data de criação */
  criadoEm: string;
  /** ISO 8601 — última atualização (atualizado automaticamente ao salvar) */
  atualizadoEm: string;

  // --- Identificação do tanque ---
  /** Tag do equipamento no fluxograma / P&ID */
  tagTanque: string;
  /** Norma de construção do tanque */
  normaContrucao: NormaContrucao;
  /** Tipo de tanque — define a geometria e as regras de escopo */
  tipoTanque: TipoTanqueAPI2000;

  // --- Geometria ---
  geometria: GeometriaAPI2000;

  // --- Produto armazenado ---
  produto: ProdutoAPI2000;

  // --- Pressões de projeto ---
  pressoes: PressoesAPI2000;

  // --- Operação ---
  operacao: OperacaoAPI2000;

  /**
   * Fatores normativos da API 2000 Tabela 1.
   * null = placeholder — usuário não preencheu da norma ainda.
   * O sistema calcula o mínimo físico quando null.
   */
  fatoresNormativos: FatoresNormativosAPI2000;

  /** Lista de dispositivos de alívio cadastrados */
  dispositivos: DispositivoAlivioAPI2000[];
}

export interface GeometriaAPI2000 {
  /** Diâmetro interno do tanque [m] */
  D_m: number;
  /** Altura total do costado [m] */
  H_m: number;
  /** Altura máxima do nível de líquido [m] (≤ H_m) */
  H_liq_max_m: number;
  /** Área molhada calculada automaticamente? Se false, usar valor manual */
  areaAutoCalculada: boolean;
  /** Área molhada manual [m²] — usado quando areaAutoCalculada = false */
  A_wet_manual_m2?: number;
}

export interface ProdutoAPI2000 {
  /** Nome do produto (texto livre — ex.: "Diesel S10") */
  nome: string;
  /** Classe de inflamabilidade conforme NBR 17505 / NFPA 30 */
  classe: ClasseLiquidoAPI2000;
  /** Ponto de fulgor [°C] (opcional — para registro) */
  pontoFulgor_C?: number;
  /** Ponto de ebulição [°C] (opcional — para alertas de escopo) */
  pontoEbulicao_C?: number;
  /** Temperatura típica de armazenamento [°C] */
  T_armazenamento_C: number;
  /** Sistema de blanketing / inertização? */
  blanketing: boolean;
  /** Gás de blanketing (ex.: "N₂") — preenchido se blanketing = true */
  gasBlanketing?: string;
}

export interface PressoesAPI2000 {
  /** Pressão de projeto positiva do tanque [kPa(g)] */
  P_projeto_kPa: number;
  /** Vácuo de projeto do tanque [kPa(g)] — valor positivo representa vácuo */
  V_projeto_kPa: number;
  /**
   * Pressão de ajuste do VPV [kPa(g)].
   * Deve ser ≤ P_projeto do tanque.
   * null = não definido pelo usuário.
   */
  P_ajuste_VPV_kPa?: number | null;
  /**
   * Vácuo de ajuste do VPV [kPa(g)].
   * null = não definido.
   */
  V_ajuste_VPV_kPa?: number | null;
}

export interface OperacaoAPI2000 {
  /** Vazão máxima de enchimento [m³/h] */
  Q_enchimento_m3h: number;
  /** Vazão máxima de esvaziamento [m³/h] */
  Q_esvaziamento_m3h: number;
  /** Enchimento e esvaziamento podem ocorrer simultaneamente? */
  simultaneo: boolean;
  /** Há sistema de recuperação de vapores? */
  recuperacaoVapor: boolean;
}

export interface FatoresNormativosAPI2000 {
  /**
   * Fator de outbreathing da API 2000 Tabela 1 [adimensional].
   *
   * Depende da classe do produto e temperatura de armazenamento.
   * null = não preenchido → calc usa mínimo físico por deslocamento.
   *
   * INSTRUÇÃO: Consultar API Standard 2000, 7ª ed. (2014), Tabela 1,
   * para o produto e temperatura de armazenamento do projeto.
   */
  fator_outbreathing: number | null;
  /**
   * Fator de inbreathing da API 2000 Tabela 1 [adimensional].
   * null = não preenchido → calc usa mínimo físico.
   */
  fator_inbreathing: number | null;
}

// ---------------------------------------------------------------------------
// Defaults e fábrica
// ---------------------------------------------------------------------------

export const PRESSOES_DEFAULT: PressoesAPI2000 = {
  P_projeto_kPa: 1.0,   // tanque atmosférico típico: 0 a 6.9 kPa
  V_projeto_kPa: 0.25,  // vácuo típico para tanques atmosféricos
  P_ajuste_VPV_kPa: null,
  V_ajuste_VPV_kPa: null,
};

/**
 * Cria um novo ProjetoAPI2000 com valores padrão.
 * id e criadoEm são gerados automaticamente.
 */
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
    dispositivos: [],
  };
}

/** Novo ID de dispositivo */
export function novoDispositivoId(): string {
  return `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
