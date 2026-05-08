import { describe, expect, it } from "vitest";
import {
  calcularFlange,
  FATOR_MASSA_TIPO,
  FATOR_MASSA_FACE,
  FLANGES_B16_5,
  listarDNsDisponiveis,
} from "../src/flanges.js";

describe("Tabela de flanges ASME B16.5", () => {
  it("cobre DN 1\" a 24\" em ambas as classes 150# e 300#", () => {
    const dns = listarDNsDisponiveis();
    expect(dns).toContain(1);
    expect(dns).toContain(24);
    for (const dn of dns) {
      const c150 = FLANGES_B16_5.find((f) => f.DN_pol === dn && f.classe === "150#");
      const c300 = FLANGES_B16_5.find((f) => f.DN_pol === dn && f.classe === "300#");
      expect(c150, `DN ${dn}" 150# ausente`).toBeDefined();
      expect(c300, `DN ${dn}" 300# ausente`).toBeDefined();
    }
  });

  it("flange 300# é mais pesado que 150# para mesmo DN", () => {
    const dns = listarDNsDisponiveis();
    for (const dn of dns) {
      const c150 = FLANGES_B16_5.find((f) => f.DN_pol === dn && f.classe === "150#")!;
      const c300 = FLANGES_B16_5.find((f) => f.DN_pol === dn && f.classe === "300#")!;
      expect(c300.massa_WN_kg, `DN ${dn}"`).toBeGreaterThan(c150.massa_WN_kg);
    }
  });

  it("WN é a referência (fator 1.0); BL é o mais pesado", () => {
    expect(FATOR_MASSA_TIPO.WN).toBe(1.0);
    expect(FATOR_MASSA_TIPO.BL).toBeGreaterThan(FATOR_MASSA_TIPO.WN);
    expect(FATOR_MASSA_TIPO.SO).toBeLessThan(FATOR_MASSA_TIPO.WN);
  });

  it("RTJ é mais pesado que RF (face usinada)", () => {
    expect(FATOR_MASSA_FACE.RTJ).toBeGreaterThan(FATOR_MASSA_FACE.RF);
  });
});

describe("calcularFlange", () => {
  it("calcula massa de DN 6\" 150# WN/RF (referência ~9.2 kg)", () => {
    const r = calcularFlange({
      DN_pol: 6,
      classe: "150#",
      tipo: "WN",
      face: "RF",
    });
    expect(r.massa_kg).toBeCloseTo(9.2, 1);
    expect(r.dimensao.bore_mm).toBe(154);
    expect(r.dimensao.OD_mm).toBe(279);
  });

  it("aplica fator de tipo (BL > WN > SO > SW)", () => {
    const wn = calcularFlange({ DN_pol: 4, classe: "150#", tipo: "WN", face: "RF" });
    const bl = calcularFlange({ DN_pol: 4, classe: "150#", tipo: "BL", face: "RF" });
    const so = calcularFlange({ DN_pol: 4, classe: "150#", tipo: "SO", face: "RF" });
    expect(bl.massa_kg).toBeGreaterThan(wn.massa_kg);
    expect(wn.massa_kg).toBeGreaterThan(so.massa_kg);
  });

  it("rejeita SW para DN > 4\"", () => {
    expect(() =>
      calcularFlange({ DN_pol: 6, classe: "150#", tipo: "SW", face: "RF" }),
    ).toThrow(/Socket Weld/);
  });

  it("rejeita DN não tabelado", () => {
    expect(() =>
      calcularFlange({ DN_pol: 5, classe: "150#", tipo: "WN", face: "RF" }),
    ).toThrow(/não tabelado/);
  });

  it("memória cita ASME B16.5 e mostra fatores aplicados", () => {
    const r = calcularFlange({ DN_pol: 4, classe: "300#", tipo: "WN", face: "RTJ" });
    expect(r.memoriaCalculo.itemNorma).toBe("ASME B16.5");
    expect(r.memoriaCalculo.parametros.fator_face).toBe(FATOR_MASSA_FACE.RTJ);
    expect(r.memoriaCalculo.parametros.classe).toBe("300#");
  });
});
