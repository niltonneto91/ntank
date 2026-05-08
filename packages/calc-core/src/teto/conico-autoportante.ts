/**
 * Teto cônico autoportante (sem vigas/colunas internas).
 *
 * Fórmula API 650, item 5.10.5.1 (forma simplificada para carga
 * combinada vento+neve em pressão atmosférica):
 *
 *     t = D / (4,8 · sin θ)         [mm; D em m; θ em radianos]
 *
 * Faixa de validade: 9,5° ≤ θ ≤ 30° (limites construtivos típicos).
 * Espessura mínima absoluta: 5 mm + CA.
 *
 * Área da superfície cônica (envoltório):
 *     A = π · D² / (4 · cos θ)
 */

import { selecionarChapaComercial } from "../chapas.js";
import { DENSIDADE_ACO_CARBONO } from "../materiais.js";
import type { EntradaTeto, ResultadoTeto } from "../types.js";

const E_TETO_MIN_NOMINAL_MM = 5;
const ANGULO_MIN_GRAUS = 9.5;
const ANGULO_MAX_GRAUS = 30;

export function calcularTetoConicoAutoportante(
  entrada: EntradaTeto,
): ResultadoTeto {
  if (entrada.tipo !== "conico-autoportante") {
    throw new Error(`Tipo incompatível: ${entrada.tipo}`);
  }
  const angulo_graus = entrada.anguloCone_graus ?? 15;
  if (angulo_graus < ANGULO_MIN_GRAUS || angulo_graus > ANGULO_MAX_GRAUS) {
    throw new Error(
      `Ângulo do cone fora da faixa autoportante (${ANGULO_MIN_GRAUS}° a ${ANGULO_MAX_GRAUS}°): ${angulo_graus}°. ` +
        `Use cônico SUPORTADO (com vigas) para ângulos fora dessa faixa.`,
    );
  }

  const D_m = entrada.D_mm / 1000;
  // D_teto = diâmetro externo do teto (assenta na face externa do costado)
  const D_teto_m = D_m + 2 * ((entrada.e_costado_base_mm ?? 0) / 1000);
  const angulo_rad = (angulo_graus * Math.PI) / 180;
  const senTheta = Math.sin(angulo_rad);
  const cosTheta = Math.cos(angulo_rad);

  // Espessura calculada com D nominal (governa a resistência estrutural)
  const e_estrutural = D_m / (4.8 * senTheta);
  const e_calc = Math.max(E_TETO_MIN_NOMINAL_MM, e_estrutural) + entrada.CA_mm;

  const chapa = selecionarChapaComercial(e_calc);

  // Área usa D_teto (diâmetro externo) para massa correta
  const area_m2 = (Math.PI * D_teto_m * D_teto_m) / (4 * cosTheta);
  const peso_chapa = area_m2 * (chapa.espessura / 1000) * DENSIDADE_ACO_CARBONO;

  return {
    tipo: "conico-autoportante",
    entrada,
    e_calc_mm: e_calc,
    e_adotada_mm: chapa.espessura,
    chapaComercial: chapa,
    area_m2,
    peso_chapa_kg: peso_chapa,
    peso_estrutura_kg: 0,
    pesoTotal_kg: peso_chapa,
    memoriaCalculo: {
      componente: "Teto - Cônico autoportante",
      metodo: "API 650 5.10.5.1",
      itemNorma: "API 650, 5.10.5",
      formula: "t = max(5, D / (4,8 · sin θ)) + CA",
      parametros: {
        D_m,
        D_teto_m: Number(D_teto_m.toFixed(4)),
        angulo_graus,
        sin_theta: Number(senTheta.toFixed(5)),
        CA_mm: entrada.CA_mm,
      },
      substituicao:
        `D_teto = ${D_m.toFixed(3)} + 2×${((entrada.e_costado_base_mm ?? 0) / 1000).toFixed(4)} = ${D_teto_m.toFixed(4)} m; ` +
        `t = max(5, ${D_m.toFixed(3)} / (4,8 · ${senTheta.toFixed(4)})) + ` +
        `${entrada.CA_mm} = max(5, ${e_estrutural.toFixed(3)}) + ${entrada.CA_mm} ` +
        `= ${e_calc.toFixed(3)} mm`,
      resultado: { valor: e_calc, unidade: "mm" },
      espessuraAdotada: {
        valor: chapa.espessura,
        unidade: "mm",
        justificativa: `Chapa comercial superior (${chapa.polegada}").`,
      },
    },
  };
}
