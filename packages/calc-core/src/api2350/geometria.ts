/**
 * Cálculo de taxa máxima de subida de nível — API 2350.
 *
 * A taxa de subida é física pura (lei de conservação de volume):
 *   taxa_subida = Q / A_transversal
 *
 * Não há copyright em fórmulas físicas.
 * A API 2350 exige que este valor seja calculado para cada tanque.
 */

import type {
  EntradaTaxaSubidaAPI2350,
  ResultadoTaxaSubidaAPI2350,
} from "./types.js";
import { mmMin_para_inH, mmMin_para_mmH, round2, round3 } from "./conversoes.js";

/**
 * Calcula a taxa máxima de subida do nível de líquido no tanque.
 *
 * Para tanque cilíndrico vertical sem tabela volumétrica:
 *   A = π × D² / 4  [m²]
 *   taxa [mm/min] = (Q [m³/h] / 60) / A [m²] × 1000
 *
 * Se o usuário informar V/mm na zona superior, usa esse valor diretamente:
 *   taxa [mm/min] = (Q [m³/h] / 60) / (V_por_mm [m³/mm] × 1000)
 *   → simplificando: taxa [mm/min] = Q [m³/h] / (60 × V_por_mm [m³/mm] × 1000)
 *   → taxa [mm/min] = Q [m³/h] / (V_por_mm [m³/mm] × 60 × 1000)
 *
 * Note: V_por_mm [m³/mm] × 1000 [mm/m] = A [m²] equivalente naquela zona.
 */
export function calcularTaxaSubidaNivel(
  entrada: EntradaTaxaSubidaAPI2350,
): ResultadoTaxaSubidaAPI2350 {
  const { D_m, vazaoMax_m3h, vPorMm_m3_mm } = entrada;

  let A_m2: number;
  let metodo: "geometrico" | "manual-v-por-mm";
  let formula: string;

  if (vPorMm_m3_mm && vPorMm_m3_mm > 0) {
    // Modo manual: V/mm fornecido pelo usuário (da tabela de arqueação)
    // A_equivalente = V_por_mm [m³/mm] × 1000 [mm/m] → resultado em m²
    A_m2 = vPorMm_m3_mm * 1000;
    metodo = "manual-v-por-mm";
    formula =
      `A_eq = V/mm × 1000 = ${vPorMm_m3_mm} × 1000 = ${round2(A_m2)} m²\n` +
      `taxa = (Q/60) / A_eq × 1000 = (${vazaoMax_m3h}/60) / ${round2(A_m2)} × 1000`;
  } else {
    // Modo geométrico: cilindro vertical
    A_m2 = (Math.PI * D_m * D_m) / 4;
    metodo = "geometrico";
    formula =
      `A = π × D² / 4 = π × ${D_m}² / 4 = ${round3(A_m2)} m²\n` +
      `taxa = (Q/60) / A × 1000 = (${vazaoMax_m3h}/60) / ${round3(A_m2)} × 1000`;
  }

  // taxa_subida [mm/min] = [m³/h / 60 min/h] / [m²] × 1000 [mm/m]
  const taxaSubida_mm_min = ((vazaoMax_m3h / 60) / A_m2) * 1000;

  return {
    A_m2: round3(A_m2),
    taxaSubida_mm_min: round2(taxaSubida_mm_min),
    taxaSubida_mm_h: round2(mmMin_para_mmH(taxaSubida_mm_min)),
    taxaSubida_in_h: round2(mmMin_para_inH(taxaSubida_mm_min)),
    metodo,
    formula:
      formula +
      ` = ${round2(taxaSubida_mm_min)} mm/min` +
      ` = ${round2(mmMin_para_mmH(taxaSubida_mm_min))} mm/h` +
      ` = ${round2(mmMin_para_inH(taxaSubida_mm_min))} in/h`,
    referenciaNormativa:
      "API Standard 2350, 5th Edition (2020) — cálculo de taxa de subida de nível (física)",
  };
}
