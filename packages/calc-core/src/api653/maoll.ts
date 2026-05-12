/**
 * MAOLL — Maximum Allowable Operating Liquid Level (Re-rating) — API 653 §4.3.
 *
 * Quando um ou mais cursos do costado não suportam o nível de líquido original
 * de projeto (porque a espessura medida está abaixo da MAST para aquele nível),
 * o operador pode reduzir o nível de operação ao MAOLL — o nível máximo em que
 * TODOS os cursos ainda estão aprovados com as espessuras medidas.
 *
 * Abordagem iterativa: para cada nível H tentado (começando pelo projeto e
 * descendo), recalcula a MAST de cada curso e verifica se a espessura medida
 * ainda é ≥ MAST. O MAOLL é o maior nível em que todos os cursos passam.
 *
 * NÃO reproduz texto da norma.
 */

import { round2, round3 } from "./conversoes.js";
import { calcularMASTCurso } from "./espessura-min.js";
import type { CursoMedido, ResultadoMAOLL, AlertaAPI653 } from "./types.js";

/**
 * Calcula o MAOLL — nível máximo de líquido permitido com as espessuras atuais.
 *
 * @param D_m          Diâmetro interno [m]
 * @param H_liq_m      Nível de projeto (nível máximo original) [m]
 * @param G            Densidade relativa do produto
 * @param S_MPa        Tensão admissível [MPa]
 * @param E            Eficiência de junta
 * @param cursos       Cursos com espessuras medidas (base → topo)
 * @param passo_m      Passo da busca iterativa [m] (padrão 0,01 m = 1 cm)
 */
export function calcularMAOLL(
  D_m: number,
  H_liq_m: number,
  G: number,
  S_MPa: number,
  E: number,
  cursos: CursoMedido[],
  passo_m = 0.01,
): ResultadoMAOLL {
  const alertas: AlertaAPI653[] = [];

  if (cursos.length === 0 || D_m <= 0 || S_MPa <= 0 || E <= 0) {
    alertas.push({
      code: "M001",
      nivel: "CRITICO",
      mensagem: "Dados insuficientes para calcular o MAOLL.",
    });
    return {
      H_liq_projeto_m: H_liq_m,
      MAOLL_m: 0,
      volume_MAOLL_m3: 0,
      volume_nominal_m3: 0,
      pct_volume_disponivel: 0,
      reratingNecessario: false,
      alertas,
    };
  }

  // Pré-calcular cotas de base por curso
  const cotas: number[] = [];
  let cota = 0;
  for (const c of cursos) {
    cotas.push(cota);
    cota += c.altura_m;
  }

  /**
   * Verifica se TODOS os cursos estão aprovados para um dado nível H.
   * Retorna true quando todos têm t_medida ≥ MAST(H).
   */
  function todosCursosAprovados(H: number): boolean {
    return cursos.every((c, idx) => {
      const mast = calcularMASTCurso(D_m, H, cotas[idx] ?? 0, c.numero, G, S_MPa, E);
      return c.t_medida_mm >= mast.t_min_mm;
    });
  }

  // Verificar se o nível original já é válido
  let reratingNecessario = false;
  if (todosCursosAprovados(H_liq_m)) {
    // Sem re-rating necessário
    const A_m2 = (Math.PI * D_m * D_m) / 4;
    const volume_nominal_m3 = round3(A_m2 * H_liq_m);
    return {
      H_liq_projeto_m: H_liq_m,
      MAOLL_m: H_liq_m,
      volume_MAOLL_m3: volume_nominal_m3,
      volume_nominal_m3,
      pct_volume_disponivel: 100,
      reratingNecessario: false,
      alertas,
    };
  }

  reratingNecessario = true;

  // Busca iterativa decrescente: encontrar o maior H onde todos aprovam
  let MAOLL = 0;
  const H_total = cursos.reduce((sum, c) => sum + c.altura_m, 0);
  let H_tentativa = Math.min(H_liq_m, H_total);

  while (H_tentativa > 0) {
    H_tentativa = round2(H_tentativa - passo_m);
    if (todosCursosAprovados(H_tentativa)) {
      MAOLL = H_tentativa;
      break;
    }
  }

  const A_m2 = (Math.PI * D_m * D_m) / 4;
  const volume_nominal_m3 = round3(A_m2 * H_liq_m);
  const volume_MAOLL_m3 = round3(A_m2 * MAOLL);
  const pct = volume_nominal_m3 > 0 ? round2((volume_MAOLL_m3 / volume_nominal_m3) * 100) : 0;

  alertas.push({
    code: "M002",
    nivel: "CRITICO",
    mensagem:
      `Re-rating necessário: o nível de operação deve ser reduzido de ` +
      `${H_liq_m.toFixed(2)} m para ${MAOLL.toFixed(2)} m (MAOLL). ` +
      `Volume disponível: ${pct.toFixed(1)}% do nominal.`,
  });

  if (MAOLL <= 0) {
    alertas.push({
      code: "M003",
      nivel: "CRITICO",
      mensagem:
        "MAOLL calculado = 0. O costado não está aprovado para nenhuma altura de produto " +
        "com as espessuras atuais. Reparo ou substituição de chapas necessário.",
    });
  }

  return {
    H_liq_projeto_m: H_liq_m,
    MAOLL_m: MAOLL,
    volume_MAOLL_m3,
    volume_nominal_m3,
    pct_volume_disponivel: pct,
    reratingNecessario,
    alertas,
  };
}
