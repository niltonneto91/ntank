import { describe, expect, it } from "vitest";
import { calcularFundo } from "../src/fundo.js";
import { selecionarChapaComercial } from "../src/chapas.js";

describe("calcularFundo — corpo do fundo", () => {
  it("usa espessura mínima nominal 6 mm + CA", () => {
    const r = calcularFundo({
      D_mm: 8000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
    });
    expect(r.e_calc_mm).toBeCloseTo(7.5, 6); // 6 + 1.5
    // chapa comercial superior = 5/16" (8 mm)
    expect(r.e_adotada_mm).toBe(8);
    expect(r.chapaComercial.polegada).toBe("5/16");
  });

  it("calcula área com D_fundo = D + 2×e_costado + 100mm", () => {
    // D_fundo = D_nominal + 2×e_1º_anel + 100mm overhang (API 650, 5.4)
    const e_costado = 8; // mm — chapa comercial 5/16"
    const r = calcularFundo({
      D_mm: 10000, // D nominal = 10 m
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
      e_costado_base_mm: e_costado,
    });
    const D_fundo = 10 + 2 * (e_costado / 1000) + 0.100; // 10.116 m
    expect(r.area_m2).toBeCloseTo((Math.PI * D_fundo * D_fundo) / 4, 4);
    // área deve ser maior que o nominal π×D²/4 = 78.54 m²
    expect(r.area_m2).toBeGreaterThan((Math.PI * 100) / 4);
  });

  it("massa do corpo = área × espessura × densidade", () => {
    const r = calcularFundo({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
    });
    const esperado = r.area_m2 * (r.e_adotada_mm / 1000) * 7850;
    expect(r.peso_corpo_kg).toBeCloseTo(esperado, 2);
  });

  it("expõe memória de cálculo rastreável (item norma e fórmula)", () => {
    const r = calcularFundo({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
    });
    expect(r.memoriaCalculo.itemNorma).toContain("API 650");
    expect(r.memoriaCalculo.formula).toContain("e_min_nominal");
    expect(r.memoriaCalculo.parametros.D_m).toBe(10);
  });
});

describe("calcularFundo — anel anular", () => {
  it("aplica anel anular quando D ≥ 12 m", () => {
    const r = calcularFundo({
      D_mm: 12000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
    });
    expect(r.anelAnular).toBeDefined();
    expect(r.anelAnular!.largura_mm).toBe(700);
  });

  it("não aplica anel anular para D pequeno e costado fino", () => {
    const r = calcularFundo({
      D_mm: 6000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
      e_costado_base_mm: 8, // < 13 mm
    });
    expect(r.anelAnular).toBeUndefined();
  });

  it("aplica anel anular quando e_costado_base ≥ 13 mm mesmo com D pequeno", () => {
    const r = calcularFundo({
      D_mm: 8000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
      e_costado_base_mm: 14,
    });
    expect(r.anelAnular).toBeDefined();
  });

  it("não aplica anel anular quando tipo é cônico-centro", () => {
    const r = calcularFundo({
      D_mm: 15000,
      CA_mm: 1.5,
      tipo: "conico-centro",
    });
    expect(r.anelAnular).toBeUndefined();
  });

  it("espessura do anel é >= e_costado_base − 1 mm e >= 6,35 mm", () => {
    const r = calcularFundo({
      D_mm: 15000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
      e_costado_base_mm: 16,
    });
    expect(r.anelAnular!.espessura_mm).toBeGreaterThanOrEqual(15);
  });

  it("anel anular respeita largura customizada", () => {
    const r = calcularFundo({
      D_mm: 15000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
      larguraAnelAnular_mm: 1000,
    });
    expect(r.anelAnular!.largura_mm).toBe(1000);
  });

  it("massa total = corpo + anel anular", () => {
    const r = calcularFundo({
      D_mm: 15000,
      CA_mm: 1.5,
      tipo: "plano-com-anel-anular",
    });
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.peso_corpo_kg + r.anelAnular!.peso_kg,
      2,
    );
  });
});

describe("calcularFundo — validação de entrada", () => {
  it("rejeita D ≤ 0", () => {
    expect(() =>
      calcularFundo({ D_mm: 0, CA_mm: 1.5, tipo: "plano-com-anel-anular" }),
    ).toThrow();
  });
  it("rejeita CA negativo", () => {
    expect(() =>
      calcularFundo({ D_mm: 1000, CA_mm: -1, tipo: "plano-com-anel-anular" }),
    ).toThrow();
  });
});

describe("selecionarChapaComercial × fundo (sanidade)", () => {
  it("para CA=3, fundo deve ser 9 mm → seleciona 3/8 (9.5 mm)", () => {
    const chapa = selecionarChapaComercial(9);
    expect(chapa.espessura).toBe(9.5);
  });
});
