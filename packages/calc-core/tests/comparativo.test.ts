/**
 * Testes do comparativo: executa NBR 7821, 1-Foot e VDP em paralelo
 * e verifica que a recomendação é a de menor custo.
 */

import { describe, expect, it } from "vitest";
import { compararCostado } from "../src/index.js";
import type { EntradaCostado } from "../src/types.js";

const ENTRADA: EntradaCostado = {
  D_mm: 11460,
  H_mm: 19000,
  G: 1.0,
  CA_mm: 1.5,
  larguraChapa_mm: 1500,
  comprimentoChapa_mm: 6000,
};

describe("compararCostado", () => {
  it("retorna 3 variantes (NBR 7821, 1-Foot, VDP)", () => {
    const c = compararCostado(ENTRADA);
    expect(c.variantes).toHaveLength(3);
    const metodos = c.variantes.map((v) => v.resultado.metodo);
    expect(metodos).toContain("NBR 7821 Simplificada");
    expect(metodos).toContain("API 650 1-Foot");
    expect(metodos).toContain("API 650 VDP");
  });

  it("recomendação é a variante de menor custo", () => {
    const c = compararCostado(ENTRADA, 6.5);
    const custoMin = Math.min(...c.variantes.map((v) => v.custo_R$));
    expect(c.recomendada.custo_R$).toBeCloseTo(custoMin, 2);
  });

  it("custo unitário parametrizável (R$ 6,50/kg default → R$ 10/kg)", () => {
    const c1 = compararCostado(ENTRADA, 6.5);
    const c2 = compararCostado(ENTRADA, 10);
    // O custo deve escalar linearmente com o preço unitário.
    for (let i = 0; i < c1.variantes.length; i++) {
      const v1 = c1.variantes[i]!;
      const v2 = c2.variantes[i]!;
      expect(v2.custo_R$ / v1.custo_R$).toBeCloseTo(10 / 6.5, 4);
    }
  });
});
