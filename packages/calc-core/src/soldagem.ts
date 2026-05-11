/**
 * Cálculo de soldagem do tanque.
 *
 * Tipos de junta:
 *   Costado  → topo (butt weld):
 *     ≤ 8 mm  → chanfro reto (square groove)    abertura 2 mm
 *     ≥ 9 mm  → meio-V, bisel 37° da vertical   face raiz 2 mm, abertura 3 mm
 *   Fundo/Teto → filete sobreposto:
 *     a = max(3, 0,7 × t)  mm; A = 0,5 × a²
 *
 * Consumíveis por processo:
 *   SMAW → eletrodo (efic. depósito 60%, sem gás)
 *   GMAW → arame sólido (efic. 92%, gás 0,40 m³/kg)
 *   FCAW → arame tubular (efic. 80%, gás 0,45 m³/kg)
 *
 * Corte oxicombustível + discos — estimativa proporcional ao peso total:
 *   Base de referência: 16.119 kg → 1.300 discos, 26 kg O₂, 63 m³ C₂H₂
 */

import type { ResultadoTanqueCompleto } from "./types.js";

// ─── Processos ──────────────────────────────────────────────────────────────

export type ProcessoSoldagem = "SMAW" | "GMAW" | "FCAW";

export const PROCESSOS_SOLDAGEM: Record<
  ProcessoSoldagem,
  { nome: string; efic: number; gas_m3_por_kg: number }
> = {
  SMAW: { nome: "SMAW — Eletrodo revestido",  efic: 0.60, gas_m3_por_kg: 0    },
  GMAW: { nome: "GMAW/MIG — Arame sólido",    efic: 0.92, gas_m3_por_kg: 0.40 },
  FCAW: { nome: "FCAW — Arame tubular",        efic: 0.80, gas_m3_por_kg: 0.45 },
};

// ─── Dados de referência (corte + discos) ───────────────────────────────────

/** Referência: tanque de 16.119 kg → 1.300 discos, 26 kg O₂, 63 m³ C₂H₂ */
const REF_KG      = 16_119;
const DISC_RATE   = 1_300 / REF_KG;  // discos/kg aço
const O2_RATE     =    26 / REF_KG;  // kg O₂/kg aço
const C2H2_RATE   =    63 / REF_KG;  // m³ C₂H₂/kg aço

const TAN_37 = Math.tan((37 * Math.PI) / 180); // ≈ 0,7536

// ─── Geometria da seção transversal ─────────────────────────────────────────

/**
 * Retorna a área da seção transversal do metal de solda (mm²) para 1 m de junta.
 *
 * Topo reto   (t ≤ 8 mm): raiz 2 mm + cap 1×(t+4)
 * Topo meio-V (t ≥ 9 mm): raiz 2×3 mm + triângulo + cap 1,5×(b+3)
 * Filete      (qualquer): a = max(3, 0,7t); A = 0,5a²
 */
function secaoTransversal(
  espessura_mm: number,
  tipo: "topo" | "filete",
): number {
  if (tipo === "filete") {
    const a = Math.max(3, 0.7 * espessura_mm);
    return 0.5 * a * a;
  }
  if (espessura_mm <= 8) {
    // Chanfro reto: área raiz (gap 2 mm × t) + cap (1 mm × (t+4 mm))
    return 2 * espessura_mm + (espessura_mm + 4);
  }
  // Meio-V bisel 37° da vertical
  const rf = 2;              // face de raiz (mm)
  const rg = 3;              // abertura de raiz (mm)
  const h  = espessura_mm - rf;
  const b  = h * TAN_37;    // largura do chanfro no topo (mm)
  const A_raiz    = rf * rg;
  const A_chanfro = (h * b) / 2;
  const A_cap     = 1.5 * (b + rg);
  return A_raiz + A_chanfro + A_cap;
}

/** Peso do metal de solda: A (mm²) × L (m) → kg. */
const pesoMetal = (area_mm2: number, comp_m: number): number =>
  area_mm2 * comp_m * 0.007_85;

// ─── Interfaces públicas ─────────────────────────────────────────────────────

export interface JuntaSoldagem {
  readonly descricao: string;
  readonly tipoJunta: "topo-reto" | "topo-meio-v" | "filete";
  readonly espessura_mm: number;
  readonly comprimento_m: number;
  readonly areaSeccao_mm2: number;
  readonly volume_cm3: number;
  readonly pesoMetal_kg: number;
}

export interface ConsumivelSoldagem {
  /** Eletrodo (SMAW) ou arame (GMAW/FCAW) — kg. */
  readonly material_kg: number;
  /** Gás de proteção (0 para SMAW) — m³. */
  readonly gas_m3: number;
}

export interface ComponenteSoldagem {
  readonly componente: "Costado" | "Fundo" | "Teto" | "Acessórios";
  readonly processo: ProcessoSoldagem;
  readonly juntas: ReadonlyArray<JuntaSoldagem>;
  readonly totalComprimento_m: number;
  readonly totalPesoMetal_kg: number;
  readonly consumivel: ConsumivelSoldagem;
}

export interface ResultadoSoldagem {
  readonly componentes: ReadonlyArray<ComponenteSoldagem>;
  readonly totalPesoMetal_kg: number;
  /** Discos de 4″ e 7″ (corte + desbaste). */
  readonly discos_un: number;
  /** O₂ para oxicorte (kg). */
  readonly oxigenio_kg: number;
  /** Acetileno para oxicorte (m³). */
  readonly acetileno_m3: number;
}

export interface EntradaSoldagem {
  readonly resultado: ResultadoTanqueCompleto;
  readonly larguraChapaFundo_mm?: number;
  readonly comprimentoChapaFundo_mm?: number;
  readonly larguraChapaTeto_mm?: number;
  readonly comprimentoChapaTeto_mm?: number;
  readonly processos: {
    readonly costado: ProcessoSoldagem;
    readonly fundo: ProcessoSoldagem;
    readonly teto: ProcessoSoldagem;
    readonly acessorios: ProcessoSoldagem;
  };
}

// ─── Função principal ────────────────────────────────────────────────────────

export function calcularSoldagem(
  entrada: EntradaSoldagem,
): ResultadoSoldagem {
  const { resultado, processos } = entrada;

  // Dimensões das chapas de fundo e teto (default = chapa do costado)
  const lF = (entrada.larguraChapaFundo_mm    ?? resultado.costado.entrada.larguraChapa_mm) / 1_000;
  const cF = (entrada.comprimentoChapaFundo_mm ?? resultado.costado.entrada.comprimentoChapa_mm) / 1_000;
  const lT = (entrada.larguraChapaTeto_mm      ?? resultado.costado.entrada.larguraChapa_mm) / 1_000;
  const cT = (entrada.comprimentoChapaTeto_mm  ?? resultado.costado.entrada.comprimentoChapa_mm) / 1_000;

  // ── 1. COSTADO ──────────────────────────────────────────────────────────────
  const D_m     = resultado.costado.entrada.D_mm / 1_000; // diâmetro nominal (m)
  const compr_m = resultado.costado.entrada.comprimentoChapa_mm / 1_000;
  const n_chapas = Math.ceil((Math.PI * D_m) / compr_m);
  const circ_m   = Math.PI * D_m;

  const juntasCostado: JuntaSoldagem[] = [];

  for (const anel of resultado.costado.aneis) {
    const esp  = anel.chapaComercial.espessura;
    const tipo = esp >= 9 ? "topo-meio-v" : "topo-reto";
    const L    = n_chapas * (anel.altura_mm / 1_000);
    const A    = secaoTransversal(esp, "topo");
    juntasCostado.push({
      descricao:      `Anel ${anel.indice} — juntas verticais (${n_chapas} costuras × ${(anel.altura_mm / 1000).toFixed(2)} m)`,
      tipoJunta:      tipo,
      espessura_mm:   esp,
      comprimento_m:  Number(L.toFixed(3)),
      areaSeccao_mm2: Number(A.toFixed(2)),
      volume_cm3:     Number((A * L).toFixed(2)),
      pesoMetal_kg:   Number(pesoMetal(A, L).toFixed(3)),
    });
  }

  // Juntas horizontais (circunferenciais) entre anéis adjacentes
  for (let i = 0; i < resultado.costado.aneis.length - 1; i++) {
    const anel = resultado.costado.aneis[i]!;
    const esp  = anel.chapaComercial.espessura; // anel inferior (mais grosso)
    const tipo = esp >= 9 ? "topo-meio-v" : "topo-reto";
    const A    = secaoTransversal(esp, "topo");
    juntasCostado.push({
      descricao:      `Junta circunferencial — entre anel ${i + 1} e ${i + 2}`,
      tipoJunta:      tipo,
      espessura_mm:   esp,
      comprimento_m:  Number(circ_m.toFixed(3)),
      areaSeccao_mm2: Number(A.toFixed(2)),
      volume_cm3:     Number((A * circ_m).toFixed(2)),
      pesoMetal_kg:   Number(pesoMetal(A, circ_m).toFixed(3)),
    });
  }

  const costadoComp = construirComponente("Costado", processos.costado, juntasCostado);

  // ── 2. FUNDO ────────────────────────────────────────────────────────────────
  // Lógica: n_chapas × perímetro_chapa + 2 × perímetro (interno + externo)
  //
  // Cada chapa tem 4 lados; somar o perímetro de todas as chapas dá a estimativa
  // do comprimento total das juntas internas (inclui sobreposições, portanto
  // compatível com a prática de medição de solda em campo).
  // O rodapé (filete chapa-costado) é executado por dentro E por fora → × 2.
  const aF  = resultado.fundo.area_m2;
  const eF  = resultado.fundo.e_adotada_mm;
  const AF  = secaoTransversal(eF, "filete");

  const n_chapas_fundo = Math.ceil((aF / (lF * cF)) * 1.15);
  const L_juntas_fundo = n_chapas_fundo * 2 * (lF + cF);
  const L_perim_fundo  = Math.PI * D_m * 2; // interno + externo

  const fundoComp = construirComponente("Fundo", processos.fundo, [
    {
      descricao:      `Fundo — juntas entre chapas (${n_chapas_fundo} chapas ${lF * 1000}×${cF * 1000} mm)`,
      tipoJunta:      "filete",
      espessura_mm:   eF,
      comprimento_m:  Number(L_juntas_fundo.toFixed(2)),
      areaSeccao_mm2: Number(AF.toFixed(2)),
      volume_cm3:     Number((AF * L_juntas_fundo).toFixed(2)),
      pesoMetal_kg:   Number(pesoMetal(AF, L_juntas_fundo).toFixed(3)),
    },
    {
      descricao:      `Fundo — junta perimetral rodapé (interno + externo, π × ${D_m.toFixed(3)} m × 2)`,
      tipoJunta:      "filete",
      espessura_mm:   eF,
      comprimento_m:  Number(L_perim_fundo.toFixed(2)),
      areaSeccao_mm2: Number(AF.toFixed(2)),
      volume_cm3:     Number((AF * L_perim_fundo).toFixed(2)),
      pesoMetal_kg:   Number(pesoMetal(AF, L_perim_fundo).toFixed(3)),
    },
  ]);

  // ── 3. TETO ─────────────────────────────────────────────────────────────────
  // Mesma lógica do fundo: n_chapas × perímetro_chapa + 2 × perímetro
  const aT  = resultado.teto.area_m2;
  const eT  = resultado.teto.e_adotada_mm;
  const AT  = secaoTransversal(eT, "filete");

  const n_chapas_teto = Math.ceil((aT / (lT * cT)) * 1.15);
  const L_juntas_teto = n_chapas_teto * 2 * (lT + cT);
  const L_perim_teto  = Math.PI * D_m * 2; // interno + externo

  const tetoComp = construirComponente("Teto", processos.teto, [
    {
      descricao:      `Teto — juntas entre chapas (${n_chapas_teto} chapas ${lT * 1000}×${cT * 1000} mm)`,
      tipoJunta:      "filete",
      espessura_mm:   eT,
      comprimento_m:  Number(L_juntas_teto.toFixed(2)),
      areaSeccao_mm2: Number(AT.toFixed(2)),
      volume_cm3:     Number((AT * L_juntas_teto).toFixed(2)),
      pesoMetal_kg:   Number(pesoMetal(AT, L_juntas_teto).toFixed(3)),
    },
    {
      descricao:      `Teto — junta perimetral (interno + externo, π × ${D_m.toFixed(3)} m × 2)`,
      tipoJunta:      "filete",
      espessura_mm:   eT,
      comprimento_m:  Number(L_perim_teto.toFixed(2)),
      areaSeccao_mm2: Number(AT.toFixed(2)),
      volume_cm3:     Number((AT * L_perim_teto).toFixed(2)),
      pesoMetal_kg:   Number(pesoMetal(AT, L_perim_teto).toFixed(3)),
    },
  ]);

  // ── 4. ACESSÓRIOS ────────────────────────────────────────────────────────────
  const pesoAces = resultado.pesoAcessorios_kg;
  const a_aces   = 6; // mm — filete padrão estrutural
  const L_aces   = pesoAces * 0.05; // estimativa: 50 mm de solda por kg de aço
  const A_aces   = 0.5 * a_aces * a_aces;
  const juntasAces: JuntaSoldagem[] = pesoAces > 0
    ? [{
        descricao:      `Acessórios — filete estrutural a=6 mm (estimativa)`,
        tipoJunta:      "filete",
        espessura_mm:   a_aces,
        comprimento_m:  Number(L_aces.toFixed(2)),
        areaSeccao_mm2: Number(A_aces.toFixed(2)),
        volume_cm3:     Number((A_aces * L_aces).toFixed(2)),
        pesoMetal_kg:   Number(pesoMetal(A_aces, L_aces).toFixed(3)),
      }]
    : [];
  const acesComp = construirComponente("Acessórios", processos.acessorios, juntasAces);

  // ── Totais ───────────────────────────────────────────────────────────────────
  const componentes = [costadoComp, fundoComp, tetoComp, acesComp];
  const totalPesoMetal_kg = componentes.reduce((s, c) => s + c.totalPesoMetal_kg, 0);
  const pesoTotalAco = resultado.pesoTotal_kg;

  return {
    componentes,
    totalPesoMetal_kg: Number(totalPesoMetal_kg.toFixed(2)),
    discos_un:         Math.ceil(pesoTotalAco * DISC_RATE),
    oxigenio_kg:       Number((pesoTotalAco * O2_RATE).toFixed(1)),
    acetileno_m3:      Number((pesoTotalAco * C2H2_RATE).toFixed(1)),
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function construirComponente(
  componente: ComponenteSoldagem["componente"],
  processo: ProcessoSoldagem,
  juntas: JuntaSoldagem[],
): ComponenteSoldagem {
  const totalComprimento_m = juntas.reduce((s, j) => s + j.comprimento_m, 0);
  const totalPesoMetal_kg  = juntas.reduce((s, j) => s + j.pesoMetal_kg,  0);
  const p = PROCESSOS_SOLDAGEM[processo];
  return {
    componente,
    processo,
    juntas,
    totalComprimento_m: Number(totalComprimento_m.toFixed(2)),
    totalPesoMetal_kg:  Number(totalPesoMetal_kg.toFixed(3)),
    consumivel: {
      material_kg: Number((totalPesoMetal_kg / p.efic).toFixed(2)),
      gas_m3:      Number((totalPesoMetal_kg * p.gas_m3_por_kg).toFixed(2)),
    },
  };
}
