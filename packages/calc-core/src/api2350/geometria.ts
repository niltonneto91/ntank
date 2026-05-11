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
  EntradaGeometriaFisicaAPI2350,
  ResultadoGeometriaFisicaAPI2350,
  AlertaAPI2350,
} from "./types.js";
import { mmMin_para_inH, mmMin_para_mmH, round2, round3 } from "./conversoes.js";

/**
 * Calcula o nível físico máximo de produto levando em conta a câmara de espuma
 * e o diâmetro da boia do selo flutuante interno.
 *
 * H_fisico_max = H_total − dist_camara_espuma − diametro_boia
 *
 * A câmara de espuma ocupa espaço no topo do costado (o produto não deve
 * ultrapassar a borda inferior da câmara). O diâmetro da boia do selo
 * flutuante interno é a folga necessária entre o produto e o teto para que
 * o selo flutue sem tocar — ultrapassar esse limite causaria dano ao selo.
 */
export function calcularAlturaFisicaMaxima(
  entrada: EntradaGeometriaFisicaAPI2350,
): ResultadoGeometriaFisicaAPI2350 {
  const alertas: AlertaAPI2350[] = [];
  let camaraEspuma_m = 0;
  let seloFlutuante_m = 0;

  if (entrada.temCamaraEspuma) {
    if (!entrada.distCamaraEspuma_m || entrada.distCamaraEspuma_m <= 0) {
      alertas.push({
        code: "G001",
        nivel: "ALERTA",
        mensagem:
          "Câmara de espuma declarada, mas distância (borda inferior → teto) não informada. " +
          "Informe a medida para que o nível físico máximo seja calculado corretamente.",
      });
    } else {
      camaraEspuma_m = entrada.distCamaraEspuma_m;
    }
  }

  if (entrada.temSeloFlutuanteInterno) {
    if (!entrada.diametroBoia_m || entrada.diametroBoia_m <= 0) {
      alertas.push({
        code: "G002",
        nivel: "ALERTA",
        mensagem:
          "Selo flutuante interno (IFR) declarado, mas diâmetro da boia não informado. " +
          "Informe o diâmetro para limitar corretamente o nível máximo de produto.",
      });
    } else {
      seloFlutuante_m = entrada.diametroBoia_m;
    }
  }

  const total_m = camaraEspuma_m + seloFlutuante_m;
  const H_fisico_max_m = round3(Math.max(0, entrada.H_total_m - total_m));

  const partes: string[] = [`H_total = ${entrada.H_total_m} m`];
  if (camaraEspuma_m > 0) partes.push(`câmara espuma = ${camaraEspuma_m} m`);
  if (seloFlutuante_m > 0) partes.push(`boia selo = ${seloFlutuante_m} m`);
  const formula =
    `H_fisico_max = ${partes.join(" − ")} = ${H_fisico_max_m} m`;

  return {
    H_fisico_max_m,
    descontos: { camaraEspuma_m, seloFlutuante_m, total_m: round3(total_m) },
    formula,
    alertas,
  };
}

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
