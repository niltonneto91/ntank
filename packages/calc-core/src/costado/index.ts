/**
 * Dispatcher do cálculo do costado: executa todos os métodos aplicáveis em
 * paralelo e devolve um comparativo com a recomendação de menor custo.
 */

import type { EntradaCostado, ResultadoCostado } from "../types.js";
import { calcularCostadoNBR7821 } from "./nbr-7821.js";
import { calcularCostadoOneFoot } from "./one-foot.js";
import { calcularCostadoVDP } from "./vdp.js";

export interface VarianteCostado {
  readonly resultado: ResultadoCostado;
  readonly custo_R$: number;
}

export interface ComparativoCostado {
  readonly variantes: ReadonlyArray<VarianteCostado>;
  readonly recomendada: VarianteCostado;
  readonly criterioRecomendacao: string;
}

/**
 * Executa todos os métodos aplicáveis e devolve a variante de menor custo.
 *
 * Critério de desempate: aproveitamento de chapa comercial (não calculado
 * aqui — em caso de empate exato em peso, usa ordem de preferência:
 * NBR 7821 → 1-Foot → VDP, refletindo a familiaridade da equipe NTN).
 */
export function compararCostado(
  entrada: EntradaCostado,
  custoAcoPorKg_R$: number = 6.5,
): ComparativoCostado {
  const variantes: VarianteCostado[] = [];

  // 1. NBR 7821 simplificada (replica planilha NTN)
  const nbr = calcularCostadoNBR7821(entrada);
  variantes.push({ resultado: nbr, custo_R$: nbr.pesoTotal_kg * custoAcoPorKg_R$ });

  // 2. API 650 1-Foot (com Sd/E explícitos)
  const oneFoot = calcularCostadoOneFoot(entrada);
  variantes.push({
    resultado: oneFoot,
    custo_R$: oneFoot.pesoTotal_kg * custoAcoPorKg_R$,
  });

  // 3. API 650 VDP (iterativo, geralmente vantajoso para D grande)
  const vdp = calcularCostadoVDP(entrada);
  variantes.push({ resultado: vdp, custo_R$: vdp.pesoTotal_kg * custoAcoPorKg_R$ });

  // Recomendação: menor custo (= menor peso, dado custo unitário fixo).
  // Empate: ordem de preferência da lista (estável).
  const recomendada = variantes.reduce((melhor, atual) =>
    atual.custo_R$ < melhor.custo_R$ ? atual : melhor,
  );

  return {
    variantes,
    recomendada,
    criterioRecomendacao:
      `Menor custo total de aço a R$ ${custoAcoPorKg_R$.toFixed(2)}/kg.`,
  };
}

export { calcularCostadoNBR7821 } from "./nbr-7821.js";
export { calcularCostadoOneFoot } from "./one-foot.js";
export { calcularCostadoVDP } from "./vdp.js";
export { particionarAneis } from "./nbr-7821.js";
