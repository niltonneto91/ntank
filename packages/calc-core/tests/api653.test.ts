/**
 * Testes do módulo API 653 — Inspeção e Vida Útil de Tanques.
 *
 * Exemplos derivados de cálculos manuais verificáveis (não reproduzem
 * exemplos integrais da norma, apenas validam as fórmulas matemáticas).
 */

import { describe, it, expect } from "vitest";
import {
  calcularMASTCurso,
  calcularMASTTodosCursos,
  calcularTaxaCorrosao,
  avaliarCostado,
  calcularMAOLL,
  avaliarFundo,
  calcularProximaInspecao,
  T_MIN_FUNDO_MM,
  T_MIN_ANELAR_MM,
} from "../src/api653/index.js";
import type { CursoMedido, EntradaAvaliacaoCostado, FundoMedido } from "../src/api653/types.js";

// ---------------------------------------------------------------------------
// Constantes de teste
// ---------------------------------------------------------------------------

/** Tensão admissível A36 conforme API 650 / API 653: 137,9 MPa (= 20.000 psi) */
const S_A36 = 137.9;
/** Eficiência de junta para costado com soldas radiografadas */
const E_PADRAO = 0.85;

// ---------------------------------------------------------------------------
// 1. MAST — Espessura mínima aceitável por curso
// ---------------------------------------------------------------------------

describe("calcularMASTCurso", () => {
  it("curso base D=10m, H_liq=10m, G=0.85 → t_min > 0", () => {
    const r = calcularMASTCurso(10, 10, 0, 1, 0.85, S_A36, E_PADRAO);
    // t_min = 2,6 × 10 × (10 - 0 - 0,3) × 0,85 / (137,9 × 0,85)
    //       = 2,6 × 10 × 9,7 × 0,85 / 117,215
    //       ≈ 215.358 / 117.215 ≈ 1,837 mm
    expect(r.t_min_mm).toBeGreaterThan(0);
    expect(r.t_min_mm).toBeCloseTo(1.837, 1);
    expect(r.numero).toBe(1);
    expect(r.referenciaNormativa).toContain("API 653");
  });

  it("curso topo — H_liq acima muito pequeno → t_min perto de zero", () => {
    // Cota da base = 9,5 m; H_liq = 10 m → H_liq_acima = 10 - 9,5 - 0,3 = 0,2 m
    const r = calcularMASTCurso(10, 10, 9.5, 5, 0.85, S_A36, E_PADRAO);
    expect(r.t_min_mm).toBeGreaterThanOrEqual(0);
    expect(r.t_min_mm).toBeLessThan(0.1);
  });

  it("S=0 ou E=0 → t_min = 0 (proteção divisão por zero)", () => {
    const r = calcularMASTCurso(10, 10, 0, 1, 0.85, 0, E_PADRAO);
    expect(r.t_min_mm).toBe(0);
  });

  it("G=1 (água) → t_min maior que G=0,85 (diesel)", () => {
    const rAgua  = calcularMASTCurso(10, 10, 0, 1, 1.0,  S_A36, E_PADRAO);
    const rDiese = calcularMASTCurso(10, 10, 0, 1, 0.85, S_A36, E_PADRAO);
    expect(rAgua.t_min_mm).toBeGreaterThan(rDiese.t_min_mm);
  });
});

describe("calcularMASTTodosCursos", () => {
  it("tanque 2 cursos: base tem t_min maior que topo", () => {
    const [base, topo] = calcularMASTTodosCursos(
      10, 10, 0.85, S_A36, E_PADRAO, [2.0, 2.0],
    );
    expect(base.numero).toBe(1);
    expect(topo.numero).toBe(2);
    expect(base.t_min_mm).toBeGreaterThan(topo.t_min_mm);
  });

  it("array de alturas vazio → retorna array vazio", () => {
    const r = calcularMASTTodosCursos(10, 10, 0.85, S_A36, E_PADRAO, []);
    expect(r).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Taxa de corrosão
// ---------------------------------------------------------------------------

describe("calcularTaxaCorrosao", () => {
  it("sem histórico → CR adotada = CR assumida", () => {
    const r = calcularTaxaCorrosao(8.0, null, null, "2024-01-01", 0.3);
    expect(r.CR_adotada_mm_ano).toBe(0.3);
    expect(r.CR_historica_mm_ano).toBeNull();
    expect(r.anos_entre_inspecoes).toBeNull();
  });

  it("com histórico: t_ant=9mm, t_med=8mm, 5 anos → CR=0,2 mm/ano", () => {
    const r = calcularTaxaCorrosao(8.0, 9.0, "2019-01-01", "2024-01-01", 0.1);
    // CR_historica = (9 - 8) / 5 = 0,2
    expect(r.CR_historica_mm_ano).toBeCloseTo(0.2, 2);
    // CR_adotada = max(0,2, 0,1) = 0,2
    expect(r.CR_adotada_mm_ano).toBe(0.2);
    expect(r.anos_entre_inspecoes).toBeCloseTo(5, 0);
  });

  it("CR assumida > CR histórica → adota a assumida (conservador)", () => {
    const r = calcularTaxaCorrosao(8.0, 9.0, "2019-01-01", "2024-01-01", 0.5);
    // CR_historica = 0,2; CR_assumida = 0,5 → adota 0,5
    expect(r.CR_adotada_mm_ano).toBe(0.5);
  });

  it("espessura crescente (leitura inconsistente) → CR_historica = 0", () => {
    const r = calcularTaxaCorrosao(9.5, 8.0, "2019-01-01", "2024-01-01", 0.2);
    // t_med (9,5) > t_ant (8,0) → delta_t negativo → CR = max(0, negativo) = 0
    expect(r.CR_historica_mm_ano).toBe(0);
    // CR adotada = max(0, 0,2) = 0,2
    expect(r.CR_adotada_mm_ano).toBe(0.2);
  });

  it("datas inválidas → sem histórico (graceful fallback)", () => {
    const r = calcularTaxaCorrosao(8.0, 9.0, "data-invalida", "2024-01-01", 0.3);
    expect(r.CR_historica_mm_ano).toBeNull();
    expect(r.CR_adotada_mm_ano).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// 3. Avaliação do costado (RUL)
// ---------------------------------------------------------------------------

describe("avaliarCostado", () => {
  const CURSOS_BASE: CursoMedido[] = [
    { numero: 1, altura_m: 2.5, t_nominal_mm: 10, t_medida_mm: 8.0 },
    { numero: 2, altura_m: 2.5, t_nominal_mm: 8,  t_medida_mm: 7.0 },
    { numero: 3, altura_m: 2.5, t_nominal_mm: 7,  t_medida_mm: 6.5 },
    { numero: 4, altura_m: 2.5, t_nominal_mm: 6,  t_medida_mm: 5.8 },
  ];

  const ENTRADA_BASE: EntradaAvaliacaoCostado = {
    D_m: 10,
    H_m: 10,
    H_liq_m: 9.5,
    G: 0.85,
    S_MPa: S_A36,
    E: E_PADRAO,
    cursos: CURSOS_BASE,
    CR_assumida_mm_ano: 0.3,
    dataInspecao: "2024-01-01",
  };

  it("retorna resultados para cada curso", () => {
    const r = avaliarCostado(ENTRADA_BASE);
    expect(r.cursos).toHaveLength(4);
  });

  it("identifica o curso crítico (menor RUL)", () => {
    const r = avaliarCostado(ENTRADA_BASE);
    expect(r.cursoCritico).not.toBeNull();
    // O curso crítico deve ter o menor RUL
    for (const c of r.cursos) {
      if (c.RUL_anos !== null && r.cursoCritico !== null) {
        expect(r.cursoCritico.RUL_anos!).toBeLessThanOrEqual(c.RUL_anos);
      }
    }
  });

  it("RUL_costado_anos = RUL do curso crítico", () => {
    const r = avaliarCostado(ENTRADA_BASE);
    expect(r.RUL_costado_anos).toBe(r.cursoCritico?.RUL_anos ?? null);
  });

  it("curso com t_medida < t_min → REPROVADO e RUL=0", () => {
    // Forçar reprovação: usar espessura muito baixa no curso 1
    const cursosRep: CursoMedido[] = [
      { numero: 1, altura_m: 2.5, t_nominal_mm: 10, t_medida_mm: 0.5 }, // reprovado
      { numero: 2, altura_m: 2.5, t_nominal_mm: 8,  t_medida_mm: 7.0 },
    ];
    const r = avaliarCostado({ ...ENTRADA_BASE, cursos: cursosRep });
    const c1 = r.cursos.find((c) => c.numero === 1)!;
    expect(c1.status).toBe("REPROVADO");
    expect(c1.RUL_anos).toBe(0);
    expect(r.costadoAprovado).toBe(false);
  });

  it("CR=0 → RUL indefinido (null), costado aprovado", () => {
    const r = avaliarCostado({ ...ENTRADA_BASE, CR_assumida_mm_ano: 0 });
    // Todos os cursos com CR=0 têm RUL=null mas não são reprovados
    for (const c of r.cursos) {
      if (c.status !== "REPROVADO") {
        expect(c.RUL_anos).toBeNull();
      }
    }
  });

  it("nenhum curso informado → array vazio e REPROVADO global", () => {
    const r = avaliarCostado({ ...ENTRADA_BASE, cursos: [] });
    expect(r.cursos).toHaveLength(0);
    expect(r.costadoAprovado).toBe(false);
    expect(r.cursoCritico).toBeNull();
  });

  it("fórmula de RUL: (t_medida - t_min) / CR", () => {
    // Caso simples: 1 curso, t_medida=8mm, verificar que t_min é pequeno e RUL>0
    const cursosSimples: CursoMedido[] = [
      { numero: 1, altura_m: 10, t_nominal_mm: 10, t_medida_mm: 8.0 },
    ];
    const r = avaliarCostado({
      ...ENTRADA_BASE,
      cursos: cursosSimples,
      H_m: 10,
      H_liq_m: 9.5,
      CR_assumida_mm_ano: 0.3,
    });
    const c = r.cursos[0];
    if (c.RUL_anos !== null && c.CR_mm_ano > 0) {
      const rulEsperado = (c.t_medida_mm - c.t_min_mm) / c.CR_mm_ano;
      expect(c.RUL_anos).toBeCloseTo(rulEsperado, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. MAOLL
// ---------------------------------------------------------------------------

describe("calcularMAOLL", () => {
  const CURSOS_OK: CursoMedido[] = [
    { numero: 1, altura_m: 3, t_nominal_mm: 10, t_medida_mm: 9.0 },
    { numero: 2, altura_m: 3, t_nominal_mm: 8,  t_medida_mm: 7.5 },
    { numero: 3, altura_m: 3, t_nominal_mm: 7,  t_medida_mm: 6.8 },
  ];

  it("cursos aprovados → MAOLL = H_liq (sem re-rating)", () => {
    const r = calcularMAOLL(10, 8.5, 0.85, S_A36, E_PADRAO, CURSOS_OK);
    expect(r.reratingNecessario).toBe(false);
    expect(r.MAOLL_m).toBe(8.5);
    expect(r.pct_volume_disponivel).toBe(100);
  });

  it("curso base reprovado → MAOLL < H_liq (re-rating)", () => {
    // Com H_liq=10m, curso 1: H_acima=9,7m → t_min=2,6×10×9,7×0,85/(137,9×0,85)=1,83mm > 1,0mm → reprova
    const cursosRuim: CursoMedido[] = [
      { numero: 1, altura_m: 3, t_nominal_mm: 10, t_medida_mm: 1.0 }, // ruim
      { numero: 2, altura_m: 3, t_nominal_mm: 8,  t_medida_mm: 7.5 },
      { numero: 3, altura_m: 4, t_nominal_mm: 7,  t_medida_mm: 6.5 },
    ];
    const r = calcularMAOLL(10, 10, 0.85, S_A36, E_PADRAO, cursosRuim);
    expect(r.reratingNecessario).toBe(true);
    expect(r.MAOLL_m).toBeLessThan(10);
  });

  it("sem cursos → alerta e MAOLL=0", () => {
    const r = calcularMAOLL(10, 8.5, 0.85, S_A36, E_PADRAO, []);
    expect(r.MAOLL_m).toBe(0);
    expect(r.alertas.some((a) => a.nivel === "CRITICO")).toBe(true);
  });

  it("pct_volume_disponivel entre 0 e 100", () => {
    const r = calcularMAOLL(10, 8.5, 0.85, S_A36, E_PADRAO, CURSOS_OK);
    expect(r.pct_volume_disponivel).toBeGreaterThanOrEqual(0);
    expect(r.pct_volume_disponivel).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// 5. Avaliação do fundo
// ---------------------------------------------------------------------------

describe("avaliarFundo", () => {
  const FUNDO_OK: FundoMedido = {
    t_nominal_mm: 6,
    t_medida_mm: 4.5,
    t_anelar_mm: 8,
    largura_anelar_mm: 600,
    CR_assumida_mm_ano: 0.2,
  };

  it("fundo aprovado: t_medida > 2,5 mm", () => {
    const r = avaliarFundo(FUNDO_OK, "2024-01-01");
    expect(r.status).toBe("APROVADO");
    expect(r.t_min_aceitavel_mm).toBe(T_MIN_FUNDO_MM);
  });

  it("fundo reprovado: t_medida < 2,5 mm", () => {
    const r = avaliarFundo({ ...FUNDO_OK, t_medida_mm: 2.0 }, "2024-01-01");
    expect(r.status).toBe("REPROVADO");
    expect(r.RUL_anos).toBe(0);
    expect(r.alertas.some((a) => a.code === "F001")).toBe(true);
  });

  it("anelar aprovada: t >= 6 mm", () => {
    const r = avaliarFundo({ ...FUNDO_OK, t_anelar_mm: 7 }, "2024-01-01");
    expect(r.anelarAprovado).toBe(true);
  });

  it("anelar reprovada: t < 6 mm", () => {
    const r = avaliarFundo({ ...FUNDO_OK, t_anelar_mm: 5.5 }, "2024-01-01");
    expect(r.anelarAprovado).toBe(false);
    expect(r.alertas.some((a) => a.code === "F004")).toBe(true);
  });

  it("sem dados de anelar → anelarAprovado = null", () => {
    const r = avaliarFundo({ ...FUNDO_OK, t_anelar_mm: null }, "2024-01-01");
    expect(r.anelarAprovado).toBeNull();
  });

  it("RUL do fundo: (t_medida - 2,5) / CR", () => {
    const r = avaliarFundo({ ...FUNDO_OK, t_medida_mm: 4.5, CR_assumida_mm_ano: 0.2 }, "2024-01-01");
    // RUL = (4,5 - 2,5) / 0,2 = 10 anos
    expect(r.RUL_anos).toBeCloseTo(10, 0);
  });

  it("constante T_MIN_FUNDO_MM = 2,5", () => {
    expect(T_MIN_FUNDO_MM).toBe(2.5);
  });

  it("constante T_MIN_ANELAR_MM = 6,0", () => {
    expect(T_MIN_ANELAR_MM).toBe(6.0);
  });
});

// ---------------------------------------------------------------------------
// 6. Próxima inspeção
// ---------------------------------------------------------------------------

describe("calcularProximaInspecao", () => {
  it("RUL=20 → interna=5 anos, externa=10 anos (limitado pelo máximo)", () => {
    const r = calcularProximaInspecao("2024-01-01", 20, null);
    // RUL/4 = 5, RUL/2 = 10 → externos = min(10,10)=10
    expect(r.intervaloInterno_anos).toBe(5);
    expect(r.intervaloExterno_anos).toBe(10);
  });

  it("RUL=100 → interna=20 (limitado pelo máximo de 20 anos)", () => {
    // min(100/4, 20) = min(25, 20) = 20 — o limite de 20 anos é atingido
    const r = calcularProximaInspecao("2024-01-01", 100, null);
    expect(r.intervaloInterno_anos).toBe(20);
  });

  it("RUL=1 → interna=0,3 anos (urgente, round1) e alerta CRITICO", () => {
    // min(1/4, 20) = 0,25 → round1 → 0,3 (Math.round(2,5)=3 em JS)
    const r = calcularProximaInspecao("2024-01-01", 1, null);
    expect(r.intervaloInterno_anos).toBeCloseTo(0.3, 2);
    expect(r.alertas.some((a) => a.code === "I001")).toBe(true);
  });

  it("RUL_fundo menor que costado → usa RUL do fundo", () => {
    // costado=20 anos, fundo=4 anos → crítico=4
    const r = calcularProximaInspecao("2024-01-01", 20, 4);
    // intervalo_interno = min(4/4, 20) = 1 ano
    expect(r.intervaloInterno_anos).toBe(1);
    expect(r.RUL_critico_anos).toBe(4);
  });

  it("CR=0 (RUL=null) → usa limites máximos e alerta INFO", () => {
    const r = calcularProximaInspecao("2024-01-01", null, null);
    expect(r.intervaloInterno_anos).toBe(20);
    expect(r.intervaloExterno_anos).toBe(10);
    expect(r.alertas.some((a) => a.code === "I003")).toBe(true);
  });

  it("data da próxima inspeção é futura em relação à data base", () => {
    const r = calcularProximaInspecao("2024-01-01", 8, null);
    if (r.dataProximaInterna) {
      expect(new Date(r.dataProximaInterna) > new Date("2024-01-01")).toBe(true);
    }
  });
});
