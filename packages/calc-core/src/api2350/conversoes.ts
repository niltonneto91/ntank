/**
 * Conversões de unidades — Módulo API 2350.
 *
 * A API 2350 usa US customary como unidade primária em muitas tabelas;
 * o NTANK usa SI internamente e exibe ambos na interface.
 */

/** 1 metro = 39.3701 inches */
export const M_PARA_IN = 39.3701;
/** 1 inch = 25.4 mm */
export const IN_PARA_MM = 25.4;
/** 1 m³ = 6.28981 US barrels (42 US gal = 158.987 L) */
export const M3_PARA_BBL = 6.28981;
/** 1 m³ = 1000 litros */
export const M3_PARA_L = 1000;
/** 1 m³/h = 4.40287 US gpm */
export const M3H_PARA_GPM = 4.40287;
/** 1 m³ = 35.3147 ft³ */
export const M3_PARA_FT3 = 35.3147;

export function mm_para_m(mm: number): number { return mm / 1000; }
export function m_para_mm(m: number): number { return m * 1000; }
export function m_para_in(m: number): number { return m * M_PARA_IN; }
export function in_para_m(inch: number): number { return inch / M_PARA_IN; }
export function mm_para_in(mm: number): number { return mm / IN_PARA_MM; }

export function m3_para_L(m3: number): number { return m3 * M3_PARA_L; }
export function m3_para_bbl(m3: number): number { return m3 * M3_PARA_BBL; }
export function L_para_m3(L: number): number { return L / M3_PARA_L; }

/** mm/min → in/h: × 60 / 25.4 */
export function mmMin_para_inH(mmMin: number): number {
  return (mmMin * 60) / IN_PARA_MM;
}

/** mm/min → mm/h */
export function mmMin_para_mmH(mmMin: number): number {
  return mmMin * 60;
}

/** m³/h → gpm */
export function m3h_para_gpm(m3h: number): number {
  return m3h * M3H_PARA_GPM;
}

/** Minutos → horas */
export function min_para_h(min: number): number { return min / 60; }
export function h_para_min(h: number): number { return h * 60; }

/** Arredondamento */
export function round1(n: number): number { return Math.round(n * 10) / 10; }
export function round2(n: number): number { return Math.round(n * 100) / 100; }
export function round3(n: number): number { return Math.round(n * 1000) / 1000; }
