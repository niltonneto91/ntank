/**
 * Teto em dome (calota esférica) autoportante.
 *
 * Conforme API 650 item 5.10.6.1 (forma simplificada para carga
 * combinada vento+neve em pressão atmosférica):
 *
 *     t = R_dome / 1,776            [mm; R_dome em m]
 *
 * (Equivalente a t = R / (4,8 · √(Sd/p)) com Sd = 137 MPa e p ≈ 1 kPa
 *  de carga combinada — a constante 1,776 vem dessa redução.)
 *
 * Faixa típica de R_dome: 0,8·D ≤ R_dome ≤ 1,2·D. Default: R_dome = D.
 * Espessura mínima absoluta: 5 mm + CA.
 *
 * Área da calota esférica:
 *     h_calota = R - √(R² − (D/2)²)
 *     A = 2 · π · R · h_calota
 */

import { selecionarChapaComercial } from "../chapas.js";
import { DENSIDADE_ACO_CARBONO } from "../materiais.js";
import type { EntradaTeto, ResultadoTeto } from "../types.js";

const E_TETO_MIN_NOMINAL_MM = 5;
/** Constante de cálculo para carga combinada atmosférica (API 650 5.10.6.1 reduzida). */
const FATOR_DOME_ATMOSFERICO = 1.776;

export function calcularTetoDomeAutoportante(
  entrada: EntradaTeto,
): ResultadoTeto {
  if (entrada.tipo !== "dome-autoportante") {
    throw new Error(`Tipo incompatível: ${entrada.tipo}`);
  }

  const D_m = entrada.D_mm / 1000;
  // D_teto = diâmetro externo do teto (assenta na face externa do costado)
  const D_teto_m = D_m + 2 * ((entrada.e_costado_base_mm ?? 0) / 1000);
  const R_dome_m = entrada.R_dome_m ?? D_m; // default: R = D (baseado em D nominal)

  if (R_dome_m < 0.8 * D_m || R_dome_m > 1.2 * D_m) {
    throw new Error(
      `R_dome fora da faixa válida (0,8·D a 1,2·D = ${(0.8 * D_m).toFixed(2)} a ` +
        `${(1.2 * D_m).toFixed(2)} m): ${R_dome_m} m`,
    );
  }
  if (R_dome_m < D_m / 2) {
    throw new Error(
      `R_dome (${R_dome_m} m) deve ser maior que o raio do tanque (${(D_m / 2).toFixed(2)} m).`,
    );
  }

  const e_estrutural = R_dome_m / FATOR_DOME_ATMOSFERICO;
  const e_calc = Math.max(E_TETO_MIN_NOMINAL_MM, e_estrutural) + entrada.CA_mm;

  // Mínimo nominal 5 mm, mas não existe chapa de 5 mm no mercado.
  // 3/16" (4,75 mm) é adotado apenas quando o cálculo estrutural ficar
  // abaixo de 4,75 mm. Se o cálculo der >= 4,75 mm (ex.: 4,982 mm),
  // usa-se o valor calculado → próxima chapa comercial (1/4" = 6,35 mm).
  const e_estrutural_efetivo = Math.max(e_estrutural, 4.75);
  const e_para_comercial = e_estrutural_efetivo + entrada.CA_mm;
  const chapa = selecionarChapaComercial(e_para_comercial);

  // Calota esférica — usa D_teto (diâmetro externo) para área real
  const r_tanque = D_teto_m / 2;
  const h_calota = R_dome_m - Math.sqrt(R_dome_m * R_dome_m - r_tanque * r_tanque);
  const area_m2 = 2 * Math.PI * R_dome_m * h_calota;
  const peso_chapa = area_m2 * (chapa.espessura / 1000) * DENSIDADE_ACO_CARBONO;

  return {
    tipo: "dome-autoportante",
    entrada,
    e_calc_mm: e_calc,
    e_adotada_mm: chapa.espessura,
    chapaComercial: chapa,
    area_m2,
    peso_chapa_kg: peso_chapa,
    peso_estrutura_kg: 0,
    pesoTotal_kg: peso_chapa,
    memoriaCalculo: {
      componente: "Teto - Dome autoportante",
      metodo: "API 650 5.10.6.1 (forma reduzida para atmosférico)",
      itemNorma: "API 650, 5.10.6",
      formula: "t = max(5, R_dome / 1,776) + CA",
      parametros: {
        D_m,
        D_teto_m: Number(D_teto_m.toFixed(4)),
        R_dome_m,
        h_calota_m: Number(h_calota.toFixed(4)),
        area_m2: Number(area_m2.toFixed(3)),
        CA_mm: entrada.CA_mm,
      },
      substituicao:
        `t = max(5, ${R_dome_m.toFixed(3)} / 1,776) + ${entrada.CA_mm} = ` +
        `max(5, ${e_estrutural.toFixed(3)}) + ${entrada.CA_mm} = ${e_calc.toFixed(3)} mm`,
      resultado: { valor: e_calc, unidade: "mm" },
      espessuraAdotada: {
        valor: chapa.espessura,
        unidade: "mm",
        justificativa: `Chapa comercial (${chapa.polegada}"). h_calota = ${h_calota.toFixed(2)} m.`,
      },
    },
  };
}
