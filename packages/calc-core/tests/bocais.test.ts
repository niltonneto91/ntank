import { describe, expect, it } from "vitest";
import {
  calcularBocal,
  sugerirBocaisMinimos,
  type EntradaBocal,
} from "../src/bocais.js";

const baseBocal: EntradaBocal = {
  tag: "N-001",
  funcao: "entrada-produto",
  posicao: "costado",
  DN_pol: 6,
  classe: "150#",
  tipoFlange: "WN",
  face: "RF",
  elevacao_m: 1.5,
  t_local_mm: 8,
};

describe("calcularBocal — geometria e massa", () => {
  it("d_furo = bore_flange + folga", () => {
    const r = calcularBocal(baseBocal);
    expect(r.d_furo_mm).toBe(154 + 3); // bore DN 6" 150# = 154 mm
  });

  it("massa total = pescoço + reforço adotado + flange", () => {
    const r = calcularBocal(baseBocal);
    expect(r.pesoTotal_kg).toBeCloseTo(
      r.massa_pescoco_kg + r.reforcoAdotado.massa_kg + r.flange.massa_kg,
      4,
    );
  });

  it("pescoço para teto é mais curto que para costado", () => {
    const costado = calcularBocal({ ...baseBocal, posicao: "costado" });
    const teto = calcularBocal({ ...baseBocal, posicao: "teto", elevacao_m: undefined });
    expect(teto.L_pescoco_mm).toBeLessThan(costado.L_pescoco_mm);
  });
});

describe("calcularBocal — reforço por dois métodos", () => {
  it("calcula ambos os métodos sempre", () => {
    const r = calcularBocal(baseBocal);
    expect(r.reforcos).toHaveLength(2);
    expect(r.reforcos.map((x) => x.metodo).sort()).toEqual(
      ["anel-externo", "pescoço-espessado"].sort(),
    );
  });

  it("A_req = d_furo × t_local", () => {
    const r = calcularBocal(baseBocal);
    const A_req_esperada = r.d_furo_mm * r.t_local_mm;
    expect(r.reforcos[0]!.A_req_mm2).toBeCloseTo(A_req_esperada, 1);
    expect(r.reforcos[1]!.A_req_mm2).toBeCloseTo(A_req_esperada, 1);
  });

  it("adota o método de menor massa que ATENDA à área requerida", () => {
    const r = calcularBocal(baseBocal);
    if (r.reforcos.every((x) => x.atende)) {
      const minMassa = Math.min(...r.reforcos.map((x) => x.massa_kg));
      expect(r.reforcoAdotado.massa_kg).toBeCloseTo(minMassa, 4);
    }
    expect(r.reforcoAdotado.atende).toBe(true);
  });

  it("memória do reforço cita API 650 5.7", () => {
    const r = calcularBocal(baseBocal);
    expect(r.reforcoAdotado.memoriaCalculo.itemNorma).toBe("API 650, 5.7");
  });
});

describe("calcularBocal — flange integrado", () => {
  it("inclui ResultadoFlange completo", () => {
    const r = calcularBocal(baseBocal);
    expect(r.flange.selecao.DN_pol).toBe(6);
    expect(r.flange.selecao.classe).toBe("150#");
    expect(r.flange.massa_kg).toBeGreaterThan(0);
  });
});

describe("calcularBocal — validação", () => {
  it("rejeita TAG vazia", () => {
    expect(() => calcularBocal({ ...baseBocal, tag: "  " })).toThrow();
  });
  it("rejeita DN ≤ 0", () => {
    expect(() => calcularBocal({ ...baseBocal, DN_pol: 0 })).toThrow();
  });
  it("rejeita elevação negativa no costado", () => {
    expect(() =>
      calcularBocal({ ...baseBocal, elevacao_m: -1 }),
    ).toThrow();
  });
});

describe("sugerirBocaisMinimos — paramétrica por D", () => {
  it("D ≤ 6 m: 1 manhole DN 20 no costado e 1 no teto", () => {
    const sugestoes = sugerirBocaisMinimos({ D_m: 5 });
    const mc = sugestoes.filter(
      (s) => s.posicao === "costado" && s.funcao === "manhole",
    );
    const mt = sugestoes.filter(
      (s) => s.posicao === "teto" && s.funcao === "manhole",
    );
    expect(mc).toHaveLength(1);
    expect(mc[0]!.DN_pol).toBe(20);
    expect(mt).toHaveLength(1);
    expect(mt[0]!.DN_pol).toBe(20);
  });

  it("6 < D ≤ 9 m: 2 manholes DN 24 no costado, 1 DN 20 no teto", () => {
    const sugestoes = sugerirBocaisMinimos({ D_m: 8 });
    const mc = sugestoes.filter(
      (s) => s.posicao === "costado" && s.funcao === "manhole",
    );
    const mt = sugestoes.filter(
      (s) => s.posicao === "teto" && s.funcao === "manhole",
    );
    expect(mc).toHaveLength(2);
    expect(mc[0]!.DN_pol).toBe(24);
    expect(mt).toHaveLength(1);
  });

  it("D > 9 m: 2 manholes DN 24 no costado e 2 DN 20 no teto", () => {
    const sugestoes = sugerirBocaisMinimos({ D_m: 12 });
    const mc = sugestoes.filter(
      (s) => s.posicao === "costado" && s.funcao === "manhole",
    );
    const mt = sugestoes.filter(
      (s) => s.posicao === "teto" && s.funcao === "manhole",
    );
    expect(mc).toHaveLength(2);
    expect(mc.every((m) => m.DN_pol === 24)).toBe(true);
    expect(mt).toHaveLength(2);
    expect(mt.every((m) => m.DN_pol === 20)).toBe(true);
  });

  it("DN do dreno escala com D: 2\" / 3\" / 4\"", () => {
    const dnP = (D_m: number) =>
      sugerirBocaisMinimos({ D_m }).find((s) => s.funcao === "dreno")!.DN_pol;
    expect(dnP(4)).toBe(2);
    expect(dnP(8)).toBe(3);
    expect(dnP(12)).toBe(4);
  });

  it("DN entrada/saída escala com D: 4\" / 6\" / 8\"", () => {
    const dnP = (D_m: number) =>
      sugerirBocaisMinimos({ D_m }).find((s) => s.tag === "N-IN-01")!.DN_pol;
    expect(dnP(5)).toBe(4);
    expect(dnP(10)).toBe(6);
    expect(dnP(15)).toBe(8);
  });

  it("inclui VPV (vent) no teto sempre", () => {
    const sugestoes = sugerirBocaisMinimos({ D_m: 8 });
    const vpv = sugestoes.find((s) => s.tag.includes("VPV"));
    expect(vpv?.posicao).toBe("teto");
    expect(vpv?.funcao).toBe("vent");
  });

  it("dreno no costado com elevação baixa", () => {
    const sugestoes = sugerirBocaisMinimos({ D_m: 10 });
    const dreno = sugestoes.find((s) => s.funcao === "dreno");
    expect(dreno?.posicao).toBe("costado");
    expect(dreno?.elevacao_m).toBeLessThanOrEqual(0.5);
  });

  it("todas as sugestões são calculáveis para qualquer D", () => {
    for (const D_m of [3, 6, 9, 12, 18]) {
      const sugestoes = sugerirBocaisMinimos({ D_m });
      for (const s of sugestoes) {
        expect(
          () => calcularBocal({ ...s, t_local_mm: 8 }),
          `${s.tag} D=${D_m}`,
        ).not.toThrow();
      }
    }
  });

  it("retrocompatível: chamada sem args usa D=8 m", () => {
    const semArg = sugerirBocaisMinimos();
    const com8 = sugerirBocaisMinimos({ D_m: 8 });
    expect(semArg.length).toBe(com8.length);
  });
});
