/**
 * Conversões de unidades para o módulo de ventilação API 2000.
 *
 * Cada função é pura e testável unitariamente.
 * Condições de referência:
 *   Nm³ = 0 °C (273,15 K), 101,325 kPa (normal conditions — DIN 1343)
 *   SCF  = 60 °F (15,56 °C / 288,71 K), 14,696 psia (API / ASME standard)
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Temperatura padrão Nm³ em Kelvin (0 °C) */
export const T_NM3_K = 273.15;

/** Temperatura padrão SCF em Kelvin (60 °F) */
export const T_SCF_K = 288.706; // (60 - 32) × 5/9 + 273.15

/** Fator de conversão Nm³/h → SCFH, derivado da lei dos gases ideais */
export const FATOR_NM3H_PARA_SCFH = (T_SCF_K / T_NM3_K) * 35.3147;
//  35.3147 = ft³/m³ (conversão volumétrica)
//  T_SCF_K / T_NM3_K = ajuste de temperatura entre as duas condições
//  Resultado: 1 Nm³/h = 37.326 SCFH

/** Fator de conversão SCFH → Nm³/h */
export const FATOR_SCFH_PARA_NM3H = 1 / FATOR_NM3H_PARA_SCFH;

// ---------------------------------------------------------------------------
// Vazão de gás
// ---------------------------------------------------------------------------

/**
 * Converte Nm³/h para SCFH (Standard Cubic Feet per Hour).
 * @param Nm3h Vazão em Nm³/h (0 °C, 101,325 kPa)
 * @returns Vazão em SCFH (60 °F, 14,696 psia)
 */
export function nm3hParaScfh(Nm3h: number): number {
  return Nm3h * FATOR_NM3H_PARA_SCFH;
}

/**
 * Converte SCFH para Nm³/h.
 * @param scfh Vazão em SCFH
 * @returns Vazão em Nm³/h
 */
export function scfhParaNm3h(scfh: number): number {
  return scfh * FATOR_SCFH_PARA_NM3H;
}

// ---------------------------------------------------------------------------
// Pressão
// ---------------------------------------------------------------------------

/** Converte kPa(g) para mbar(g) */
export function kPaParaMbar(kPa: number): number { return kPa * 10; }

/** Converte kPa(g) para mmca (mmH2O a 4 °C) */
export function kPaParaMmca(kPa: number): number { return kPa * 101.972; }

/** Converte kPa(g) para oz/in² (ozf/in²) */
export function kPaParaOzIn2(kPa: number): number { return kPa * 4.01463; }

/** Converte kPa(g) para psig */
export function kPaParaPsig(kPa: number): number { return kPa * 0.14504; }

/** Converte kPa(g) para inH2O (coluna d'água a 4 °C) */
export function kPaParaInH2o(kPa: number): number { return kPa * 4.01463; }

/** Converte mbar(g) para kPa(g) */
export function mbarParaKPa(mbar: number): number { return mbar * 0.1; }

/** Converte oz/in² para kPa */
export function ozIn2ParaKPa(oz: number): number { return oz * 0.248843; }

// ---------------------------------------------------------------------------
// Temperatura
// ---------------------------------------------------------------------------

/** Converte °C para K */
export function celsiusParaKelvin(C: number): number { return C + 273.15; }

/** Converte °C para °F */
export function celsiusParaFahrenheit(C: number): number { return C * 9 / 5 + 32; }

/** Converte °F para °C */
export function fahrenheitParaCelsius(F: number): number { return (F - 32) * 5 / 9; }

// ---------------------------------------------------------------------------
// Área
// ---------------------------------------------------------------------------

/** Converte m² para ft² */
export function m2ParaFt2(m2: number): number { return m2 * 10.7639; }

/** Converte ft² para m² */
export function ft2ParaM2(ft2: number): number { return ft2 * 0.09290; }

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

/** Converte m³ para barris (bbl, 42 US gal) */
export function m3ParaBbl(m3: number): number { return m3 * 6.28981; }

/** Converte bbl para m³ */
export function bblParaM3(bbl: number): number { return bbl * 0.158987; }

/** Converte m³ para litros */
export function m3ParaL(m3: number): number { return m3 * 1000; }

// ---------------------------------------------------------------------------
// Correção de temperatura para vazão de gás
// ---------------------------------------------------------------------------

/**
 * Fator de correção de temperatura para converter vazão de gás de condições
 * reais (T_real) para condições normais (0 °C).
 *
 * Q_Nm3h = Q_m3h_real × fator_T
 *
 * Derivado da lei dos gases ideais (P constante = atmosférica):
 *   Q₁/T₁ = Q₂/T₂ → Q_Nm3h = Q_real × (T_NM3_K / T_real_K)
 *
 * @param T_C Temperatura real do gás [°C]
 * @returns Fator adimensional (< 1 para T > 0 °C)
 */
export function fatorCorrecaoTemperatura(T_C: number): number {
  const T_K = celsiusParaKelvin(T_C);
  if (T_K <= 0) return 1; // evitar divisão por zero / valor absurdo
  return T_NM3_K / T_K;
}
