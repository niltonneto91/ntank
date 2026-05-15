/**
 * Tipos do módulo API 653 — Inspeção, reparo, alteração e reconstrução de tanques.
 *
 * API Standard 653, 5th Edition, 2014 (com adendos).
 *
 * Este módulo foca nas verificações de vida útil (RUL — Remaining Useful Life),
 * espessura mínima aceitável do costado (MAST), re-rating (MAOLL) e
 * avaliação do fundo. Não reproduz texto da norma — implementa apenas a
 * lógica geométrica e as fórmulas matemáticas.
 */

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

/** Status de aprovação de um curso ou componente inspecionado. */
export type StatusCurso = "APROVADO" | "CRITICO" | "REPROVADO";

/** Método de inspeção utilizado na medição de espessura. */
export type MetodologiaInspecao =
  | "UT-convencional"   // Ultrassom manual (UT)
  | "UT-automatizado"   // Ultrassom automatizado (SAUT, AUT)
  | "MFL"               // Magnetic Flux Leakage (fundo)
  | "RT"                // Radiografia
  | "visual"            // Inspeção visual apenas
  | "outro";

/** Tipo de corrosão predominante no tanque. */
export type TipoCorrosao =
  | "interna-uniforme"
  | "interna-localizada"
  | "externa-uniforme"
  | "externa-localizada"
  | "interna-externa"
  | "nenhuma-visivel";

/** Nível de alerta de um resultado de inspeção. */
export type NivelAlertaAPI653 = "CRITICO" | "ALERTA" | "INFO" | "AVISO_LEGAL";

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export interface AlertaAPI653 {
  code: string;
  nivel: NivelAlertaAPI653;
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Medição histórica (campanha de inspeção anterior)
// ---------------------------------------------------------------------------

/**
 * Uma medição de espessura de uma campanha de inspeção anterior.
 * Usada para calcular a taxa de corrosão real por regressão linear
 * quando há 3 ou mais campanhas disponíveis.
 */
export interface MedicaoHistorica {
  /** Espessura medida nessa campanha anterior [mm] */
  t_mm: number;
  /** Data dessa inspeção anterior (ISO 8601: "YYYY-MM-DD") */
  data: string;
}

// ---------------------------------------------------------------------------
// Dados de entrada por curso do costado
// ---------------------------------------------------------------------------

/**
 * Dados de medição de um curso (anel) do costado.
 * Os cursos são numerados de 1 (base) a N (topo).
 */
export interface CursoMedido {
  /** Número do curso: 1 = base, N = topo */
  numero: number;
  /** Altura do curso [m] */
  altura_m: number;
  /** Espessura nominal de projeto [mm] */
  t_nominal_mm: number;
  /**
   * Espessura medida na inspeção atual [mm].
   * Deve ser a leitura mínima representativa do curso
   * (conforme critério da API 653 §4.3).
   */
  t_medida_mm: number;
  /** Espessura medida na inspeção anterior [mm] — mantido para compatibilidade */
  t_anterior_mm?: number | null;
  /** Data da inspeção anterior — mantido para compatibilidade (formato ISO 8601) */
  data_anterior?: string | null;
  /**
   * Histórico de medições anteriores (campanhas passadas), da mais recente à mais antiga.
   * Quando presente, é usado preferencialmente sobre t_anterior_mm / data_anterior.
   * Com 3+ pontos, o cálculo de CR usa regressão linear (mais preciso).
   */
  historico?: MedicaoHistorica[];
  /** Sobrespessura de corrosão original de projeto [mm] — opcional */
  CA_mm?: number | null;
}

// ---------------------------------------------------------------------------
// Entrada MAST — Minimum Allowable Shell Thickness
// ---------------------------------------------------------------------------

export interface EntradaMASTCurso {
  /** Número do curso */
  numero: number;
  /** Altura do curso [m] */
  altura_m: number;
  /**
   * Altura do líquido acima da base deste curso [m].
   * = H_liq_total − cota_base_curso
   */
  H_liq_acima_mm: number;
  /** Diâmetro interno do tanque [m] */
  D_m: number;
  /** Densidade relativa do produto (adimensional, água = 1) */
  G: number;
  /** Tensão admissível do material [MPa] */
  S_MPa: number;
  /** Eficiência de junta (0 < E ≤ 1) */
  E: number;
}

export interface ResultadoMASTCurso {
  numero: number;
  /** Altura de líquido acima do ponto 1-foot deste anel [m] */
  H_liq_acima_m: number;
  t_min_mm: number;
  formula: string;
  referenciaNormativa: string;
}

// ---------------------------------------------------------------------------
// Entrada e resultado — verificação de um curso
// ---------------------------------------------------------------------------

export interface EntradaVerificacaoCurso {
  curso: CursoMedido;
  t_min_mm: number;
  /** Taxa de corrosão aplicada [mm/ano] */
  CR_mm_ano: number;
  /** Data da inspeção atual (ISO 8601) */
  dataInspecao: string;
}

export interface ResultadoVerificacaoCurso {
  numero: number;
  /** Altura do anel [m] */
  altura_m: number;
  /** Cota da base do anel em relação ao fundo [m] */
  cota_base_m: number;
  /** Altura de líquido acima do ponto 1-foot [m] (para MAST) */
  H_liq_acima_m: number;
  t_nominal_mm: number;
  t_medida_mm: number;
  /** Espessura da inspeção anterior [mm] — null se não informada */
  t_anterior_mm: number | null;
  /** Data da inspeção anterior — null se não informada */
  data_anterior: string | null;
  t_min_mm: number;
  t_perda_mm: number;         // t_nominal − t_medida
  t_sobra_mm: number;         // t_medida − t_min
  /** Taxa histórica calculada entre as duas inspeções [mm/ano] — null se sem histórico */
  CR_historica_mm_ano: number | null;
  /** Taxa assumida globalmente pelo operador [mm/ano] */
  CR_assumida_mm_ano: number;
  /** Taxa adotada no cálculo (maior entre histórica e assumida) [mm/ano] */
  CR_mm_ano: number;
  /** Intervalo entre inspeções [anos] — null se sem histórico */
  anos_entre_inspecoes: number | null;
  /** Número de campanhas usadas para o cálculo de CR (incluindo a atual) */
  n_medicoes: number;
  RUL_anos: number | null;    // null quando CR=0 ou t_medida < t_min
  status: StatusCurso;
  alertas: AlertaAPI653[];
}

// ---------------------------------------------------------------------------
// Entrada e resultado — avaliação completa do costado
// ---------------------------------------------------------------------------

export interface EntradaAvaliacaoCostado {
  /** Diâmetro interno [m] */
  D_m: number;
  /** Altura total do tanque [m] */
  H_m: number;
  /** Nível máximo de líquido para projeto [m] */
  H_liq_m: number;
  /** Densidade relativa do produto */
  G: number;
  /** Tensão admissível [MPa] */
  S_MPa: number;
  /** Eficiência de junta */
  E: number;
  /** Cursos medidos (base → topo) */
  cursos: CursoMedido[];
  /** Taxa de corrosão global [mm/ano] — usada quando não há histórico */
  CR_assumida_mm_ano: number;
  /** Data da inspeção atual (ISO 8601) */
  dataInspecao: string;
}

export interface ResultadoAvaliacaoCostado {
  /** Resultados por curso */
  cursos: ResultadoVerificacaoCurso[];
  /** Curso com menor RUL (curso crítico) */
  cursoCritico: ResultadoVerificacaoCurso | null;
  /** Menor RUL entre todos os cursos [anos] */
  RUL_costado_anos: number | null;
  /** Todos os cursos estão acima do mínimo? */
  costadoAprovado: boolean;
  alertas: AlertaAPI653[];
}

// ---------------------------------------------------------------------------
// Entrada e resultado — MAOLL (Maximum Allowable Operating Liquid Level)
// ---------------------------------------------------------------------------

/**
 * Resultado do re-rating: altura máxima de produto permitida considerando
 * as espessuras reais medidas e as mínimas aceitáveis.
 *
 * API 653 §4.3: se algum curso não suporta o nível original de projeto,
 * o operador pode reduzir o nível de operação (re-rating) ao MAOLL.
 */
export interface ResultadoMAOLL {
  /** Nível máximo original de projeto [m] */
  H_liq_projeto_m: number;
  /** MAOLL calculado [m] — pode ser igual ao original se todos aprovados */
  MAOLL_m: number;
  /** Volume disponível no MAOLL [m³] */
  volume_MAOLL_m3: number;
  /** Volume nominal (nível projeto) [m³] */
  volume_nominal_m3: number;
  /** Percentual do volume nominal ainda disponível [%] */
  pct_volume_disponivel: number;
  /** O re-rating foi necessário? */
  reratingNecessario: boolean;
  alertas: AlertaAPI653[];
}

// ---------------------------------------------------------------------------
// Entrada e resultado — Avaliação do fundo
// ---------------------------------------------------------------------------

export interface FundoMedido {
  /** Espessura nominal de projeto do fundo [mm] */
  t_nominal_mm: number;
  /** Espessura mínima medida no fundo [mm] */
  t_medida_mm: number;
  /** Espessura mínima medida nas chapas anelar [mm] — opcional */
  t_anelar_mm?: number | null;
  /** Largura da chapa anelar [mm] — opcional */
  largura_anelar_mm?: number | null;
  /** Espessura medida na inspeção anterior [mm] — mantido para compatibilidade */
  t_anterior_mm?: number | null;
  /** Data da inspeção anterior — mantido para compatibilidade */
  data_anterior?: string | null;
  /**
   * Histórico de medições anteriores do fundo (campanhas passadas), da mais recente à mais antiga.
   * Quando presente, é usado preferencialmente sobre t_anterior_mm / data_anterior.
   * Com 3+ pontos, o cálculo de CR usa regressão linear (mais preciso).
   */
  historico?: MedicaoHistorica[];
  /** Taxa de corrosão assumida para o fundo [mm/ano] */
  CR_assumida_mm_ano: number;
}

export interface ResultadoAvaliacaoFundo {
  t_nominal_mm: number;
  t_medida_mm: number;
  t_min_aceitavel_mm: number;  // 2,5 mm conforme API 653 §4.4
  t_sobra_mm: number;
  CR_mm_ano: number;
  /** Taxa calculada a partir do histórico [mm/ano] — null quando não há histórico */
  CR_historica_mm_ano: number | null;
  /** Taxa assumida pelo operador [mm/ano] */
  CR_assumida_mm_ano: number;
  /** Número de anos entre inspeções (quando histórico disponível) */
  anos_entre_inspecoes: number | null;
  /** Número de campanhas usadas para o cálculo de CR (incluindo a atual) */
  n_medicoes: number;
  RUL_anos: number | null;
  anelarAprovado: boolean | null;    // null quando não informado
  t_anelar_min_mm: number;           // mínimo normativo da anelar
  status: StatusCurso;
  alertas: AlertaAPI653[];
}

// ---------------------------------------------------------------------------
// Entrada e resultado — Avaliação do teto
// ---------------------------------------------------------------------------

/**
 * Dados de medição do teto do tanque.
 * Suporta múltiplas campanhas históricas via campo `historico`.
 */
export interface TetoMedido {
  /** Tipo de teto (informativo) */
  tipo?: "conico" | "dome" | "externo" | "outro";
  /** Espessura nominal de projeto do teto [mm] */
  t_nominal_mm: number;
  /** Espessura mínima medida no teto [mm] */
  t_medida_mm: number;
  /** Espessura da inspeção anterior [mm] — mantido para compatibilidade */
  t_anterior_mm?: number | null;
  /** Data da inspeção anterior — mantido para compatibilidade */
  data_anterior?: string | null;
  /**
   * Histórico de medições anteriores (campanhas passadas), da mais recente à mais antiga.
   * Com 3+ pontos, o CR é calculado por regressão linear.
   */
  historico?: MedicaoHistorica[];
  /** Taxa de corrosão assumida para o teto [mm/ano] */
  CR_assumida_mm_ano: number;
  /**
   * Espessura mínima aceitável para o teto em inspeção de tanque existente [mm].
   *
   * Para tanques existentes (API 653 §4.5.1), não há valor fixo — o engenheiro
   * deve avaliar a adequação estrutural e definir o limite de retirada de serviço.
   * Se omitido, o cálculo usa 2,5 mm (mínimo estrutural absoluto).
   *
   * Nota: 4,76 mm (3/16") é o mínimo de PROJETO para tanques NOVOS (API 650 §5.10.5.2)
   * e NÃO deve ser aplicado diretamente como critério de aposentadoria em inspeções.
   */
  t_min_aceitavel_mm?: number;
}

export interface ResultadoAvaliacaoTeto {
  t_nominal_mm: number;
  t_medida_mm: number;
  /**
   * Espessura mínima aceitável adotada no cálculo [mm].
   * Para tanques novos (API 650): 4,76 mm. Para inspeção (API 653): definida pelo engenheiro.
   */
  t_min_mm: number;
  t_sobra_mm: number;
  CR_mm_ano: number;
  CR_historica_mm_ano: number | null;
  CR_assumida_mm_ano: number;
  anos_entre_inspecoes: number | null;
  /** Número de campanhas usadas para o cálculo de CR (incluindo a atual) */
  n_medicoes: number;
  RUL_anos: number | null;
  status: StatusCurso;
  alertas: AlertaAPI653[];
}

// ---------------------------------------------------------------------------
// Entrada e resultado — Próxima inspeção
// ---------------------------------------------------------------------------

export interface ResultadoProximaInspecao {
  /** Data da inspeção atual */
  dataInspecao: string;
  /** RUL do componente mais crítico (costado ou fundo) [anos] */
  RUL_critico_anos: number | null;
  /** Data máxima recomendada para inspeção interna [ISO 8601] */
  dataProximaInterna: string | null;
  /** Intervalo adotado para inspeção interna [anos] */
  intervaloInterno_anos: number | null;
  /** Data máxima recomendada para inspeção externa [ISO 8601] */
  dataProximaExterna: string | null;
  /** Intervalo adotado para inspeção externa [anos] */
  intervaloExterno_anos: number | null;
  alertas: AlertaAPI653[];
}

// ---------------------------------------------------------------------------
// Taxa de corrosão
// ---------------------------------------------------------------------------

export interface ResultadoTaxaCorrosao {
  /** Taxa calculada a partir do histórico [mm/ano] — null quando não há histórico */
  CR_historica_mm_ano: number | null;
  /** Taxa assumida pelo operador [mm/ano] */
  CR_assumida_mm_ano: number;
  /** Taxa adotada para os cálculos [mm/ano] */
  CR_adotada_mm_ano: number;
  /** Número de anos entre inspeções (quando histórico disponível) */
  anos_entre_inspecoes: number | null;
  /** Número de campanhas usadas para o cálculo de CR (incluindo a atual) */
  n_medicoes: number;
  alertas: AlertaAPI653[];
}
