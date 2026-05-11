import { describe, expect, it } from "vitest";
import { calcularTeto } from "../src/teto/index.js";

describe("Teto cônico autoportante", () => {
  it("calcula espessura para D=10 m, θ=15°", () => {
    const r = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "conico-autoportante",
      anguloCone_graus: 15,
    });
    // t = 10 / (4.8 × sin(15°)) = 10 / (4.8 × 0.2588) = 8.05 mm + CA = 9.55 mm
    expect(r.e_calc_mm).toBeCloseTo(9.553, 2);
    // Chapa: 1/2" (12.5 mm) é a comercial superior a 9.55
    expect(r.e_adotada_mm).toBe(12.5);
  });

  it("aplica espessura mínima de 5 mm quando estrutural < 5", () => {
    const r = calcularTeto({
      D_mm: 3000, // pequeno → estrutural pequena
      CA_mm: 1.5,
      tipo: "conico-autoportante",
      anguloCone_graus: 30, // ângulo grande → t estrutural pequena
    });
    // t_estrutural = 3 / (4.8 × sin(30°)) = 3 / 2.4 = 1.25 mm → aplica mínimo 5
    expect(r.e_calc_mm).toBeCloseTo(6.5, 3); // 5 + 1.5
  });

  it("rejeita ângulo fora da faixa autoportante (9.5° a 30°)", () => {
    expect(() =>
      calcularTeto({
        D_mm: 10000,
        CA_mm: 1.5,
        tipo: "conico-autoportante",
        anguloCone_graus: 5,
      }),
    ).toThrow(/autoportante/);
    expect(() =>
      calcularTeto({
        D_mm: 10000,
        CA_mm: 1.5,
        tipo: "conico-autoportante",
        anguloCone_graus: 35,
      }),
    ).toThrow(/autoportante/);
  });

  it("área cônica = π·D²/(4·cos θ)", () => {
    const r = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "conico-autoportante",
      anguloCone_graus: 15,
    });
    const esperada =
      (Math.PI * 100) / (4 * Math.cos((15 * Math.PI) / 180));
    expect(r.area_m2).toBeCloseTo(esperada, 3);
  });

  it("não tem estrutura adicional (autoportante)", () => {
    const r = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "conico-autoportante",
      anguloCone_graus: 15,
    });
    expect(r.peso_estrutura_kg).toBe(0);
    expect(r.pesoTotal_kg).toBe(r.peso_chapa_kg);
  });
});

describe("Teto cônico suportado", () => {
  it("usa espessura mínima 5 + CA na chapa", () => {
    const r = calcularTeto({
      D_mm: 20000,
      CA_mm: 1.5,
      tipo: "conico-suportado",
      anguloCone_graus: 9.5,
    });
    expect(r.e_calc_mm).toBeCloseTo(6.5, 3);
    // Base estrutural 4,75mm (3/16") + CA 1,5mm = 6,25mm → 1/4" (6,35mm) é o comercial ≥ 6,25mm
    expect(r.e_adotada_mm).toBe(6.35);
  });

  it("default paramétrico: detalhe de estrutura com vigas, anel, colunas e conexões", () => {
    const r = calcularTeto({
      D_mm: 20000, // D = 20 m → exige colunas
      CA_mm: 1.5,
      tipo: "conico-suportado",
      anguloCone_graus: 9.5,
    });
    expect(r.detalheEstrutura).toBeDefined();
    const det = r.detalheEstrutura!;
    expect(det.vigas.quantidade).toBeGreaterThanOrEqual(8);
    // perímetro 20·π ≈ 62,8 m → 62,8/1,5 = 41,9 → 42 vigas
    expect(det.vigas.quantidade).toBe(42);
    expect(det.vigas.perfil).toMatch(/UPN/);
    expect(det.anelCentral.diametro_m).toBeCloseTo(2, 1); // 0,10 × 20
    expect(det.colunas.quantidade).toBeGreaterThanOrEqual(1);
    expect(det.massa_conexoes_kg).toBeGreaterThan(0);
  });

  it("D < 12 m: sempre 1 tubo central (regra NTN)", () => {
    const r = calcularTeto({
      D_mm: 8000,
      CA_mm: 1.5,
      tipo: "conico-suportado",
      anguloCone_graus: 9.5,
    });
    expect(r.detalheEstrutura!.colunas.quantidade).toBe(1);
  });

  it("D ≥ 18 m: mais de 1 coluna", () => {
    const r = calcularTeto({
      D_mm: 24000,
      CA_mm: 1.5,
      tipo: "conico-suportado",
      anguloCone_graus: 9.5,
    });
    expect(r.detalheEstrutura!.colunas.quantidade).toBeGreaterThan(1);
  });

  it("vigas radiais espaçadas a ~1,5 m: D=8 m → ceil(π·8/1,5)=17 vigas", () => {
    const r = calcularTeto({
      D_mm: 8000,
      CA_mm: 1.5,
      tipo: "conico-suportado",
      anguloCone_graus: 9.5,
    });
    expect(r.detalheEstrutura!.vigas.quantidade).toBe(17);
  });

  it("modo legado: pesoEstruturaPorM2_kg desativa o detalhe paramétrico", () => {
    const r = calcularTeto({
      D_mm: 20000,
      CA_mm: 1.5,
      tipo: "conico-suportado",
      anguloCone_graus: 9.5,
      pesoEstruturaPorM2_kg: 50,
    });
    expect(r.peso_estrutura_kg).toBeCloseTo(r.area_m2 * 50, 2);
    expect(r.detalheEstrutura).toBeUndefined();
  });
});

describe("Teto dome autoportante", () => {
  it("calcula para D=10 m, R_dome = D = 10 m", () => {
    const r = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "dome-autoportante",
      R_dome_m: 10,
    });
    // t_estrutural = 10 / 1.776 = 5.63 mm → +CA = 7.13
    expect(r.e_calc_mm).toBeCloseTo(7.13, 1);
  });

  it("default R_dome = D quando não informado", () => {
    const r1 = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "dome-autoportante",
    });
    const r2 = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "dome-autoportante",
      R_dome_m: 10,
    });
    expect(r1.e_calc_mm).toBeCloseTo(r2.e_calc_mm, 5);
    expect(r1.area_m2).toBeCloseTo(r2.area_m2, 5);
  });

  it("rejeita R_dome fora da faixa 0.8·D a 1.2·D", () => {
    expect(() =>
      calcularTeto({
        D_mm: 10000,
        CA_mm: 1.5,
        tipo: "dome-autoportante",
        R_dome_m: 7,
      }),
    ).toThrow(/R_dome/);
    expect(() =>
      calcularTeto({
        D_mm: 10000,
        CA_mm: 1.5,
        tipo: "dome-autoportante",
        R_dome_m: 13,
      }),
    ).toThrow(/R_dome/);
  });

  it("área da calota = 2·π·R·h_calota com h_calota = R - √(R² - r²)", () => {
    const r = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "dome-autoportante",
      R_dome_m: 10,
    });
    const h = 10 - Math.sqrt(100 - 25);
    const esperada = 2 * Math.PI * 10 * h;
    expect(r.area_m2).toBeCloseTo(esperada, 3);
  });

  it("memória de cálculo cita item normativo correto", () => {
    const r = calcularTeto({
      D_mm: 10000,
      CA_mm: 1.5,
      tipo: "dome-autoportante",
    });
    expect(r.memoriaCalculo.itemNorma).toBe("API 650, 5.10.6");
    expect(r.memoriaCalculo.formula).toContain("R_dome");
  });
});
