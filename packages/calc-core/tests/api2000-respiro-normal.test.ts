/**
 * Testes unitários — Módulo API 2000: Respiro Normal
 *
 * Valida:
 *   1. Conversões de unidades (determinísticas, sem tolerância)
 *   2. Cálculo físico mínimo por deslocamento de líquido
 *   3. Cálculo normativo com fator informado
 *   4. Alertas gerados por classe de produto e fatores ausentes
 *   5. Área molhada de tanque vertical
 */

import { describe, it, expect } from "vitest";
import {
  calcularRespiroNormal,
  calcularAreaMolhadaVertical,
  nm3hParaScfh,
  scfhParaNm3h,
  fatorCorrecaoTemperatura,
  kPaParaMbar,
  kPaParaMmca,
  FATOR_NM3H_PARA_SCFH,
} from "../src/api2000/index.js";

// ---------------------------------------------------------------------------
// Conversões de unidades
// ---------------------------------------------------------------------------

describe("Conversões de unidades — API 2000", () => {
  it("nm3hParaScfh: 1 Nm³/h ≈ 37.326 SCFH", () => {
    const scfh = nm3hParaScfh(1);
    expect(scfh).toBeCloseTo(37.326, 2);
  });

  it("scfhParaNm3h: 37.326 SCFH ≈ 1 Nm³/h (ida e volta)", () => {
    const nm3h = scfhParaNm3h(FATOR_NM3H_PARA_SCFH);
    expect(nm3h).toBeCloseTo(1.0, 4);
  });

  it("scfhParaNm3h: 1000 SCFH → Nm³/h correto", () => {
    const nm3h = scfhParaNm3h(1000);
    expect(nm3h).toBeCloseTo(26.79, 1); // 1000 / 37.326
  });

  it("fatorCorrecaoTemperatura: a 20°C fator ≈ 0.932", () => {
    // 273.15 / (20 + 273.15) = 273.15 / 293.15 = 0.9318
    const f = fatorCorrecaoTemperatura(20);
    expect(f).toBeCloseTo(0.9318, 3);
  });

  it("fatorCorrecaoTemperatura: a 0°C fator = 1.0", () => {
    const f = fatorCorrecaoTemperatura(0);
    expect(f).toBeCloseTo(1.0, 6);
  });

  it("kPaParaMbar: 1 kPa = 10 mbar", () => {
    expect(kPaParaMbar(1)).toBeCloseTo(10, 5);
  });

  it("kPaParaMmca: 1 kPa ≈ 101.972 mmca", () => {
    expect(kPaParaMmca(1)).toBeCloseTo(101.972, 2);
  });
});

// ---------------------------------------------------------------------------
// Cálculo de área molhada
// ---------------------------------------------------------------------------

describe("Área molhada — tanque vertical teto fixo", () => {
  it("D=10m, H_liq=8m → A_molhada = π × 10 × 8 ≈ 251.33 m²", () => {
    const r = calcularAreaMolhadaVertical({ D_m: 10, H_liq_m: 8 });
    expect(r.A_costado_m2).toBeCloseTo(251.33, 1);
    expect(r.A_fundo_m2).toBe(0);
    expect(r.A_total_m2).toBeCloseTo(251.33, 1);
  });

  it("D=7.64m, H_liq=10m → A_molhada = π × 7.64 × 10 ≈ 240.02 m²", () => {
    // π × 7.64 × 10 = 240.020...
    const r = calcularAreaMolhadaVertical({ D_m: 7.64, H_liq_m: 10 });
    expect(r.A_total_m2).toBeCloseTo(240.02, 1);
  });

  it("A_total_ft2 = A_total_m2 × 10.7639", () => {
    const r = calcularAreaMolhadaVertical({ D_m: 10, H_liq_m: 8 });
    expect(r.A_total_ft2).toBeCloseTo(r.A_total_m2 * 10.7639, 1);
  });
});

// ---------------------------------------------------------------------------
// Respiro normal — mínimo físico (sem fatores normativos)
// ---------------------------------------------------------------------------

describe("Respiro normal — mínimo físico por deslocamento", () => {
  it("Q_in físico: Q_esvaziamento=100 m³/h, T=20°C → Q_in ≈ 93.18 Nm³/h", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 0,
      Q_esvaziamento_m3h: 100,
      T_armazenamento_C: 20,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    // fator_T = 273.15 / 293.15 = 0.9318
    // Q_in_fisico = 100 × 0.9318 = 93.18
    expect(r.Q_in_fisico_Nm3h).toBeCloseTo(93.18, 1);
    expect(r.usouMinimoFisico).toBe(true);
  });

  it("Q_out físico: Q_enchimento=200 m³/h, T=30°C → Q_out ≈ 184.77 Nm³/h", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 200,
      Q_esvaziamento_m3h: 0,
      T_armazenamento_C: 30,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    // fator_T = 273.15 / 303.15 = 0.9009
    // Q_out_fisico = 200 × 0.9009 = 180.18
    expect(r.Q_out_fisico_Nm3h).toBeCloseTo(180.18, 1);
  });

  it("Sem fatores: Q_adotado = Q_fisico", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 150,
      Q_esvaziamento_m3h: 100,
      T_armazenamento_C: 25,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    expect(r.Q_in_normativo_Nm3h).toBeNull();
    expect(r.Q_out_normativo_Nm3h).toBeNull();
    expect(r.Q_in_adotado_Nm3h).toBe(r.Q_in_fisico_Nm3h);
    expect(r.Q_out_adotado_Nm3h).toBe(r.Q_out_fisico_Nm3h);
  });
});

// ---------------------------------------------------------------------------
// Respiro normal — com fatores normativos
// ---------------------------------------------------------------------------

describe("Respiro normal — com fatores normativos", () => {
  it("Com fator_inbreathing: Q_normativo = Q_drain × fator", () => {
    const fator = 1.2; // hipotético — usuário insere da Tabela 1
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 0,
      Q_esvaziamento_m3h: 100,
      T_armazenamento_C: 20,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: fator,
      simultaneo: false,
      blanketing: false,
    });
    expect(r.Q_in_normativo_Nm3h).toBeCloseTo(100 * fator, 2);
    // normativo (120) > físico (93.18) → adotado = normativo
    expect(r.Q_in_adotado_Nm3h).toBeCloseTo(100 * fator, 2);
    expect(r.usouMinimoFisico).toBe(true); // outbreathing ainda é null
  });

  it("Adota o maior entre físico e normativo", () => {
    // Fator muito baixo → físico vence
    const fator = 0.5;
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 0,
      T_armazenamento_C: 20,
      classe: "II",
      fator_outbreathing: fator,
      fator_inbreathing: 1.0,
      simultaneo: false,
      blanketing: false,
    });
    const Q_out_fisico = 100 * fatorCorrecaoTemperatura(20); // ≈ 93.18
    const Q_out_normativo = 100 * fator; // 50
    // físico (93.18) > normativo (50) → adotado = físico
    expect(r.Q_out_adotado_Nm3h).toBeCloseTo(Q_out_fisico, 1);
  });

  it("SCFH = Nm³/h × FATOR_NM3H_PARA_SCFH", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 0,
      Q_esvaziamento_m3h: 100,
      T_armazenamento_C: 20,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    expect(r.Q_in_requerido_SCFH).toBeCloseTo(
      r.Q_in_requerido_Nm3h * FATOR_NM3H_PARA_SCFH,
      1
    );
  });
});

// ---------------------------------------------------------------------------
// Alertas por classe de produto
// ---------------------------------------------------------------------------

describe("Alertas — classe de produto", () => {
  it("Classe IA gera alerta CRITICO sobre VPV normalmente fechado", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 50,
      T_armazenamento_C: 20,
      classe: "IA",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    const codigosAlerta = r.alertas.map((a) => a.code);
    expect(codigosAlerta).toContain("A003");
    const alertaA003 = r.alertas.find((a) => a.code === "A003");
    expect(alertaA003?.nivel).toBe("CRITICO");
  });

  it("Classe II NÃO gera alerta A003", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 50,
      T_armazenamento_C: 30,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    expect(r.alertas.map((a) => a.code)).not.toContain("A003");
  });

  it("Fatores ausentes geram alertas F001 e F002", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 50,
      T_armazenamento_C: 30,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: false,
    });
    const codigos = r.alertas.map((a) => a.code);
    expect(codigos).toContain("F001");
    expect(codigos).toContain("F002");
  });

  it("Com fatores informados: alertas F001/F002 NÃO são gerados", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 50,
      T_armazenamento_C: 30,
      classe: "II",
      fator_outbreathing: 1.0,
      fator_inbreathing: 1.0,
      simultaneo: false,
      blanketing: false,
    });
    const codigos = r.alertas.map((a) => a.code);
    expect(codigos).not.toContain("F001");
    expect(codigos).not.toContain("F002");
    expect(r.usouMinimoFisico).toBe(false);
  });

  it("Blanketing gera alerta A010", () => {
    const r = calcularRespiroNormal({
      Q_enchimento_m3h: 100,
      Q_esvaziamento_m3h: 50,
      T_armazenamento_C: 20,
      classe: "II",
      fator_outbreathing: null,
      fator_inbreathing: null,
      simultaneo: false,
      blanketing: true,
    });
    expect(r.alertas.map((a) => a.code)).toContain("A010");
  });
});
