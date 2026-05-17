/**
 * Cálculos de volume para bacia de contenção — NBR 17505-2:2024 §5.9.2.2.
 *
 * §5.9.2.2.1 (tanques verticais):
 *   Capacidade líquida volumétrica da bacia ≥ volume do maior tanque cheio.
 *   "Capacidade líquida" = volume interno da bacia menos os volumes deslocados
 *   pelas bases dos tanques, diques intermediários e outras estruturas.
 *   A sobrealtura de 0,20 m é acrescida à altura calculada da parede do dique.
 *
 * §5.9.2.2.2 (tanques horizontais):
 *   Capacidade líquida ≥ volume total de TODOS os tanques horizontais na bacia.
 *
 * NÃO reproduz texto integral da norma.
 */

import type { TanqueBacia } from "./types.js";

/** Freeboard mínimo exigido pela norma [m] (NBR 17505-2 §5.9.2.2.1) */
export const FREEBOARD_MINIMO_M = 0.20;

/** Altura máxima do dique medida internamente [m] (NBR 17505-2 §5.9.2.2) */
export const ALTURA_MAX_DIQUE_M = 3.0;

/**
 * Área da base circular de um tanque [m²].
 *
 * Usa o diâmetro do anel de fundação (base de concreto) quando informado e > D_m,
 * pois a fundação desloca mais área que o costado do tanque.
 * Caso contrário usa D_m (diâmetro do costado).
 */
export function areaBaseTanque(D_m: number, diametroAnel_m?: number): number {
  const D = diametroAnel_m && diametroAnel_m > D_m ? diametroAnel_m : D_m;
  return (Math.PI / 4) * D * D;
}

/**
 * Calcula o volume operacional de um tanque cilíndrico vertical:
 *   V = π/4 × D² × H [m³]
 *
 * Para tanques com volume informado diretamente, use esse valor.
 */
export function calcularVolumeTanque(D_m: number, H_m: number): number {
  return (Math.PI / 4) * D_m * D_m * H_m;
}

/**
 * Calcula o volume mínimo requerido para a bacia (NBR 17505-2 §5.9.2.2.1–2.2.2).
 *
 * @param tanques  Lista de tanques na bacia
 * @returns Volume requerido [m³]
 *
 * Lógica:
 * - Tanques verticais: V_req = volume do maior tanque vertical cheio
 * - Tanques horizontais: V_req = soma dos volumes de todos os tanques horizontais
 * - Se há ambos os tipos: V_req = max(V_maior_vertical, V_total_horizontal)
 *   (interpretação conservadora — cada grupo tem sua exigência independente).
 */
export function calcularVolumeRequerido(tanques: TanqueBacia[]): number {
  if (tanques.length === 0) return 0;

  const verticais = tanques.filter((t) => t.orientacao === "vertical");
  const horizontais = tanques.filter((t) => t.orientacao === "horizontal");

  // Exigência para tanques verticais: maior tanque
  const V_maior_vertical =
    verticais.length > 0
      ? Math.max(...verticais.map((t) => t.volume_m3))
      : 0;

  // Exigência para tanques horizontais: soma de todos
  const V_total_horizontal = horizontais.reduce(
    (acc, t) => acc + t.volume_m3,
    0,
  );

  return Math.max(V_maior_vertical, V_total_horizontal);
}

/**
 * Calcula a soma das áreas de base de todos os tanques [m²].
 * Esse valor é descontado da área interna da bacia para obter a área líquida.
 */
export function calcularAreaBasesTanques(tanques: TanqueBacia[]): number {
  return tanques.reduce((acc, t) => acc + areaBaseTanque(t.D_m, t.diametroAnel_m), 0);
}

/**
 * Calcula o volume líquido disponível na bacia (NBR 17505-2 §5.9.2.2.1).
 *
 *   V_liq = (L × W − ΣA_bases) × h_efetiva − V_deslocamentos_outros
 *
 * Onde:
 *   h_efetiva = alturaTotal − freeboard  (freeboard ≥ 0,20 m)
 *
 * @param L_m                     Comprimento interno da bacia [m]
 * @param W_m                     Largura interna da bacia [m]
 * @param tanques                 Tanques na bacia (para cálculo de ΣA_bases)
 * @param alturaTotal_m           Altura total do dique [m] (inclui freeboard)
 * @param freeboard_m             Sobrealtura [m] (mín. 0,20 m)
 * @param V_deslocamentos_outros_m3  Volume de diques intermediários, tubulações, etc. [m³]
 */
export function calcularVolumeDisponivel(
  L_m: number,
  W_m: number,
  tanques: TanqueBacia[],
  alturaTotal_m: number,
  freeboard_m: number,
  V_deslocamentos_outros_m3 = 0,
): number {
  const fb = Math.max(freeboard_m, FREEBOARD_MINIMO_M);
  const h_efetiva = Math.max(alturaTotal_m - fb, 0);
  const A_bases = calcularAreaBasesTanques(tanques);
  const A_liquida = Math.max(L_m * W_m - A_bases, 0);
  const V_bruto = A_liquida * h_efetiva;
  return Math.max(V_bruto - V_deslocamentos_outros_m3, 0);
}

/**
 * Calcula a altura mínima do dique necessária para conter o volume requerido.
 *
 *   h_efetiva_min = V_req / (A_bacia − ΣA_bases)
 *   h_parede = h_efetiva_min + freeboard
 *
 * Retorna h_parede [m]. Se exceder ALTURA_MAX_DIQUE_M, é necessário ampliar a área.
 *
 * @param V_requerido_m3  Volume mínimo requerido [m³]
 * @param L_m             Comprimento interno da bacia [m]
 * @param W_m             Largura interna da bacia [m]
 * @param tanques         Tanques na bacia
 * @param freeboard_m     Sobrealtura [m]
 */
export function calcularAlturaDiqueMinimo(
  V_requerido_m3: number,
  L_m: number,
  W_m: number,
  tanques: TanqueBacia[],
  freeboard_m: number,
): number {
  const fb = Math.max(freeboard_m, FREEBOARD_MINIMO_M);
  const A_bases = calcularAreaBasesTanques(tanques);
  const A_liquida = Math.max(L_m * W_m - A_bases, 0);
  if (A_liquida <= 0) return Infinity;
  const h_efetiva = V_requerido_m3 / A_liquida;
  return h_efetiva + fb;
}
