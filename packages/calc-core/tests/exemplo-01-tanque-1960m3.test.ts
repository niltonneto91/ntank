/**
 * Teste de regressão crítico: replica EXATAMENTE o exemplo da planilha
 * CALCULO DE TANQUES.xlsx (caso 01 — tanque de 1.960 m³).
 *
 * Tolerância: ±0,01 mm na espessura calculada e ±1 kg no peso total.
 *
 * Toda mudança no calc-core que quebrar este teste é uma regressão.
 */

import { describe, expect, it } from "vitest";
import {
  CHAPAS_COMERCIAIS,
  calcularCostadoNBR7821,
  selecionarChapaComercial,
} from "../src/index.js";
import type { EntradaCostado } from "../src/types.js";

const ENTRADA_EXEMPLO_01: EntradaCostado = {
  D_mm: 11460,
  H_mm: 19000,
  G: 1.0,
  CA_mm: 1.5,
  larguraChapa_mm: 1500,
  comprimentoChapa_mm: 6000,
};

const ESPESSURAS_CALCULADAS_ESPERADAS_MM = [
  10.07208, 9.38448, 8.69688, 8.00928, 7.32168, 6.63408,
  5.94648, 5.25888, 4.57128, 3.88368, 3.19608, 2.50848, 1.82088,
];

const CHAPAS_ADOTADAS_ESPERADAS = [
  "1/2", "3/8", "3/8", "3/8", "5/16", "5/16",
  "1/4", "1/4", "3/16", "3/16", "3/16", "3/16", "3/16",
];

const ESPESSURAS_ADOTADAS_ESPERADAS_MM = [
  12.5, 9.5, 9.5, 9.5, 8.0, 8.0,
  6.35, 6.35, 4.75, 4.75, 4.75, 4.75, 4.75,
];

const PESO_TOTAL_PLANILHA_KG = 39668.62;

describe("Exemplo 01 — tanque 1.960 m³ (NBR 7821 simplificada da planilha)", () => {
  const resultado = calcularCostadoNBR7821(ENTRADA_EXEMPLO_01);

  it("particiona em 13 anéis (12 × 1500 + 1 × 1000 mm)", () => {
    expect(resultado.numeroAneis).toBe(13);
    const alturas = resultado.aneis.map((a) => a.altura_mm);
    expect(alturas.slice(0, 12)).toEqual(Array(12).fill(1500));
    expect(alturas[12]).toBe(1000);
  });

  it("calcula 6,000441968... chapas por anel (D · π / 6 m)", () => {
    expect(resultado.chapasPorAnel).toBeCloseTo(6.000441968356506, 9);
  });

  it("calcula espessuras corretas anel por anel (±0,01 mm)", () => {
    expect(resultado.aneis).toHaveLength(13);
    for (let i = 0; i < 13; i++) {
      const e_calc = resultado.aneis[i]!.e_calc_mm;
      const esperado = ESPESSURAS_CALCULADAS_ESPERADAS_MM[i]!;
      expect(e_calc).toBeCloseTo(esperado, 4);
    }
  });

  it("seleciona as chapas comerciais corretas anel por anel", () => {
    for (let i = 0; i < 13; i++) {
      const chapa = resultado.aneis[i]!.chapaComercial;
      expect(chapa.polegada).toBe(CHAPAS_ADOTADAS_ESPERADAS[i]);
      expect(chapa.espessura).toBe(ESPESSURAS_ADOTADAS_ESPERADAS_MM[i]);
    }
  });

  it("calcula peso total do costado dentro de ±1 kg da planilha", () => {
    expect(resultado.pesoTotal_kg).toBeCloseTo(PESO_TOTAL_PLANILHA_KG, 0);
    expect(Math.abs(resultado.pesoTotal_kg - PESO_TOTAL_PLANILHA_KG)).toBeLessThan(1);
  });

  it("calcula peso por anel (anel 1 = 5378,80 kg)", () => {
    expect(resultado.aneis[0]!.peso_kg).toBeCloseTo(5378.79618, 2);
  });

  it("monta lista de corte agrupada por chapa comercial", () => {
    expect(resultado.listaChapas).toHaveLength(5);
    const mapa = new Map(
      resultado.listaChapas.map((c) => [c.chapa.polegada, c.quantidade]),
    );
    // 1 anel × 1/2", 3 anéis × 3/8", 2 anéis × 5/16", 2 anéis × 1/4", 5 anéis × 3/16"
    const chapasPorAnel = resultado.chapasPorAnel;
    expect(mapa.get("1/2")).toBeCloseTo(1 * chapasPorAnel, 5);
    expect(mapa.get("3/8")).toBeCloseTo(3 * chapasPorAnel, 5);
    expect(mapa.get("5/16")).toBeCloseTo(2 * chapasPorAnel, 5);
    expect(mapa.get("1/4")).toBeCloseTo(2 * chapasPorAnel, 5);
    expect(mapa.get("3/16")).toBeCloseTo(5 * chapasPorAnel, 5);
  });

  it("retorna memória de cálculo completa em cada anel", () => {
    const anel1 = resultado.aneis[0]!.memoriaCalculo;
    expect(anel1.metodo).toBe("NBR 7821 Simplificada");
    expect(anel1.itemNorma).toBe("NBR 7821, item 5.4.1 (versão simplificada)");
    expect(anel1.formula).toBe("e = 0,04 · D · (H_ef − 0,3) · G + CA");
    expect(anel1.parametros.D_m).toBe(11.46);
    expect(anel1.parametros.G).toBe(1.0);
    expect(anel1.parametros.CA_mm).toBe(1.5);
    expect(anel1.resultado.valor).toBeCloseTo(10.07208, 4);
    expect(anel1.espessuraAdotada?.valor).toBe(12.5);
  });

  it("calcula área do costado (D · π · H)", () => {
    const esperado = 11.46 * Math.PI * 19;
    expect(resultado.area_m2).toBeCloseTo(esperado, 4);
  });
});

describe("Tabela de chapas comerciais (replica planilha NTN)", () => {
  it("tem 7 chapas cadastradas (3/16 a 3/4)", () => {
    expect(CHAPAS_COMERCIAIS).toHaveLength(7);
  });

  it("seleciona corretamente para casos da planilha", () => {
    expect(selecionarChapaComercial(4.75).polegada).toBe("3/16");
    expect(selecionarChapaComercial(4.7).polegada).toBe("3/16");
    expect(selecionarChapaComercial(4.76).polegada).toBe("1/4");
    expect(selecionarChapaComercial(6.35).polegada).toBe("1/4");
    expect(selecionarChapaComercial(7.0).polegada).toBe("5/16");
    expect(selecionarChapaComercial(8.0).polegada).toBe("5/16");
    expect(selecionarChapaComercial(9.5).polegada).toBe("3/8");
    expect(selecionarChapaComercial(10.07208).polegada).toBe("1/2");
    expect(selecionarChapaComercial(12.5).polegada).toBe("1/2");
    expect(selecionarChapaComercial(16).polegada).toBe("5/8");
    expect(selecionarChapaComercial(19).polegada).toBe("3/4");
  });

  it("rejeita espessura > 19 mm", () => {
    expect(() => selecionarChapaComercial(19.1)).toThrow(/VERIFICAR/);
  });
});
