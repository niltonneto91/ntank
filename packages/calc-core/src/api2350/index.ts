/**
 * Módulo API 2350 — Overfill Prevention for Storage Tanks.
 *
 * API Standard 2350, 5th Edition, 2020.
 *
 * Exportações públicas do módulo.
 * Este módulo NÃO calcula respiros (escopo do módulo API 2000).
 */

// Tipos
export type {
  AlertaAPI2350,
  CategoriaOPS,
  ComponentesTempoAPI2350,
  EntradaCategoriaAPI2350,
  EntradaEscopoAPI2350,
  EntradaNiveisAPI2350,
  EntradaTaxaSubidaAPI2350,
  EntradaVolumeRespostaAPI2350,
  NivelAlertaAPI2350,
  ResultadoCategoriaAPI2350,
  ResultadoEscopoAPI2350,
  ResultadoNiveisAPI2350,
  ResultadoTaxaSubidaAPI2350,
  ResultadoTempoRespostaAPI2350,
  ResultadoVolumeRespostaAPI2350,
  ResultadoEscopo,
  StatusVerificacao,
  TipoOPS,
  // Geometria física (câmara de espuma + selo flutuante)
  EntradaGeometriaFisicaAPI2350,
  ResultadoGeometriaFisicaAPI2350,
  // Cálculo automático de níveis OPS
  EntradaCalculoNiveisOPS,
  ResultadoCalculoNiveisOPS,
} from "./types.js";

// Conversões
export {
  IN_PARA_MM,
  M_PARA_IN,
  M3_PARA_BBL,
  M3_PARA_L,
  L_para_m3,
  m3_para_L,
  m3_para_bbl,
  m_para_mm,
  mm_para_m,
  m_para_in,
  mm_para_in,
  mmMin_para_inH,
  mmMin_para_mmH,
  m3h_para_gpm,
  min_para_h,
  round1,
  round2,
  round3,
} from "./conversoes.js";

// Escopo
export { verificarEscopoAPI2350 } from "./escopo.js";

// Geometria
export { calcularTaxaSubidaNivel, calcularAlturaFisicaMaxima } from "./geometria.js";

// Níveis calculados automaticamente
export { calcularNiveisOPS } from "./niveisCalculados.js";

// Resposta
export {
  calcularTempoRespostaAPI2350,
  calcularVolumeRespostaAPI2350,
} from "./resposta.js";

// Níveis
export { verificarNiveisAPI2350 } from "./niveis.js";

// Categoria
export { classificarCategoriaOPS } from "./categoria.js";
