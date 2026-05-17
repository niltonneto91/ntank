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
  /**
   * Altura do anel de fundação (base de concreto/areia) acima do piso da bacia [m].
   * Valores típicos: 0,15 a 0,60 m. Default: 0.
   * Documentado na memória de cálculo; não altera o cálculo de volume §5.9.2.2.1.
   */
  alturaAnel_m?: number;
  /**
   * Diâmetro externo da base de fundação (anel de concreto) [m].
   * Quando informado e > D_m, é usado no cálculo da área de base descontada da bacia.
   * Tipicamente 0,5 m a 1,0 m maior que D_m (depende do projeto civil).
   */
  diametroAnel_m?: number;
  /**
   * Fileira preferencial do tanque no layout da bacia: 0 = superior, 1 = inferior.
   * Se undefined, o algoritmo decide automaticamente pelo diâmetro (maiores → superior).
   */
  fileira?: 0 | 1;
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
// Layout geométrico de tanques
// ---------------------------------------------------------------------------

/** Posição calculada de um tanque no plano da bacia (em metros, origem = canto interno sup-esq). */
export interface PosicaoTanqueBacia {
  /** ID do tanque */
  id: string;
  /** Coordenada X do centro do tanque [m] a partir do canto esq interno da bacia */
  cx_m: number;
  /** Coordenada Y do centro do tanque [m] a partir do canto sup interno da bacia */
  cy_m: number;
  /** Raio externo do tanque [m] (= D_m / 2) */
  r_m: number;
  /** Fileira: 0 = superior, 1 = inferior */
  fileira: 0 | 1;
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
// Detalhamento de deslocamentos internos
// ---------------------------------------------------------------------------

/**
 * Decomposição dos volumes que ocupam espaço interno da bacia,
 * reduzindo o volume líquido disponível para contenção.
 */
export interface DetalhamentoDeslocamentos {
  /** Volume deslocado pelos anéis de fundação (base de concreto) de TODOS os tanques [m³] */
  V_desl_bases_m3: number;
  /**
   * Volume deslocado pelo corpo dos tanques NÃO-MAIORES acima dos anéis de fundação [m³].
   * O tanque maior é excluído porque, ao falhar, seu interior fica acessível ao líquido.
   */
  V_desl_corpos_m3: number;
  /** Volume de muretas intermediárias, tubulações e outros informados pelo usuário [m³] */
  V_desl_outros_m3: number;
  /** Soma total de todos os deslocamentos [m³] */
  V_desl_total_m3: number;
}

// ---------------------------------------------------------------------------
// Verificação de bacia existente
// ---------------------------------------------------------------------------

/** Entrada para verificação de bacia de contenção existente (NBR 17505-2 §5.9.2). */
export interface EntradaVerificarBacia {
  /** Lista de tanques contidos na bacia */
  tanques: TanqueBacia[];
  /**
   * Dimensão interna — comprimento (L) da bacia [m].
   * Obrigatório quando `area_m2` não for informado (bacia retangular).
   */
  comprimento_m?: number;
  /**
   * Dimensão interna — largura (W) da bacia [m].
   * Obrigatório quando `area_m2` não for informado (bacia retangular).
   */
  largura_m?: number;
  /**
   * Área interna disponível [m²] — use para bacias de formato irregular
   * (L, T, bordas arredondadas, recortes etc.).
   * Substitui `comprimento_m × largura_m` no cálculo de volume.
   * Quando informado, `comprimento_m` e `largura_m` são ignorados para o volume
   * e usados apenas para a visualização geométrica SVG (se disponíveis).
   */
  area_m2?: number;
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
   *   = A_interna × h_efetiva − V_desl_bases − V_desl_corpos − V_desl_outros
   */
  volumeDisponivel_m3: number;
  /** Altura efetiva para contenção: alturaTotal − freeboard [m] */
  alturaEfetiva_m: number;
  /** Sobrealtura adotada [m] */
  freeboard_m: number;
  /** Decomposição dos volumes deslocados internamente */
  deslocamentos: DetalhamentoDeslocamentos;
  /** A bacia atende ao volume mínimo requerido? */
  aprovado: boolean;
  /** Percentual: volumeDisponivel / volumeRequerido × 100 [%] */
  utilizacao_pct: number;
  /** A altura total do dique excede 3,0 m (§5.9.2.2)? */
  alturaExcedeMuro: boolean;
  /**
   * Área interna efetiva utilizada no cálculo [m²].
   * = comprimento_m × largura_m (bacia retangular) ou area_m2 (forma irregular).
   */
  areaInterna_m2: number;
  /** Distanciamentos mínimos calculados */
  distanciamentos: DistanciamentoTanque[];
  /** Posições geométricas dos tanques no plano da bacia (para SVG) */
  posicoesTanques: PosicaoTanqueBacia[];
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
  /** Área líquida mínima aproximada (V_req / h_efetiva) [m²] */
  areaLiquidaMinima_m2: number;
  /** Área total interna da bacia sugerida [m²] */
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
  /** Decomposição dos volumes deslocados internamente (calculada na h_efetiva final) */
  deslocamentos: DetalhamentoDeslocamentos;
  distanciamentos: DistanciamentoTanque[];
  /** Posições geométricas dos tanques no plano da bacia (para SVG) */
  posicoesTanques: PosicaoTanqueBacia[];
  alertas: AlertaBacia[];
}
