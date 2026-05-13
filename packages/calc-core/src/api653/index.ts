/**
 * API 653 — Inspeção, reparo, alteração e reconstrução de tanques.
 *
 * Exportações públicas do módulo.
 */

// Cálculos
export { calcularMASTCurso, calcularMASTTodosCursos } from "./espessura-min.js";
export { calcularTaxaCorrosao, calcularTaxasCursos, calcularCRMultiHistorico } from "./corrosao.js";
export { avaliarCostado } from "./vida-util.js";
export { calcularMAOLL } from "./maoll.js";
export { avaliarFundo, T_MIN_FUNDO_MM, T_MIN_ANELAR_MM } from "./fundo.js";
export { avaliarTeto, T_MIN_TETO_MM } from "./teto.js";
export { calcularProximaInspecao } from "./proxima-inspecao.js";

// Conversões
export {
  round1,
  round2,
  round3,
  MPa_para_kPa,
  psi_para_MPa,
  mm_para_m,
  m_para_mm,
  anosEntreDataas,
  adicionarAnos,
} from "./conversoes.js";

// Tipos
export type {
  StatusCurso,
  MetodologiaInspecao,
  TipoCorrosao,
  NivelAlertaAPI653,
  AlertaAPI653,
  MedicaoHistorica,
  CursoMedido,
  EntradaMASTCurso,
  ResultadoMASTCurso,
  EntradaVerificacaoCurso,
  ResultadoVerificacaoCurso,
  EntradaAvaliacaoCostado,
  ResultadoAvaliacaoCostado,
  ResultadoMAOLL,
  FundoMedido,
  ResultadoAvaliacaoFundo,
  TetoMedido,
  ResultadoAvaliacaoTeto,
  ResultadoProximaInspecao,
  ResultadoTaxaCorrosao,
} from "./types.js";
