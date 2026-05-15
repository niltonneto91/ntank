/**
 * Distâncias mínimas entre tanques e entre tanques e diques (muros) —
 * NBR 17505-2:2024 §5.9.2.
 *
 * Regras implementadas (valores a verificar no exemplar licenciado da norma):
 *   - Distância tanque → muro (parede do dique): max(D/6 ; 1,5 m)
 *   - Distância entre tanques adjacentes: max((D1+D2)/6 ; 1,0 m)
 *
 * NÃO reproduz texto integral da norma.
 */

import type { TanqueBacia, DistanciamentoTanque } from "./types.js";

/** Distância mínima absoluta tanque → muro [m] */
const DIST_MIN_TANQUE_MURO_M = 1.5;

/** Distância mínima absoluta entre tanques [m] */
const DIST_MIN_ENTRE_TANQUES_M = 1.0;

/**
 * Distância mínima entre a carcaça do tanque e a face interna do dique.
 *   d_min = max(D/6 ; 1,5 m)
 *
 * @param D_m  Diâmetro externo do tanque [m]
 * @returns    Distância mínima [m]
 */
export function distMinTanqueMuro(D_m: number): number {
  return Math.max(D_m / 6, DIST_MIN_TANQUE_MURO_M);
}

/**
 * Distância mínima entre carcaças de dois tanques adjacentes.
 *   d_min = max((D1+D2)/6 ; 1,0 m)
 *
 * @param D1_m  Diâmetro externo do tanque A [m]
 * @param D2_m  Diâmetro externo do tanque B [m]
 * @returns     Distância mínima [m]
 */
export function distMinEntreATanques(D1_m: number, D2_m: number): number {
  return Math.max((D1_m + D2_m) / 6, DIST_MIN_ENTRE_TANQUES_M);
}

/**
 * Gera a lista completa de distanciamentos mínimos para um conjunto de tanques.
 *
 * Para N tanques produz:
 *   - N entradas "tanque → muro" (uma por tanque)
 *   - N×(N−1)/2 entradas "tanque A → tanque B" (pares únicos)
 *
 * @param tanques  Lista de tanques na bacia
 */
export function calcularDistanciamentos(
  tanques: TanqueBacia[],
): DistanciamentoTanque[] {
  const result: DistanciamentoTanque[] = [];

  // Distância de cada tanque ao muro
  for (const t of tanques) {
    const d = distMinTanqueMuro(t.D_m);
    result.push({
      tagA: t.tag,
      tagB: "muro",
      distanciaMinima_m: parseFloat(d.toFixed(2)),
      formula: `max(D/6 ; 1,50 m) = max(${(t.D_m / 6).toFixed(2)} ; 1,50) = ${d.toFixed(2)} m`,
      referenciaNormativa: "NBR 17505-2 §5.9.2",
    });
  }

  // Distância entre pares de tanques
  for (let i = 0; i < tanques.length; i++) {
    for (let j = i + 1; j < tanques.length; j++) {
      const a = tanques[i]!;
      const b = tanques[j]!;
      const d = distMinEntreATanques(a.D_m, b.D_m);
      result.push({
        tagA: a.tag,
        tagB: b.tag,
        distanciaMinima_m: parseFloat(d.toFixed(2)),
        formula: `max((D1+D2)/6 ; 1,00 m) = max(${((a.D_m + b.D_m) / 6).toFixed(2)} ; 1,00) = ${d.toFixed(2)} m`,
        referenciaNormativa: "NBR 17505-2 §5.9.2",
      });
    }
  }

  return result;
}
