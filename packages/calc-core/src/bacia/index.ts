/**
 * Módulo Bacia de Contenção — NBR 17505-2:2024 §5.9.2.
 *
 * Exportações públicas do módulo.
 */

// Cálculos
export { verificarBacia, dimensionarBacia, calcularPosicoesTanques } from "./dimensionamento.js";
export {
  calcularVolumeRequerido,
  calcularVolumeDisponivel,
  calcularAreaBasesTanques,
  calcularDeslocamentos,
  calcularAlturaDiqueMinimo,
  calcularVolumeTanque,
  areaBaseTanque,
  FREEBOARD_MINIMO_M,
  ALTURA_MAX_DIQUE_M,
} from "./volume.js";
export {
  distMinTanqueMuro,
  distMinEntreATanques,
  calcularDistanciamentos,
} from "./distanciamentos.js";

// Tipos
export type {
  TanqueBacia,
  OrientacaoTanque,
  NivelAlertaBacia,
  AlertaBacia,
  DetalhamentoDeslocamentos,
  DistanciamentoTanque,
  PosicaoTanqueBacia,
  EntradaVerificarBacia,
  ResultadoVerificarBacia,
  EntradaDimensionarBacia,
  ResultadoDimensionarBacia,
} from "./types.js";
