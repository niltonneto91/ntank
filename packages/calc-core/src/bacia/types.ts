/**
 * Tipos do módulo Bacia de Contenção — NBR 17505-2:2024.
 *
 * Referência principal: NBR 17505-2:2024 §5.9.2 (Contenção por diques).
 *
 * Regras fundamentais implementadas:
 *   §5.9.2.2   — altura máxima do dique: 3,0 m (medida internamente)
 *   §5.9.2.2.1 — capacidade líquida da bacia ≥ volume do maior tanque vertical cheio
 *                 (descontando volumes deslocados pelas bases, diques intermediários etc.)
 *                 + sobrealtura de 0,20 m na altura do dique
 *   §5.9.2.2.2 — para tanques horizontais: capacidade ≥ volume total de todos os tanques
 *
 * NÃO reproduz texto integral da norma.
 */

// ---------------------------------------------------------------------------
// Entidades básicas
// ---------------------------------------------------------------------------

/** Orientação do tanque dentro da bacia. */
export type OrientacaoTanque = "vertical" | "horizontal";

/** Um tanque dentro da bacia de contenção. */
export interface TanqueBacia {
  /** Identificador local (uuid) */
  id: string;
  /** TAG do tanque (ex.: "TQ-01") */
  tag: string;
  /** Orientação do tanque */
  orientacao: OrientacaoTanque;
  /** Diâmetro externo [m] */
  D_m: number;
  /** Altura total operacional [m] (para tanques verticais) ou comprimento [m] (horizontais) */
  H_m: number;
  /** Volume operacional nominal [m³] — informado ou calculado como π/4 × D² × H */
  volume_m3: number;
}

// ---------------------------------------------------------------------------
// Nível de alerta
// ---------------------------------------------------------------------------

export type NivelAlertaBacia = "CRITICO" | "ALERTA" | "INFO";

export interface AlertaBacia {
  code: string;
  nivel: NivelAlertaBacia;
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Distanciamentos
// ---------------------------------------------------------------------------

/** Distanciamento mínimo calculado entre dois elementos. */
export interface DistanciamentoTanque {
  /** TAG do tanque A */
  tagA: string;
  /** TAG do tanque B, ou "muro" para distância tanque → parede do dique */
  tagB: string;
  /** Distância mínima normativa [m] */
  distanciaMinima_m: number;
  /** Fórmula descritiva (ex.: "max(D/6 ; 1,50 m)") */
  formula: string;
  /** Item normativo de referência */
  referenciaNormativa: string;
}

// ---------------------------------------------------------------------------
// Verificação de bacia existente
// ---------------------------------------------------------------------------

/** Entrada para verificação de bacia de contenção existente (NBR 17505-2 §5.9.2). */
export interface EntradaVerificarBacia {
  /** Lista de tanques contidos na bacia */
  tanques: TanqueBacia[];
  /** Dimensão interna — comprimento (L) da bacia [m] */
  comprimento_m: number;
  /** Dimensão interna — largura (W) da bacia [m] */
  largura_m: number;
  /**
   * Altura total do dique, medida internamente [m].
   * Limite: 3,0 m (§5.9.2.2). Inclui a sobrealtura de 0,20 m.
   */
  alturaTotal_m: number;
  /**
   * Sobrealtura (freeboard) já embutida na alturaTotal_m [m].
   * Valor mínimo: 0,20 m (§5.9.2.2.1).
   * Default: 0,20 m.
   */
  freeboard_m: number;
  /**
   * Volume adicional de deslocamentos internos à bacia
   * (diques intermediários, estruturas, tubulações) [m³].
   * Default: 0.
   */
  V_deslocamentos_outros_m3?: number;
}

/** Resultado da verificação de bacia existente. */
export interface ResultadoVerificarBacia {
  /** Volume mínimo requerido (§5.9.2.2.1): maior tanque vertical cheio [m³] */
  volumeRequerido_m3: number;
  /**
   * Volume líquido disponível da bacia [m³]:
   *   = (L × W − ΣA_bases) × h_efetiva − V_deslocamentos_outros
   */
  volumeDisponivel_m3: number;
  /** Altura efetiva para contenção: alturaTotal − freeboard [m] */
  alturaEfetiva_m: number;
  /** Sobrealtura adotada [m] */
  freeboard_m: number;
  /** Soma das áreas de base dos tanques (π/4 × D²) [m²] */
  areaBasesTanques_m2: number;
  /** A bacia atende ao volume mínimo requerido? */
  aprovado: boolean;
  /** Percentual: volumeDisponivel / volumeRequerido × 100 [%] */
  utilizacao_pct: number;
  /** A altura total do dique excede 3,0 m (§5.9.2.2)? */
  alturaExcedeMuro: boolean;
  /** Distanciamentos mínimos calculados */
  distanciamentos: DistanciamentoTanque[];
  alertas: AlertaBacia[];
}

// ---------------------------------------------------------------------------
// Dimensionamento de nova bacia
// ---------------------------------------------------------------------------

/** Entrada para dimensionamento de nova bacia de contenção. */
export interface EntradaDimensionarBacia {
  /** Lista de tanques a conter */
  tanques: TanqueBacia[];
  /**
   * Altura máxima admitida para o dique [m].
   * Deve ser ≤ 3,0 m (§5.9.2.2). A sobrealtura de 0,20 m é descontada
   * automaticamente para obter a altura efetiva.
   */
  alturaMaxMuro_m: number;
  /**
   * Sobrealtura (freeboard) [m]. Mínimo: 0,20 m (§5.9.2.2.1).
   * Default: 0,20 m.
   */
  freeboard_m: number;
  /**
   * Relação L/W desejada para a planta da bacia (default: 1,5).
   * Valores entre 1,0 e 3,0 são razoáveis.
   */
  relacaoLC?: number;
  /**
   * Volume adicional de deslocamentos internos (diques, tubulações, etc.) [m³].
   * Default: 0.
   */
  V_deslocamentos_outros_m3?: number;
}

/** Resultado do dimensionamento de nova bacia. */
export interface ResultadoDimensionarBacia {
  /** Volume mínimo requerido (§5.9.2.2.1) [m³] */
  volumeRequerido_m3: number;
  /** Altura efetiva de contenção (sem freeboard) [m] */
  alturaEfetiva_m: number;
  /** Altura total calculada da parede do dique (= alturaEfetiva + freeboard) [m] */
  alturaParede_m: number;
  /** Sobrealtura adotada [m] */
  freeboard_m: number;
  /** Área líquida mínima necessária (V_req / h_efetiva) [m²] */
  areaLiquidaMinima_m2: number;
  /** Área total interna da bacia sugerida (inclui áreas das bases) [m²] */
  areaTotalSugerida_m2: number;
  /** Comprimento interno sugerido da bacia [m] */
  comprimentoSugerido_m: number;
  /** Largura interna sugerida da bacia [m] */
  larguraSugerida_m: number;
  /**
   * A altura calculada excede o limite de 3,0 m?
   * Se true: aumentar a área da bacia ou reduzir o volume dos tanques.
   */
  alturaExcedeLimite: boolean;
  distanciamentos: DistanciamentoTanque[];
  alertas: AlertaBacia[];
}
