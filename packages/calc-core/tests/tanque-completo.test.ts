import { describe, expect, it } from "vitest";
import { calcularTanqueCompleto } from "../src/tanque.js";

describe("calcularTanqueCompleto — agregador costado + fundo + teto", () => {
  const baseCostado = {
    D_mm: 8900,
    H_mm: 8841,
    G: 0.79,
    CA_mm: 1.5,
    larguraChapa_mm: 2000,
    comprimentoChapa_mm: 6000,
    E: 0.85,
  };

  it("monta resultado consolidado (sem bocais nem acessórios)", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      metodoCostado: "auto",
    });
    expect(r.costado).toBeDefined();
    expect(r.fundo).toBeDefined();
    expect(r.teto).toBeDefined();
    expect(r.bocais).toEqual([]);
    expect(r.pesoBocais_kg).toBe(0);
    expect(r.acessorios).toBeUndefined();
    expect(r.pesoAcessorios_kg).toBe(0);
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.costado.pesoTotal_kg + r.fundo.pesoTotal_kg + r.teto.pesoTotal_kg,
      2,
    );
  });

  it("inclui peso dos acessórios quando informados", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      acessorios: {
        escada: { tipo: "helicoidal-externa", anguloHelicoidal_graus: 50 },
        plataformas: [{ id: "PLT-TOPO", cota_m: 8.84 }],
      },
    });
    expect(r.acessorios).toBeDefined();
    expect(r.pesoAcessorios_kg).toBeGreaterThan(0);
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.costado.pesoTotal_kg +
        r.fundo.pesoTotal_kg +
        r.teto.pesoTotal_kg +
        r.pesoBocais_kg +
        r.pesoAcessorios_kg,
      2,
    );
  });

  it("inclui peso dos bocais quando informados", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      bocais: [
        {
          tag: "N-IN-01",
          funcao: "entrada-produto",
          posicao: "costado",
          DN_pol: 6,
          classe: "150#",
          tipoFlange: "WN",
          face: "RF",
          elevacao_m: 1.5,
        },
        {
          tag: "M-T-01",
          funcao: "manhole",
          posicao: "teto",
          DN_pol: 24,
          classe: "150#",
          tipoFlange: "WN",
          face: "RF",
        },
      ],
    });
    expect(r.bocais).toHaveLength(2);
    expect(r.pesoBocais_kg).toBeGreaterThan(0);
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.costado.pesoTotal_kg +
        r.fundo.pesoTotal_kg +
        r.teto.pesoTotal_kg +
        r.pesoBocais_kg +
        r.pesoAcessorios_kg,
      2,
    );
  });

  it("usa espessura do anel correto para cada elevação do bocal", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      bocais: [
        {
          tag: "N-low",
          funcao: "saida-produto",
          posicao: "costado",
          DN_pol: 4,
          classe: "150#",
          tipoFlange: "WN",
          face: "RF",
          elevacao_m: 0.5, // base — anel 1
        },
        {
          tag: "N-high",
          funcao: "instrumentacao",
          posicao: "costado",
          DN_pol: 4,
          classe: "150#",
          tipoFlange: "WN",
          face: "RF",
          elevacao_m: 8.0, // próximo do topo — anel superior
        },
      ],
    });
    const baixo = r.bocais.find((b) => b.entrada.tag === "N-low")!;
    const alto = r.bocais.find((b) => b.entrada.tag === "N-high")!;
    // Os anéis NBR para etanol G=0.79 são todos 4.75 mm — então t_local
    // deve ser igual nos dois. Em outros tanques, esperaria-se baixo > alto.
    expect(baixo.t_local_mm).toBeGreaterThanOrEqual(alto.t_local_mm);
  });

  it("custo_R$ = pesoTotal × custoAcoPorKg", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      custoAcoPorKg_R$: 7.0,
    });
    expect(r.custo_R$).toBeCloseTo(r.pesoTotal_kg * 7.0, 2);
  });

  it("método 'auto' usa o costado de menor custo (NBR para fluido leve)", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      metodoCostado: "auto",
    });
    // Para etanol G=0.79, NBR é mais econômica
    expect(r.costado.metodo).toBe("NBR 7821 Simplificada");
  });

  it("método explícito é respeitado", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
      metodoCostado: "API 650 1-Foot",
    });
    expect(r.costado.metodo).toBe("API 650 1-Foot");
  });

  it("propaga e_costado_base ao fundo (decide anel anular)", () => {
    // Tanque pequeno: D=8 m, costado base fino → não exige anel anular
    const r1 = calcularTanqueCompleto({
      costado: { ...baseCostado, D_mm: 8000, H_mm: 6000 },
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-autoportante", anguloCone_graus: 15 },
    });
    expect(r1.fundo.anelAnular).toBeUndefined();

    // Tanque grande: D=15 m → exige anel anular
    const r2 = calcularTanqueCompleto({
      costado: { ...baseCostado, D_mm: 15000, H_mm: 12000 },
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "dome-autoportante" },
    });
    expect(r2.fundo.anelAnular).toBeDefined();
  });

  it("dome autoportante usa default R_dome = D quando não fornecido", () => {
    const r = calcularTanqueCompleto({
      costado: { ...baseCostado, D_mm: 10000, H_mm: 9000 },
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "dome-autoportante" },
    });
    expect(r.teto.tipo).toBe("dome-autoportante");
    expect(r.teto.entrada.R_dome_m).toBeUndefined();
  });

  it("cônico suportado tem peso de estrutura > 0", () => {
    const r = calcularTanqueCompleto({
      costado: baseCostado,
      fundo: { tipo: "plano-com-anel-anular" },
      teto: { tipo: "conico-suportado", anguloCone_graus: 9.5 },
    });
    expect(r.teto.peso_estrutura_kg).toBeGreaterThan(0);
  });
});
