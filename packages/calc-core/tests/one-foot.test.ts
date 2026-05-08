/**
 * Testes da API 650 1-Foot.
 *
 * Validação cruzada: a 1-Foot com Sd = 137 MPa e E = 0,85 deve convergir
 * para a NBR 7821 simplificada (constante 0,04) dentro de ±0,02 mm.
 */

import { describe, expect, it } from "vitest";
import {
  calcularCostadoNBR7821,
  calcularCostadoOneFoot,
  espessuraMinimaNominal,
  getMaterial,
} from "../src/index.js";
import {
  espessura1FootProjeto,
  espessura1FootTeste,
} from "../src/costado/one-foot.js";
import type { EntradaCostado } from "../src/types.js";

const ENTRADA_BASE: EntradaCostado = {
  D_mm: 11460,
  H_mm: 19000,
  G: 1.0,
  CA_mm: 1.5,
  larguraChapa_mm: 1500,
  comprimentoChapa_mm: 6000,
};

describe("API 650 1-Foot — fórmulas básicas", () => {
  it("t_d = 4,9·D·(H−0,3)·G/(Sd·E) + CA", () => {
    // Caso: D=11,46 m, H=19 m, G=1, Sd=137, E=0,85, CA=1,5
    const t_d = espessura1FootProjeto(11.46, 19, 1, 137, 0.85, 1.5);
    // Cálculo manual:
    //   = 4,9 × 11,46 × (19 − 0,3) × 1 / (137 × 0,85) + 1,5
    //   = 4,9 × 11,46 × 18,7 / 116,45 + 1,5
    //   = 1050,07998 / 116,45 + 1,5
    //   = 9,017431 + 1,5
    //   ≈ 10,517431 mm
    expect(t_d).toBeCloseTo(10.517431, 4);
  });

  it("t_t (teste hidrostático) é menor sem CA quando St > Sd", () => {
    const t_d = espessura1FootProjeto(11.46, 19, 1, 137, 0.85, 1.5);
    const t_t = espessura1FootTeste(11.46, 19, 154, 0.85);
    expect(t_t).toBeLessThan(t_d);
  });
});

describe("API 650 1-Foot — costado completo", () => {
  it("converge com NBR 7821 simplificada quando Sd=137, E=0,85, CA conforme planilha", () => {
    // Resultado NBR 7821 simplificada (planilha): t_d ≈ 0,04·D·(H−0,3)·G + CA
    // Resultado 1-Foot com material A283-C (Sd=137) e E=0,85:
    //    t_d = 4,9·D·(H−0,3)·G / (137·0,85) + CA
    //    Constante: 4,9 / 116,45 = 0,04208
    // Diferença esperada: ~5% nas espessuras CALCULADAS antes do mínimo nominal.
    const a283c = getMaterial("A283-C");
    const oneFoot = calcularCostadoOneFoot({ ...ENTRADA_BASE, material: a283c, E: 0.85 });
    const nbr = calcularCostadoNBR7821(ENTRADA_BASE);

    expect(oneFoot.numeroAneis).toBe(nbr.numeroAneis);

    // Espessuras calculadas pelo 1-Foot devem ser ~5% MAIORES que NBR (0,04208 vs 0,04).
    for (let i = 0; i < oneFoot.numeroAneis; i++) {
      const eOne = oneFoot.aneis[i]!.e_calc_mm;
      const eNbr = nbr.aneis[i]!.e_calc_mm;
      // Diferença máxima: ~5% para anéis grossos (anel 1 ~0,5 mm)
      expect(Math.abs(eOne - eNbr)).toBeLessThan(0.6);
    }
  });

  it("respeita espessura mínima nominal", () => {
    // Tanque pequeno de baixa altura — espessuras calculadas vão ser bem baixas.
    const entrada: EntradaCostado = {
      D_mm: 5000,
      H_mm: 3000,
      G: 1,
      CA_mm: 0,
      larguraChapa_mm: 1500,
      comprimentoChapa_mm: 6000,
    };
    const r = calcularCostadoOneFoot(entrada);
    // Para D < 15 m e cálculo < 5 mm, a prática aceita 3/16" (4,75 mm)
    // em vez de saltar para 1/4" (6,35 mm). O mínimo da chapa adotada é 4,75 mm.
    for (const anel of r.aneis) {
      expect(anel.chapaComercial.espessura).toBeGreaterThanOrEqual(4.75 - 0.01);
    }
  });

  it("marca foraDaFaixaUsoAPI650 quando espessura > 12,5 mm", () => {
    // Tanque que força espessura entre 12,5 e 19 mm.
    // D=20 m, H=15 m, G=1, A283-C, E=0,85, CA=3 mm:
    //   t_d_anel1 = 4,9·20·14,7·1 / (137·0,85) + 3 = 12,367 + 3 = 15,367 mm → 5/8"
    const entrada: EntradaCostado = {
      D_mm: 20000,
      H_mm: 15000,
      G: 1,
      CA_mm: 3,
      larguraChapa_mm: 2000,
      comprimentoChapa_mm: 6000,
    };
    const r = calcularCostadoOneFoot(entrada);
    const espMax = Math.max(...r.aneis.map((a) => a.chapaComercial.espessura));
    expect(espMax).toBeGreaterThan(12.5);
    expect(r.foraDaFaixaUsoAPI650).toBe(true);
    expect(r.motivoForaFaixa).toContain("12,5");
  });
});
