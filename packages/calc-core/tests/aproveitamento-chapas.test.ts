/**
 * Testes do otimizador de chapas comerciais.
 *
 * Casos de Nilton:
 *   - DN 7,64 m → π·D ≈ 24,0 m → 4 chapas de 6 m (ótimo).
 */

import { describe, expect, it } from "vitest";
import {
  avaliarAproveitamentoChapa,
  chapasDisponiveis,
  CHAPAS_COMERCIAIS,
  selecionarChapaComercial,
  sugerirGeometriasPorVolume,
} from "../src/chapas.js";

describe("avaliarAproveitamentoChapa", () => {
  it("classifica D = 7,64 m com chapa 6 m como ótimo (4 chapas)", () => {
    const r = avaliarAproveitamentoChapa(7.64, 6);
    expect(r.circunferencia_m).toBeCloseTo(7.64 * Math.PI, 4);
    // π × 7,64 = 24,0009... → chapas inteiras = 4 OU 3 dependendo do arredondamento
    // 24,00 / 6 = 4,0001... então floor = 4, resto ≈ 0,0009 m → ótimo
    expect(r.classificacao).toBe("otimo");
    expect(r.chapasNecessarias).toBe(4);
    expect(r.desperdicio_pct).toBeCloseTo(0, 1);
    expect(r.descricao).toBe("4 × 6 m");
    expect(r.chapaAdicional_m).toBe(0);
  });

  it("descreve aproveitamento bom como '3 × 6 m + 1 × N m' com resto comercializável", () => {
    // π × 5 ≈ 15,71 → 2 chapas inteiras + 1 chapa de 4 m
    const r = avaliarAproveitamentoChapa(5, 6);
    expect(r.classificacao).toBe("bom");
    expect(r.chapaAdicional_m).toBeCloseTo(4, 1); // 3,71 arredondado para 4
    expect(r.descricao).toBe("2 × 6 m + 1 × 4 m");
  });

  it("aproveitamento ruim ainda exibe chapa adicional", () => {
    // D = 4 m → π·D ≈ 12,57 → 2 chapas + resto 0,57 m → "ruim"
    const r = avaliarAproveitamentoChapa(4, 6);
    expect(r.classificacao).toBe("ruim");
    expect(r.descricao).toMatch(/2 × 6 m \+ 1 × 1 m/);
  });

  it("classifica D = 11,46 m com chapa 6 m como ótimo (6 chapas)", () => {
    // π × 11,46 = 36,0027 → 6 chapas exatas
    const r = avaliarAproveitamentoChapa(11.46, 6);
    expect(r.classificacao).toBe("otimo");
    expect(r.chapasNecessarias).toBe(6);
  });

  it("classifica D = 5 m com chapa 6 m como bom (resto ≈ 3,7 m)", () => {
    // π × 5 ≈ 15,71 → 2 chapas de 6 = 12, resto 3,71 → bom
    const r = avaliarAproveitamentoChapa(5, 6);
    expect(r.classificacao).toBe("bom");
    expect(r.chapasNecessarias).toBe(3);
    expect(r.resto_m).toBeCloseTo(3.7079, 3);
  });

  it("classifica D = 4 m com chapa 6 m como ruim (resto ≈ 0,57 m)", () => {
    // π × 4 ≈ 12,566 → 2 chapas de 6 = 12, resto 0,57 → ruim (entre 0 e 2)
    const r = avaliarAproveitamentoChapa(4, 6);
    expect(r.classificacao).toBe("ruim");
  });

  it("rejeita D ou comprimento ≤ 0", () => {
    expect(() => avaliarAproveitamentoChapa(0, 6)).toThrow();
    expect(() => avaliarAproveitamentoChapa(5, 0)).toThrow();
  });
});

describe("Restrição comercial: largura ≥ 2.400 mm requer espessura ≥ 6,35 mm", () => {
  it("chapasDisponiveis filtra 3/16″ para larguras 2440 e 2550", () => {
    const todas = chapasDisponiveis(2000);
    const grossas = chapasDisponiveis(2440);
    const ainda_grossas = chapasDisponiveis(2550);
    expect(todas).toBe(CHAPAS_COMERCIAIS); // sem filtro
    expect(grossas.find((c) => c.polegada === "3/16")).toBeUndefined();
    expect(grossas[0]!.polegada).toBe("1/4");
    expect(ainda_grossas[0]!.polegada).toBe("1/4");
  });

  it("selecionarChapaComercial pula 3/16 quando largura ≥ 2400", () => {
    // espessura calculada de 4 mm (compatível com 3/16″ = 4,75 mm)
    const semFiltro = selecionarChapaComercial(4, 2000);
    expect(semFiltro.polegada).toBe("3/16");
    // mesmo valor com largura 2440 → deve pular para 1/4″
    const filtrada = selecionarChapaComercial(4, 2440);
    expect(filtrada.polegada).toBe("1/4");
    expect(filtrada.espessura).toBe(6.35);
  });

  it("largura 2550 não permite 3/16 — pula para 1/4", () => {
    const c = selecionarChapaComercial(3.0, 2550);
    expect(c.espessura).toBeGreaterThanOrEqual(6.35);
  });

  it("largura 1800 mantém 3/16 disponível", () => {
    const c = selecionarChapaComercial(4.5, 1800);
    expect(c.polegada).toBe("3/16");
  });
});

describe("sugerirGeometriasPorVolume", () => {
  it("retorna sugestões ordenadas para 1.000 m³ com chapa 6 m", () => {
    const sugestoes = sugerirGeometriasPorVolume(1000, 6, { limite: 5 });
    expect(sugestoes.length).toBeGreaterThan(0);
    expect(sugestoes.length).toBeLessThanOrEqual(5);
    // A primeira sugestão deve ser ótima (ou pelo menos boa).
    expect(["otimo", "bom"]).toContain(sugestoes[0]!.avaliacao.classificacao);
    // Volumes precisam bater (área × altura).
    for (const s of sugestoes) {
      const vol = (Math.PI * s.D_m * s.D_m * s.H_m) / 4;
      expect(vol).toBeCloseTo(1000, 1);
    }
  });

  it("respeita restrição de altura máxima", () => {
    const sugestoes = sugerirGeometriasPorVolume(2000, 6, { H_max_m: 12 });
    for (const s of sugestoes) {
      expect(s.H_m).toBeLessThanOrEqual(12);
    }
  });
});
