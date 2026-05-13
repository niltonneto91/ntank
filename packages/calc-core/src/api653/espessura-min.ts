/**
 * Espessura mínima aceitável do costado — API 653 §4.3.
 *
 * A API 653 usa a mesma fórmula do 1-Foot Method da API 650 para calcular
 * a espessura mínima aceitável de um curso existente, porém avaliada em
 * função da espessura MEDIDA (não projetada) para verificar se o curso
 * ainda está dentro dos limites de integridade.
 *
 * Fórmula (API 653 §4.3.2 / derivada da API 650 §5.6.3):
 *   t_min = 2,6 × D × H_liq × G / (S × E)
 *
 * onde:
 *   D       = diâmetro interno do tanque [m]
 *   H_liq   = altura de líquido acima de 0,3 m da base do curso [m]
 *             = (H_liq_total − cota_base_curso − 0,3), mín. = 0
 *   G       = densidade relativa do líquido (água = 1,0)
 *   S       = tensão admissível do aço [MPa]
 *   E       = eficiência de junta (0 < E ≤ 1)
 *
 * Nota: 2,6 é o fator resultante da conversão ft × psi → mm × MPa
 * (1 ft = 0,3048 m; 1 psi = 0,00689476 MPa; fator = 0,3048 / 0,00689476 ≈ 44,2
 * → simplificado a 2,6 com D em m, h em m, S em MPa — ver derivação em API 650).
 *
 * NÃO reproduz texto da norma — implementa apenas a fórmula matemática.
 */

import { round3 } from "./conversoes.js";
import type { ResultadoMASTCurso } from "./types.js";

/**
 * Calcula a espessura mínima aceitável (MAST) de um curso do costado.
 *
 * @param D_m         Diâmetro interno [m]
 * @param H_liq_total Altura total de líquido no tanque [m]
 * @param cota_base_m Cota da base deste curso [m] (= soma das alturas dos cursos abaixo)
 * @param numeroCurso Número do curso (apenas para identificação)
 * @param G           Densidade relativa do líquido
 * @param S_MPa       Tensão admissível do material [MPa]
 * @param E           Eficiência de junta
 */
export function calcularMASTCurso(
  D_m: number,
  H_liq_total: number,
  cota_base_m: number,
  numeroCurso: number,
  G: number,
  S_MPa: number,
  E: number,
): ResultadoMASTCurso {
  // Altura de líquido acima do ponto de projeto (1-foot = 0,3 m acima da base)
  const H_liq_acima_m = Math.max(0, H_liq_total - cota_base_m - 0.3);

  const t_min_mm =
    S_MPa > 0 && E > 0
      ? round3((2.6 * D_m * H_liq_acima_m * G) / (S_MPa * E))
      : 0;

  return {
    numero: numeroCurso,
    H_liq_acima_m: round3(H_liq_acima_m),
    t_min_mm,
    formula: `t_min = 2,6 × D × H_liq × G / (S × E) = 2,6 × ${D_m} × ${round3(H_liq_acima_m)} × ${G} / (${S_MPa} × ${E}) = ${t_min_mm} mm`,
    referenciaNormativa: "API 653, 5ª ed., §4.3.2",
  };
}

/**
 * Calcula a MAST para todos os cursos de um tanque.
 * Os cursos devem estar ordenados de base (1) ao topo (N).
 *
 * @param D_m         Diâmetro interno [m]
 * @param H_liq_m     Nível máximo de líquido [m]
 * @param G           Densidade relativa
 * @param S_MPa       Tensão admissível [MPa]
 * @param E           Eficiência de junta
 * @param alturas_m   Array com a altura de cada curso [m], do 1° ao N°
 */
export function calcularMASTTodosCursos(
  D_m: number,
  H_liq_m: number,
  G: number,
  S_MPa: number,
  E: number,
  alturas_m: number[],
): ResultadoMASTCurso[] {
  const resultados: ResultadoMASTCurso[] = [];
  let cota_base = 0;

  for (let i = 0; i < alturas_m.length; i++) {
    const resultado = calcularMASTCurso(
      D_m,
      H_liq_m,
      cota_base,
      i + 1,
      G,
      S_MPa,
      E,
    );
    resultados.push(resultado);
    cota_base += alturas_m[i] ?? 0;
  }

  return resultados;
}
