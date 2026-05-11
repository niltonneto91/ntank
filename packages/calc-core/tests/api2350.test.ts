/**
 * Testes unitários — Módulo API 2350: Prevenção de Transbordamento
 *
 * Cobre:
 *   1. Conversões de unidades (determinísticas)
 *   2. Verificação de escopo (dentro / fora / requer-avaliacao)
 *   3. Taxa de subida de nível (geométrica e manual V/mm)
 *   4. Tempo de resposta (soma de componentes, adotado, alertas)
 *   5. Volume de resposta (física)
 *   6. Verificação de níveis (distâncias, status APROVADO/REPROVADO)
 *   7. Classificação de categoria OPS (Cat 0–3, tipoOPS)
 *
 * Referência: API Standard 2350, 5th Edition (2020).
 */

import { describe, it, expect } from "vitest";
import {
  // Conversões
  m_para_mm,
  mm_para_m,
  m_para_in,
  mm_para_in,
  m3_para_L,
  m3_para_bbl,
  mmMin_para_inH,
  mmMin_para_mmH,
  M3_PARA_BBL,
  IN_PARA_MM,
  // Cálculos
  verificarEscopoAPI2350,
  calcularTaxaSubidaNivel,
  calcularTempoRespostaAPI2350,
  calcularVolumeRespostaAPI2350,
  verificarNiveisAPI2350,
  classificarCategoriaOPS,
} from "../src/api2350/index.js";
import type {
  EntradaEscopoAPI2350,
  ComponentesTempoAPI2350,
  EntradaVolumeRespostaAPI2350,
  EntradaNiveisAPI2350,
  EntradaCategoriaAPI2350,
} from "../src/api2350/index.js";

// ---------------------------------------------------------------------------
// 1. Conversões de unidades
// ---------------------------------------------------------------------------

describe("Conversões de unidades — API 2350", () => {
  it("m_para_mm: 1 m = 1000 mm", () => {
    expect(m_para_mm(1)).toBe(1000);
  });

  it("mm_para_m: 1000 mm = 1 m", () => {
    expect(mm_para_m(1000)).toBe(1);
  });

  it("m_para_in: 1 m ≈ 39.37 in", () => {
    expect(m_para_in(1)).toBeCloseTo(39.3701, 3);
  });

  it("mm_para_in: 25.4 mm = 1 in", () => {
    expect(mm_para_in(25.4)).toBeCloseTo(1.0, 6);
  });

  it("m3_para_L: 1 m³ = 1000 L", () => {
    expect(m3_para_L(1)).toBe(1000);
  });

  it("m3_para_bbl: 1 m³ ≈ 6.28981 bbl", () => {
    expect(m3_para_bbl(1)).toBeCloseTo(M3_PARA_BBL, 4);
  });

  it("mmMin_para_inH: 25.4 mm/min = 60 in/h (25.4 mm × 60 min / 25.4 mm/in)", () => {
    // 25.4 mm/min × 60 min/h / 25.4 mm/in = 60 in/h
    expect(mmMin_para_inH(25.4)).toBeCloseTo(60.0, 4);
  });

  it("mmMin_para_mmH: 1 mm/min = 60 mm/h", () => {
    expect(mmMin_para_mmH(1)).toBe(60);
  });

  it("IN_PARA_MM: deve ser 25.4", () => {
    expect(IN_PARA_MM).toBe(25.4);
  });
});

// ---------------------------------------------------------------------------
// 2. Verificação de escopo
// ---------------------------------------------------------------------------

const ESCOPO_PADRAO: EntradaEscopoAPI2350 = {
  produtoClasseI_NFPA:         false,
  produtoClasseII_NFPA:        true,
  produtoLPG:                  false,
  produtoLNG:                  false,
  volumeMaior5000L:            true,
  conectadoRecebimento:        true,
  exclusivamenteCaminhaoVagao: false,
  tanqueDedicadoAlivio:        false,
  cobertoPorOutraPratica:      false,
};

describe("verificarEscopoAPI2350", () => {
  it("produto LPG → resultado 'fora'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, produtoLPG: true });
    expect(r.resultado).toBe("fora");
    expect(r.motivos.length).toBeGreaterThan(0);
  });

  it("produto LNG → resultado 'fora'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, produtoLNG: true });
    expect(r.resultado).toBe("fora");
  });

  it("volume ≤ 5.000 L → resultado 'fora'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, volumeMaior5000L: false });
    expect(r.resultado).toBe("fora");
  });

  it("não conectado a recebimento → resultado 'fora'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, conectadoRecebimento: false });
    expect(r.resultado).toBe("fora");
  });

  it("coberto por outra prática → resultado 'fora'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, cobertoPorOutraPratica: true });
    expect(r.resultado).toBe("fora");
  });

  it("escopo padrão (diesel em base) → resultado 'dentro'", () => {
    const r = verificarEscopoAPI2350(ESCOPO_PADRAO);
    expect(r.resultado).toBe("dentro");
    expect(r.motivos).toHaveLength(0);
  });

  it("recebimento exclusivamente por caminhão/vagão → resultado 'requer-avaliacao'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, exclusivamenteCaminhaoVagao: true });
    expect(r.resultado).toBe("requer-avaliacao");
    expect(r.motivos.length).toBeGreaterThan(0);
  });

  it("tanque dedicado a alívio → resultado 'requer-avaliacao'", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, tanqueDedicadoAlivio: true });
    expect(r.resultado).toBe("requer-avaliacao");
  });

  it("múltiplos motivos de exclusão → resultado 'fora' com vários motivos", () => {
    const r = verificarEscopoAPI2350({ ...ESCOPO_PADRAO, produtoLPG: true, volumeMaior5000L: false });
    expect(r.resultado).toBe("fora");
    expect(r.motivos.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Taxa de subida de nível
// ---------------------------------------------------------------------------

describe("calcularTaxaSubidaNivel", () => {
  it("modo geométrico: D=10 m, Q=100 m³/h → A ≈ 78.54 m²", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,
      H_util_m: 9,
      vazaoMax_m3h: 100,
    });
    // A = π × 10² / 4 = 25π ≈ 78.5398
    expect(r.A_m2).toBeCloseTo(78.54, 1);
    expect(r.metodo).toBe("geometrico");
  });

  it("modo geométrico: taxa = (Q/60) / A × 1000", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,
      H_util_m: 9,
      vazaoMax_m3h: 100,
    });
    // A ≈ 78.54; taxa = (100/60) / 78.54 × 1000 ≈ 21.22 mm/min
    expect(r.taxaSubida_mm_min).toBeCloseTo(21.22, 1);
  });

  it("modo geométrico: mm/h = taxa_mm_min × 60", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,
      H_util_m: 9,
      vazaoMax_m3h: 100,
    });
    expect(r.taxaSubida_mm_h).toBeCloseTo(r.taxaSubida_mm_min * 60, 0);
  });

  it("modo geométrico: in/h = mm_h / 25.4", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,
      H_util_m: 9,
      vazaoMax_m3h: 100,
    });
    expect(r.taxaSubida_in_h).toBeCloseTo(r.taxaSubida_mm_h / IN_PARA_MM, 1);
  });

  it("modo manual V/mm: 0.04 m³/mm, Q=100 m³/h → A_eq = 40 m²", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,       // ignorado no modo manual
      H_util_m: 9,
      vazaoMax_m3h: 100,
      vPorMm_m3_mm: 0.04,
    });
    // A_eq = 0.04 × 1000 = 40 m²
    expect(r.A_m2).toBeCloseTo(40.0, 3);
    expect(r.metodo).toBe("manual-v-por-mm");
    // taxa = (100/60) / 40 × 1000 ≈ 41.67 mm/min
    expect(r.taxaSubida_mm_min).toBeCloseTo(41.67, 1);
  });

  it("modo manual: V/mm=0 → usa modo geométrico como fallback", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,
      H_util_m: 9,
      vazaoMax_m3h: 100,
      vPorMm_m3_mm: 0,
    });
    expect(r.metodo).toBe("geometrico");
  });

  it("modo manual: V/mm=null → usa modo geométrico como fallback", () => {
    const r = calcularTaxaSubidaNivel({
      D_m: 10,
      H_util_m: 9,
      vazaoMax_m3h: 100,
      vPorMm_m3_mm: null,
    });
    expect(r.metodo).toBe("geometrico");
  });

  it("dobrar Q dobra a taxa de subida", () => {
    const r1 = calcularTaxaSubidaNivel({ D_m: 10, H_util_m: 9, vazaoMax_m3h: 100 });
    const r2 = calcularTaxaSubidaNivel({ D_m: 10, H_util_m: 9, vazaoMax_m3h: 200 });
    expect(r2.taxaSubida_mm_min).toBeCloseTo(r1.taxaSubida_mm_min * 2, 2);
  });

  it("tanque 7,64 m — referência interna NTANK", () => {
    const r = calcularTaxaSubidaNivel({ D_m: 7.64, H_util_m: 11.5, vazaoMax_m3h: 100 });
    // A = π × 7.64² / 4 ≈ 45.84 m² (variação na última casa conforme arredondamento)
    expect(r.A_m2).toBeGreaterThan(45.8);
    expect(r.A_m2).toBeLessThan(46.0);
    // taxa ≈ 36 mm/min
    expect(r.taxaSubida_mm_min).toBeGreaterThan(35.5);
    expect(r.taxaSubida_mm_min).toBeLessThan(37.0);
  });
});

// ---------------------------------------------------------------------------
// 4. Tempo de resposta
// ---------------------------------------------------------------------------

const COMPONENTES_MINIMOS: ComponentesTempoAPI2350 = {
  detecao_min:           1,
  validacao_min:         1,
  comunicacao_min:       1,
  decisao_min:           1,
  acaoOperacional_min:   1,
  fechamentoValvula_min: 1,
  paradaBomba_min:       1,
  drenagemLinha_min:     1,
  margemSeguranca_min:   1,
};

const COMPONENTES_PADRAO: ComponentesTempoAPI2350 = {
  detecao_min:           1,
  validacao_min:         1,
  comunicacao_min:       3,
  decisao_min:           2,
  acaoOperacional_min:   3,
  fechamentoValvula_min: 2,
  paradaBomba_min:       1,
  drenagemLinha_min:     2,
  margemSeguranca_min:   5,
};

describe("calcularTempoRespostaAPI2350", () => {
  it("soma de 9 × 1 min = 9 min calculados", () => {
    const r = calcularTempoRespostaAPI2350(COMPONENTES_MINIMOS);
    expect(r.total_calculado_min).toBe(9);
  });

  it("componentes padrão NTANK: soma = 20 min", () => {
    const r = calcularTempoRespostaAPI2350(COMPONENTES_PADRAO);
    expect(r.total_calculado_min).toBe(20);
  });

  it("sem tempoAdotado → adotado = calculado", () => {
    const r = calcularTempoRespostaAPI2350(COMPONENTES_PADRAO);
    expect(r.total_adotado_min).toBe(r.total_calculado_min);
  });

  it("tempoAdotado > calculado → adotado = informado", () => {
    const r = calcularTempoRespostaAPI2350(COMPONENTES_PADRAO, 25);
    expect(r.total_adotado_min).toBe(25);
  });

  it("tempoAdotado < calculado → gera alerta T001 e força mínimo", () => {
    const r = calcularTempoRespostaAPI2350(COMPONENTES_PADRAO, 10);
    // Alerta T001 deve estar presente
    const alertaT001 = r.alertas.find(a => a.code === "T001");
    expect(alertaT001).toBeDefined();
    expect(alertaT001?.nivel).toBe("CRITICO");
    // Adotado deve ser forçado para o calculado
    expect(r.total_adotado_min).toBe(r.total_calculado_min);
  });

  it("margem de segurança zero → gera alerta T003", () => {
    const sem_margem = { ...COMPONENTES_MINIMOS, margemSeguranca_min: 0 };
    const r = calcularTempoRespostaAPI2350(sem_margem);
    const alertaT003 = r.alertas.find(a => a.code === "T003");
    expect(alertaT003).toBeDefined();
  });

  it("todos zeros → gera alerta T002", () => {
    const zeros: ComponentesTempoAPI2350 = {
      detecao_min:0, validacao_min:0, comunicacao_min:0, decisao_min:0,
      acaoOperacional_min:0, fechamentoValvula_min:0, paradaBomba_min:0,
      drenagemLinha_min:0, margemSeguranca_min:0,
    };
    const r = calcularTempoRespostaAPI2350(zeros);
    expect(r.total_calculado_min).toBe(0);
    const alertaT002 = r.alertas.find(a => a.code === "T002");
    expect(alertaT002).toBeDefined();
  });

  it("retorna referência ao objeto componentes de entrada", () => {
    const r = calcularTempoRespostaAPI2350(COMPONENTES_PADRAO);
    expect(r.componentes).toEqual(COMPONENTES_PADRAO);
  });
});

// ---------------------------------------------------------------------------
// 5. Volume de resposta
// ---------------------------------------------------------------------------

describe("calcularVolumeRespostaAPI2350", () => {
  it("física: V = Q × t / 60", () => {
    // Q=60 m³/h, t=60 min → V=60 m³
    const r = calcularVolumeRespostaAPI2350({ Q_efetiva_m3h: 60, tempo_adotado_min: 60 });
    expect(r.volume_m3).toBeCloseTo(60.0, 3);
  });

  it("Q=100, t=20 min → V ≈ 33.333 m³", () => {
    const r = calcularVolumeRespostaAPI2350({ Q_efetiva_m3h: 100, tempo_adotado_min: 20 });
    expect(r.volume_m3).toBeCloseTo(33.333, 2);
  });

  it("conversão para litros: V_L = V_m3 × 1000", () => {
    const r = calcularVolumeRespostaAPI2350({ Q_efetiva_m3h: 60, tempo_adotado_min: 60 });
    expect(r.volume_L).toBeCloseTo(r.volume_m3 * 1000, 1);
  });

  it("conversão para barris: V_bbl = V_m3 × M3_PARA_BBL", () => {
    const r = calcularVolumeRespostaAPI2350({ Q_efetiva_m3h: 60, tempo_adotado_min: 60 });
    expect(r.volume_bbl).toBeCloseTo(r.volume_m3 * M3_PARA_BBL, 2);
  });

  it("tempo zero → volume zero", () => {
    const r = calcularVolumeRespostaAPI2350({ Q_efetiva_m3h: 100, tempo_adotado_min: 0 });
    expect(r.volume_m3).toBe(0);
  });

  it("retorna string de fórmula não vazia", () => {
    const r = calcularVolumeRespostaAPI2350({ Q_efetiva_m3h: 100, tempo_adotado_min: 20 });
    expect(typeof r.formula).toBe("string");
    expect(r.formula.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Verificação de níveis
// ---------------------------------------------------------------------------

/**
 * Entrada base com todos os níveis aprovados.
 *
 * Distâncias disponíveis:
 *   HH→CH = (11.2 - 10.8) × 1000 = 400 mm
 *   MW→HH = (10.8 - 10.0) × 1000 = 800 mm
 *   CH→físico = (11.8 - 11.2) × 1000 = 600 mm
 *
 * volume_resposta = 10 m³ → dist_req = 10/45.85 × 1000 ≈ 218 mm < 400 mm → APROVADO
 */
const NIVEIS_OK: EntradaNiveisAPI2350 = {
  H_fisico_max_m:    11.8,
  CH_m:              11.2,
  AOPS_m:            null,
  HH_m:              10.8,
  H_m:               null,
  MW_m:              10.0,
  A_m2:              45.85,
  volume_resposta_m3: 10.0,   // ≈ 218 mm requeridos < 400 mm disponíveis → APROVADO
  temAOPS:           false,
};

describe("verificarNiveisAPI2350", () => {
  it("configuração aprovada → status_distancia_HH_CH = APROVADO", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.status_distancia_HH_CH).toBe("APROVADO");
  });

  it("configuração aprovada → status_MW_abaixo_HH = APROVADO", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.status_MW_abaixo_HH).toBe("APROVADO");
  });

  it("configuração aprovada → status_CH_abaixo_fisico = APROVADO", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.status_CH_abaixo_fisico).toBe("APROVADO");
  });

  it("distância HH→CH = (11.2 - 10.8) × 1000 = 400 mm", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.distancia_CH_HH_mm).toBeCloseTo(400, 0);
  });

  it("distância MW→HH = (10.8 - 10.0) × 1000 = 800 mm", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.distancia_HH_MW_mm).toBeCloseTo(800, 0);
  });

  it("distância CH→físico = (11.8 - 11.2) × 1000 = 600 mm", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.distancia_CH_fisico_mm).toBeCloseTo(600, 0);
  });

  it("mínimo normativo sempre 76 mm (3 inches)", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.distancia_minima_normativa_mm).toBe(76);
  });

  it("distância efetiva mínima = max(76, dist_requerida)", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    expect(r.distancia_efetiva_minima_mm).toBeGreaterThanOrEqual(76);
  });

  it("HH acima de CH → REPROVADO + alerta N001", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, HH_m: 11.5, CH_m: 11.2 });
    expect(r.status_distancia_HH_CH).toBe("REPROVADO");
    const n001 = r.alertas.find(a => a.code === "N001");
    expect(n001).toBeDefined();
  });

  it("distância HH→CH < 76 mm → REPROVADO + alerta N002", () => {
    // HH=11.15, CH=11.2 → 50 mm < 76 mm
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, HH_m: 11.15 });
    expect(r.status_distancia_HH_CH).toBe("REPROVADO");
    const n002 = r.alertas.find(a => a.code === "N002");
    expect(n002).toBeDefined();
  });

  it("MW ≥ HH → REPROVADO + alerta N004", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, MW_m: 11.0, HH_m: 10.8 });
    expect(r.status_MW_abaixo_HH).toBe("REPROVADO");
    const n004 = r.alertas.find(a => a.code === "N004");
    expect(n004).toBeDefined();
  });

  it("CH ≥ físico → REPROVADO + alerta N009", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, CH_m: 12.0 });
    expect(r.status_CH_abaixo_fisico).toBe("REPROVADO");
    const n009 = r.alertas.find(a => a.code === "N009");
    expect(n009).toBeDefined();
  });

  it("AOPS abaixo de HH → status_AOPS = REPROVADO + alerta N006", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, temAOPS: true, AOPS_m: 10.5, HH_m: 10.8 });
    expect(r.status_AOPS).toBe("REPROVADO");
    const n006 = r.alertas.find(a => a.code === "N006");
    expect(n006).toBeDefined();
  });

  it("AOPS acima de CH → status_AOPS = REPROVADO + alerta N007", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, temAOPS: true, AOPS_m: 11.5, CH_m: 11.2 });
    expect(r.status_AOPS).toBe("REPROVADO");
    const n007 = r.alertas.find(a => a.code === "N007");
    expect(n007).toBeDefined();
  });

  it("AOPS entre HH e CH → status_AOPS = APROVADO", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, temAOPS: true, AOPS_m: 11.0, HH_m: 10.8, CH_m: 11.2 });
    expect(r.status_AOPS).toBe("APROVADO");
  });

  it("sem AOPS → status_AOPS = null", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, temAOPS: false });
    expect(r.status_AOPS).toBeNull();
  });

  it("distância requerida: V=10 m³, A=45.85 m² → ~218 mm", () => {
    const r = verificarNiveisAPI2350(NIVEIS_OK);
    // 10 / 45.85 × 1000 = 218 mm (aprox)
    expect(r.distancia_requerida_mm).toBeGreaterThan(200);
    expect(r.distancia_requerida_mm).toBeLessThan(250);
  });

  it("distância requerida grande: volume supera distância disponível → REPROVADO + N003", () => {
    const r = verificarNiveisAPI2350({ ...NIVEIS_OK, volume_resposta_m3: 33.33 });
    // 33.33 / 45.85 × 1000 ≈ 727 mm > 400 mm disponíveis → REPROVADO
    expect(r.status_distancia_HH_CH).toBe("REPROVADO");
    const n003 = r.alertas.find(a => a.code === "N003");
    expect(n003).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Classificação de categoria OPS
// ---------------------------------------------------------------------------

const ENTRADA_CAT_BASE: EntradaCategoriaAPI2350 = {
  temATG:                         false,
  nivelTransmitidoRemoto:         false,
  alarmeHHTransmitidoLocalOcupado:false,
  temLAHHIndependente:            false,
  presencaOperacional:            "plena",
  capacidadeEncerrarRemoto:       false,
  temAOPS:                        false,
};

describe("classificarCategoriaOPS", () => {
  it("sem instrumentação → Categoria 0", () => {
    const r = classificarCategoriaOPS(ENTRADA_CAT_BASE);
    expect(r.categoria).toBe(0);
    expect(r.tipoOPS).toBe("MOPS");
  });

  it("só ATG instalado → Categoria 1", () => {
    const r = classificarCategoriaOPS({ ...ENTRADA_CAT_BASE, temATG: true });
    expect(r.categoria).toBe(1);
  });

  it("ATG + nível remoto + alarme HH → Categoria 2", () => {
    const r = classificarCategoriaOPS({
      ...ENTRADA_CAT_BASE,
      temATG:                          true,
      nivelTransmitidoRemoto:          true,
      alarmeHHTransmitidoLocalOcupado: true,
    });
    expect(r.categoria).toBe(2);
  });

  it("todos os requisitos da Cat 3 → Categoria 3", () => {
    const r = classificarCategoriaOPS({
      temATG:                          true,
      nivelTransmitidoRemoto:          true,
      alarmeHHTransmitidoLocalOcupado: true,
      temLAHHIndependente:             true,
      capacidadeEncerrarRemoto:        true,
      presencaOperacional:             "plena",
      temAOPS:                         false,
    });
    expect(r.categoria).toBe(3);
    expect(r.tipoOPS).toBe("MOPS");
  });

  it("Cat 3 com presença não-assistida → alerta C301 (INFO)", () => {
    const r = classificarCategoriaOPS({
      temATG:                          true,
      nivelTransmitidoRemoto:          true,
      alarmeHHTransmitidoLocalOcupado: true,
      temLAHHIndependente:             true,
      capacidadeEncerrarRemoto:        true,
      presencaOperacional:             "nao-assistida",
      temAOPS:                         false,
    });
    expect(r.categoria).toBe(3);
    const c301 = r.alertas.find(a => a.code === "C301");
    expect(c301).toBeDefined();
    expect(c301?.nivel).toBe("INFO");
  });

  it("Cat 2 com presença não-assistida → alerta C201 (CRITICO)", () => {
    const r = classificarCategoriaOPS({
      ...ENTRADA_CAT_BASE,
      temATG:                          true,
      nivelTransmitidoRemoto:          true,
      alarmeHHTransmitidoLocalOcupado: true,
      presencaOperacional:             "nao-assistida",
    });
    expect(r.categoria).toBe(2);
    const c201 = r.alertas.find(a => a.code === "C201");
    expect(c201).toBeDefined();
    expect(c201?.nivel).toBe("CRITICO");
  });

  it("Cat 1 com presença semi → alerta C101 (CRITICO)", () => {
    const r = classificarCategoriaOPS({
      ...ENTRADA_CAT_BASE,
      temATG:             true,
      presencaOperacional:"semi",
    });
    expect(r.categoria).toBe(1);
    const c101 = r.alertas.find(a => a.code === "C101");
    expect(c101).toBeDefined();
    expect(c101?.nivel).toBe("CRITICO");
  });

  it("Cat 0 com presença não-assistida → alerta C001 (CRITICO)", () => {
    const r = classificarCategoriaOPS({ ...ENTRADA_CAT_BASE, presencaOperacional: "nao-assistida" });
    expect(r.categoria).toBe(0);
    const c001 = r.alertas.find(a => a.code === "C001");
    expect(c001).toBeDefined();
    expect(c001?.nivel).toBe("CRITICO");
  });

  it("resultado sempre inclui alerta A004 (AVISO_LEGAL — classificação preliminar)", () => {
    const r = classificarCategoriaOPS(ENTRADA_CAT_BASE);
    const a004 = r.alertas.find(a => a.code === "A004");
    expect(a004).toBeDefined();
    expect(a004?.nivel).toBe("AVISO_LEGAL");
  });

  it("tipoOPS com AOPS e sem transmissão remota → 'AOPS'", () => {
    const r = classificarCategoriaOPS({ ...ENTRADA_CAT_BASE, temAOPS: true, nivelTransmitidoRemoto: false });
    expect(r.tipoOPS).toBe("AOPS");
  });

  it("tipoOPS com AOPS e com transmissão remota → 'MOPS+AOPS'", () => {
    const r = classificarCategoriaOPS({ ...ENTRADA_CAT_BASE, temAOPS: true, nivelTransmitidoRemoto: true });
    expect(r.tipoOPS).toBe("MOPS+AOPS");
  });

  it("resultado inclui listas de requisitos atendidos e não atendidos", () => {
    const r = classificarCategoriaOPS(ENTRADA_CAT_BASE);
    expect(Array.isArray(r.requisitosAtendidos)).toBe(true);
    expect(Array.isArray(r.requisitosNaoAtendidos)).toBe(true);
  });

  it("Cat 3: todos os requisitos no array 'atendidos', nenhum em 'naoAtendidos'", () => {
    const r = classificarCategoriaOPS({
      temATG:                          true,
      nivelTransmitidoRemoto:          true,
      alarmeHHTransmitidoLocalOcupado: true,
      temLAHHIndependente:             true,
      capacidadeEncerrarRemoto:        true,
      presencaOperacional:             "plena",
      temAOPS:                         false,
    });
    expect(r.requisitosAtendidos.length).toBeGreaterThan(0);
    expect(r.requisitosNaoAtendidos).toHaveLength(0);
  });
});
