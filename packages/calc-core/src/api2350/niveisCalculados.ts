/**
 * Cálculo automático de níveis operacionais OPS — API 2350.
 *
 * A lógica desce a partir do nível físico máximo (H_fisico_max) e distribui
 * as cotas MW, HH, AOPS e CH de forma que:
 *   - CH esteja a pelo menos 76 mm (3 in) abaixo do H_fisico_max
 *   - A distância CH − HH acomode o volume de resposta inteiro
 *   - AOPS (se presente) fique entre HH e CH
 *   - MW fique abaixo do HH com a margem operacional informada
 *
 * Não reproduz texto da norma — implementa somente a lógica geométrica
 * (conservação de volume) e a regra dos 76 mm (3 in) de mínimo normativo.
 */

import type {
  EntradaCalculoNiveisOPS,
  ResultadoCalculoNiveisOPS,
  AlertaAPI2350,
} from "./types.js";
import { round3, round1 } from "./conversoes.js";

/** Mínimo normativo de distância HH → CH: 3 in = 76,2 mm (API 2350 §5) */
const DIST_MIN_NORMATIVA_MM = 76.2;

/**
 * Calcula automaticamente os níveis OPS (CH, HH, AOPS, MW) a partir
 * do volume de resposta e das margens operacionais informadas pelo operador.
 *
 * Cascata de cálculo (de cima para baixo):
 *   CH  = H_fisico_max − max(margemCH, 76 mm)
 *   HH  = CH − max(76 mm, V_resposta / A)
 *   AOPS= HH + margemAOPS   (ponto médio se null)
 *   MW  = HH − margemMW
 */
export function calcularNiveisOPS(
  entrada: EntradaCalculoNiveisOPS,
): ResultadoCalculoNiveisOPS {
  const {
    H_fisico_max_m,
    volume_resposta_m3,
    A_m2,
    margemCH_mm,
    margemMW_mm,
    temAOPS,
    margemAOPS_acimadeHH_mm,
  } = entrada;

  const alertas: AlertaAPI2350[] = [];

  // --- 1. CH ----------------------------------------------------------------
  const margemCH_efetiva_mm = Math.max(margemCH_mm, DIST_MIN_NORMATIVA_MM);
  if (margemCH_mm < DIST_MIN_NORMATIVA_MM) {
    alertas.push({
      code: "N010",
      nivel: "ALERTA",
      mensagem:
        `Margem CH informada (${margemCH_mm.toFixed(0)} mm) é menor que o mínimo ` +
        `normativo de 76 mm (3 in). Usando 76 mm.`,
    });
  }
  const CH_m = round3(Math.max(0, H_fisico_max_m - margemCH_efetiva_mm / 1000));

  // --- 2. HH ----------------------------------------------------------------
  // Distância mínima requerida = max(76 mm, V_resposta / A)
  const dist_volume_m = A_m2 > 0 ? volume_resposta_m3 / A_m2 : 0;
  const distancia_requerida_m = Math.max(DIST_MIN_NORMATIVA_MM / 1000, dist_volume_m);
  const distancia_requerida_mm = round1(distancia_requerida_m * 1000);

  const HH_m = round3(Math.max(0, CH_m - distancia_requerida_m));

  if (HH_m <= 0) {
    alertas.push({
      code: "N011",
      nivel: "CRITICO",
      mensagem:
        "Nível HH calculado ≤ 0 m. O volume de resposta é muito grande para a geometria " +
        "do tanque. Reduza o tempo de resposta, a vazão de recebimento ou aumente " +
        "a distância disponível entre CH e o nível físico máximo.",
    });
  }

  // --- 3. AOPS (opcional) ---------------------------------------------------
  let AOPS_m: number | null = null;
  if (temAOPS) {
    const zonaHH_CH_m = CH_m - HH_m;
    const margemUp_m =
      margemAOPS_acimadeHH_mm != null && margemAOPS_acimadeHH_mm > 0
        ? margemAOPS_acimadeHH_mm / 1000
        : zonaHH_CH_m / 2; // padrão: ponto médio

    AOPS_m = round3(
      Math.min(CH_m - DIST_MIN_NORMATIVA_MM / 1000, HH_m + margemUp_m),
    );
    // Garantir que AOPS fique dentro da zona HH–CH
    AOPS_m = round3(Math.max(HH_m, Math.min(CH_m, AOPS_m)));
  }

  // --- 4. MW ----------------------------------------------------------------
  const margemMW_efetiva_mm = Math.max(margemMW_mm, 0);
  const MW_m = round3(Math.max(0, HH_m - margemMW_efetiva_mm / 1000));

  if (MW_m <= 0 && margemMW_mm > 0) {
    alertas.push({
      code: "N012",
      nivel: "ALERTA",
      mensagem:
        "Nível MW calculado ≤ 0 m com a margem MW informada. " +
        "Considere reduzir a margem MW ou o volume de resposta.",
    });
  }

  const distancia_HH_CH_mm = round1((CH_m - HH_m) * 1000);

  return {
    CH_m,
    HH_m,
    AOPS_m,
    MW_m,
    distancia_HH_CH_mm,
    distancia_requerida_mm,
    alertas,
  };
}
