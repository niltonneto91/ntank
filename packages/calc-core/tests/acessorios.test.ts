import { describe, expect, it } from "vitest";
import {
  calcularAcessorios,
  calcularEscada,
  calcularGuardaCorpoEscada,
  calcularPlataforma,
} from "../src/acessorios.js";

describe("Escada helicoidal externa", () => {
  it("calcula comprimento pela diagonal L = H / sin θ", () => {
    const r = calcularEscada({
      tipo: "helicoidal-externa",
      D_mm: 8000,
      H_mm: 10000,
      anguloHelicoidal_graus: 50,
    });
    const esperado = 10 / Math.sin((50 * Math.PI) / 180);
    expect(r.comprimento_m).toBeCloseTo(esperado, 3);
  });

  it("usa defaults NTN: largura 750, passo do pé 250, ângulo 20°", () => {
    const r = calcularEscada({
      tipo: "helicoidal-externa",
      D_mm: 8000,
      H_mm: 10000,
    });
    // riser = 250 × tan(20°) ≈ 91 mm → fora da faixa 150-300, gera aviso
    expect(r.passoPe_mm).toBe(250);
    expect(r.alturaDegrau_mm).toBeCloseTo(250 * Math.tan((20 * Math.PI) / 180), 1);
    expect(r.avisos.some((a) => a.includes("Altura entre degraus"))).toBe(true);
  });

  it("relação altura = passo do pé × tan θ", () => {
    const r = calcularEscada({
      tipo: "helicoidal-externa",
      D_mm: 8000,
      H_mm: 10000,
      anguloHelicoidal_graus: 35,
      passoPe_mm: 250,
    });
    expect(r.alturaDegrau_mm).toBeCloseTo(
      250 * Math.tan((35 * Math.PI) / 180),
      1,
    );
    // n_deg = ceil(H / altura)
    expect(r.numeroDegraus).toBe(Math.ceil(10000 / r.alturaDegrau_mm));
  });

  it("avisa quando ângulo > 50°", () => {
    const r = calcularEscada({
      tipo: "helicoidal-externa",
      D_mm: 8000,
      H_mm: 10000,
      anguloHelicoidal_graus: 60,
    });
    expect(r.avisos.some((a) => a.includes("Ângulo"))).toBe(true);
  });

  it("massa total = longarinas + degraus", () => {
    const r = calcularEscada({
      tipo: "helicoidal-externa",
      D_mm: 8000,
      H_mm: 10000,
      anguloHelicoidal_graus: 35,
      passoPe_mm: 250,
    });
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.peso_longarinas_kg + r.peso_degraus_kg,
      4,
    );
  });
});

describe("Escada marinheiro vertical", () => {
  it("comprimento = H + 1 m de folga no topo", () => {
    const r = calcularEscada({
      tipo: "marinheiro-vertical",
      D_mm: 8000,
      H_mm: 8000,
    });
    expect(r.comprimento_m).toBeCloseTo(9.0, 3);
  });

  it("auto-aplica gaiola para H ≥ 6 m (NR-35)", () => {
    const r = calcularEscada({
      tipo: "marinheiro-vertical",
      D_mm: 8000,
      H_mm: 8000,
    });
    expect(r.peso_gaiola_kg).toBeGreaterThan(0);
  });

  it("NÃO aplica gaiola para H < 6 m por default", () => {
    const r = calcularEscada({
      tipo: "marinheiro-vertical",
      D_mm: 8000,
      H_mm: 4000,
    });
    expect(r.peso_gaiola_kg).toBe(0);
  });

  it("avisa quando H ≥ 6 m e gaiola foi forçada para off", () => {
    const r = calcularEscada({
      tipo: "marinheiro-vertical",
      D_mm: 8000,
      H_mm: 8000,
      comGaiola: false,
    });
    expect(r.avisos.some((a) => a.includes("NR-35"))).toBe(true);
  });
});

describe("Escada — tipo 'nenhuma'", () => {
  it("retorna massa zero e sem avisos", () => {
    const r = calcularEscada({
      tipo: "nenhuma",
      D_mm: 8000,
      H_mm: 10000,
    });
    expect(r.pesoTotal_kg).toBe(0);
    expect(r.avisos).toEqual([]);
    expect(r.numeroDegraus).toBe(0);
  });
});

describe("Plataforma", () => {
  it("default: comprimento = perímetro do tanque", () => {
    const r = calcularPlataforma({
      id: "PLT-TOPO",
      cota_m: 8.84,
      D_mm: 8900,
    });
    const esperado_perim = Math.PI * 8.9;
    expect(r.area_m2).toBeCloseTo(esperado_perim * 1.0, 3);
  });

  it("respeita largura e comprimento custom", () => {
    const r = calcularPlataforma({
      id: "PLT-1",
      cota_m: 4,
      D_mm: 8000,
      largura_m: 1.5,
      comprimento_m: 5,
    });
    expect(r.area_m2).toBeCloseTo(7.5, 3);
  });

  it("massa total inclui piso + estrutura + guarda-corpo", () => {
    const r = calcularPlataforma({
      id: "PLT-1",
      cota_m: 4,
      D_mm: 8000,
      largura_m: 1.0,
      comprimento_m: 10,
    });
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.peso_piso_kg + r.peso_estrutura_kg + r.peso_guardaCorpo_kg,
      4,
    );
    expect(r.peso_guardaCorpo_kg).toBeGreaterThan(0);
  });

  it("sem guarda-corpo quando comGuardaCorpo=false", () => {
    const r = calcularPlataforma({
      id: "PLT-X",
      cota_m: 4,
      D_mm: 8000,
      comGuardaCorpo: false,
    });
    expect(r.peso_guardaCorpo_kg).toBe(0);
    expect(r.comprimentoGuardaCorpo_m).toBe(0);
  });
});

describe("Guarda-corpo da escada", () => {
  it("massa = comprimento × 9 kg/m", () => {
    const r = calcularGuardaCorpoEscada(13);
    expect(r.peso_kg).toBeCloseTo(13 * 9, 3);
  });

  it("avisa altura abaixo do mínimo NR-12 (1.050 mm)", () => {
    const r = calcularGuardaCorpoEscada(10, 900);
    expect(r.memoriaCalculo.substituicao).toContain("NR-12");
  });
});

describe("calcularAcessorios — agregador", () => {
  it("agrega escada + plataformas + guarda-corpo da escada", () => {
    const r = calcularAcessorios({
      D_mm: 8900,
      H_mm: 8841,
      escada: {
        tipo: "helicoidal-externa",
        anguloHelicoidal_graus: 50,
      },
      plataformas: [
        { id: "PLT-TOPO", cota_m: 8.84 },
        { id: "PLT-INT-1", cota_m: 4.5, comprimento_m: 5 },
      ],
    });
    expect(r.escada.tipo).toBe("helicoidal-externa");
    expect(r.plataformas).toHaveLength(2);
    expect(r.guardaCorpoEscada).toBeDefined();
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.escada.pesoTotal_kg +
        r.plataformas.reduce((s, p) => s + p.pesoTotal_kg, 0) +
        (r.guardaCorpoEscada?.peso_kg ?? 0),
      4,
    );
  });

  it("escada=nenhuma → sem guarda-corpo de escada", () => {
    const r = calcularAcessorios({
      D_mm: 8000,
      H_mm: 6000,
      escada: { tipo: "nenhuma" },
      plataformas: [],
    });
    expect(r.guardaCorpoEscada).toBeUndefined();
    expect(r.pesoTotal_kg).toBe(0);
  });
});
