/**
 * Módulo API 2000 — Ventilação de Tanques Atmosféricos e de Baixa Pressão.
 *
 * API Standard 2000, 7ª edição (2014).
 *
 * Exportações públicas do módulo.
 */

// Tipos
export type {
  AlertaVentilacao,
  ClasseLiquidoAPI2000,
  DispositivoAlivioAPI2000,
  EntradaRespiroNormal,
  NivelAlerta,
  ResultadoRespiroNormal,
  StatusDispositivo,
  TipoDispositivo,
  TipoTanqueAPI2000,
  VerificacaoDispositivo,
} from "./types.js";

// Conversões
export {
  FATOR_NM3H_PARA_SCFH,
  FATOR_SCFH_PARA_NM3H,
  T_NM3_K,
  T_SCF_K,
  bblParaM3,
  celsiusParaFahrenheit,
  celsiusParaKelvin,
  fahrenheitParaCelsius,
  fatorCorrecaoTemperatura,
  ft2ParaM2,
  kPaParaInH2o,
  kPaParaMbar,
  kPaParaMmca,
  kPaParaOzIn2,
  kPaParaPsig,
  m2ParaFt2,
  m3ParaBbl,
  m3ParaL,
  mbarParaKPa,
  nm3hParaScfh,
  ozIn2ParaKPa,
  scfhParaNm3h,
} from "./conversoes.js";

// Cálculo principal — respiro normal
export { calcularRespiroNormal } from "./respiro-normal.js";

// Verificação de dispositivos
export { verificarDispositivo } from "./verificacao-dispositivo.js";

// Área molhada
export {
  calcularAreaMolhadaVertical,
} from "./area-molhada.js";
export type {
  EntradaAreaMolhada,
  ResultadoAreaMolhada,
} from "./area-molhada.js";
