/**
 * Cálculo de bocais e reforços para tanques verticais.
 *
 * Implementa a regra simplificada de área de reforço da API 650 5.7.2:
 *
 *     A_req = d · t_h
 *
 * onde
 *     d  = diâmetro do furo no costado/teto (= bore do pescoço)
 *     t_h = espessura do costado/teto NO LOCAL do bocal.
 *
 * O reforço pode ser obtido por DOIS métodos — o app calcula ambos e
 * adota o de menor massa que ATENDA à área requerida:
 *
 *   Método A — Anel de reforço (chapa de reforço externa):
 *     anel circular de OD ≈ 2·d, ID = d_furo + folga, espessura t_anel.
 *     Área disponível ≈ (OD − d) · t_anel.
 *
 *   Método B — Pescoço espessado (sem chapa de reforço):
 *     usar pescoço com Sch maior, de espessura t_p > t_h (mínimo).
 *     Área disponível ≈ 2 · L_proj · (t_p − t_h_min) onde L_proj é o
 *     comprimento de projeção utilizável.
 *
 * Os números são CONSERVADORES e parametrizáveis — refinar com Nilton
 * contra projetos reais.
 */

import { selecionarChapaComercial } from "./chapas.js";
import { calcularFlange, type FaceFlange, type FlangeSelecao, type TipoFlange, type ClassePressao, type ResultadoFlange } from "./flanges.js";
import { DENSIDADE_ACO_CARBONO } from "./materiais.js";
import type { ResultadoCalculo } from "./types.js";

export type PosicaoBocal = "costado" | "teto";

export type FuncaoBocal =
  | "entrada-produto"
  | "saida-produto"
  | "dreno"
  | "vent"
  | "manhole"
  | "instrumentacao"
  | "outro";

export interface EntradaBocal {
  /** Identificador (e.g., "N-101"). */
  readonly tag: string;
  readonly funcao: FuncaoBocal;
  readonly posicao: PosicaoBocal;
  /** DN nominal em polegadas. */
  readonly DN_pol: number;
  readonly classe: ClassePressao;
  readonly tipoFlange: TipoFlange;
  readonly face: FaceFlange;
  /** Elevação do centro do bocal a partir da base do costado (m). Só para costado. */
  readonly elevacao_m?: number;
  /**
   * Espessura do costado/teto no local (mm). Se omitida, usa o valor
   * padrão fornecido pelo agregador (5 mm — bem conservador).
   */
  readonly t_local_mm?: number;
}

export type MetodoReforco = "anel-externo" | "pescoço-espessado";

export interface ResultadoReforco {
  readonly metodo: MetodoReforco;
  /** Área de reforço requerida (mm²). */
  readonly A_req_mm2: number;
  /** Área disponível pelo método (mm²). */
  readonly A_disp_mm2: number;
  /** Atende à área requerida? */
  readonly atende: boolean;
  /** Massa adicional do reforço (kg). */
  readonly massa_kg: number;
  /** Memória de cálculo. */
  readonly memoriaCalculo: ResultadoCalculo;
}

export interface ResultadoBocal {
  readonly entrada: EntradaBocal;
  /** Diâmetro do furo (mm) — bore do pescoço. */
  readonly d_furo_mm: number;
  /** Espessura local do costado/teto (mm). */
  readonly t_local_mm: number;
  /** Espessura do pescoço escolhida (mm). */
  readonly t_pescoco_mm: number;
  /** Comprimento do pescoço adotado (mm). */
  readonly L_pescoco_mm: number;
  /** Massa do pescoço (kg). */
  readonly massa_pescoco_kg: number;
  /** Reforço calculado pelos dois métodos. */
  readonly reforcos: ReadonlyArray<ResultadoReforco>;
  /** Reforço adotado (mais econômico que atende). */
  readonly reforcoAdotado: ResultadoReforco;
  /** Flange. */
  readonly flange: ResultadoFlange;
  /** Massa total = pescoço + reforço + flange. */
  readonly pesoTotal_kg: number;
  /** Memória de cálculo agregada. */
  readonly memoriaCalculo: ResultadoCalculo;
}

const COMPRIMENTO_PESCOCO_DEFAULT_MM: Readonly<Record<PosicaoBocal, number>> = {
  costado: 200,
  teto: 150,
};

const FOLGA_FURO_MM = 3; // diâmetro do furo = bore_flange + folga
const ESPESSURA_PESCOCO_MIN_MM = 6.35; // 1/4" como piso

export interface OpcoesBocal {
  /** Espessura local default quando t_local_mm não é informada. */
  readonly t_local_default_mm?: number;
  /** Largura customizada do anel de reforço (default OD = 2·d). */
  readonly anel_OD_fator?: number;
  /** Comprimento do pescoço customizado (mm). */
  readonly L_pescoco_mm?: number;
}

export function calcularBocal(
  entrada: EntradaBocal,
  opcoes: OpcoesBocal = {},
): ResultadoBocal {
  validarEntradaBocal(entrada);

  const flange = calcularFlange({
    DN_pol: entrada.DN_pol,
    classe: entrada.classe,
    tipo: entrada.tipoFlange,
    face: entrada.face,
  });
  const d_furo_mm = flange.dimensao.bore_mm + FOLGA_FURO_MM;
  const t_local_mm =
    entrada.t_local_mm ?? opcoes.t_local_default_mm ?? 5;

  // ============================================================
  // Pescoço (Sch 40 simplificado)
  // ============================================================
  const t_pescoco_mm = Math.max(
    ESPESSURA_PESCOCO_MIN_MM,
    estimaEspessuraSchedule40(entrada.DN_pol),
  );
  const L_pescoco_mm =
    opcoes.L_pescoco_mm ?? COMPRIMENTO_PESCOCO_DEFAULT_MM[entrada.posicao];
  const massa_pescoco_kg = massaTuboCilindrico(
    flange.dimensao.bore_mm,
    t_pescoco_mm,
    L_pescoco_mm,
  );

  // ============================================================
  // Área de reforço requerida (API 650 5.7.2)
  // ============================================================
  const A_req_mm2 = d_furo_mm * t_local_mm;

  // ----- Método A: anel de reforço -----
  const fator_OD = opcoes.anel_OD_fator ?? 2.0;
  const OD_anel_mm = Math.round(d_furo_mm * fator_OD);
  const t_anel_mm = selecionarChapaComercial(t_local_mm).espessura;
  const A_disp_anel_mm2 = (OD_anel_mm - d_furo_mm) * t_anel_mm;
  const r_externo = OD_anel_mm / 2;
  const r_interno = d_furo_mm / 2;
  const area_anular_m2 =
    (Math.PI * (r_externo * r_externo - r_interno * r_interno)) / 1_000_000;
  const massa_anel_kg =
    area_anular_m2 * (t_anel_mm / 1000) * DENSIDADE_ACO_CARBONO;

  const reforcoAnel: ResultadoReforco = {
    metodo: "anel-externo",
    A_req_mm2,
    A_disp_mm2: A_disp_anel_mm2,
    atende: A_disp_anel_mm2 >= A_req_mm2,
    massa_kg: massa_anel_kg,
    memoriaCalculo: {
      componente: `Bocal ${entrada.tag} — Reforço (anel externo)`,
      metodo: "API 650 5.7.2 — área de reforço por anel",
      itemNorma: "API 650, 5.7",
      formula: "A_disp = (OD_anel − d_furo) × t_anel ≥ A_req = d × t_h",
      parametros: {
        d_furo_mm,
        t_local_mm,
        OD_anel_mm,
        t_anel_mm,
      },
      substituicao:
        `A_req = ${d_furo_mm.toFixed(1)} × ${t_local_mm.toFixed(2)} = ${A_req_mm2.toFixed(0)} mm²; ` +
        `A_disp = (${OD_anel_mm} − ${d_furo_mm.toFixed(1)}) × ${t_anel_mm} = ${A_disp_anel_mm2.toFixed(0)} mm²`,
      resultado: { valor: A_disp_anel_mm2, unidade: "mm²" },
    },
  };

  // ----- Método B: pescoço espessado (sem chapa de reforço) -----
  // Adota t_p = t_local + 50% como pescoço mais grosso. Comprimento de
  // projeção utilizável: 2 × min(L_pescoço, 2,5·t_p) — regra simplificada.
  const t_p_grosso_mm = Math.max(t_pescoco_mm, t_local_mm * 1.5);
  const L_proj_mm = Math.min(L_pescoco_mm, 2.5 * t_p_grosso_mm);
  const A_disp_pescoco_mm2 = 2 * L_proj_mm * (t_p_grosso_mm - t_local_mm);
  const massa_pescoco_grosso_kg = massaTuboCilindrico(
    flange.dimensao.bore_mm,
    t_p_grosso_mm,
    L_pescoco_mm,
  );
  // Massa adicional sobre o pescoço Sch40 padrão.
  const massa_extra_pescoco_kg = Math.max(
    0,
    massa_pescoco_grosso_kg - massa_pescoco_kg,
  );

  const reforcoPescoco: ResultadoReforco = {
    metodo: "pescoço-espessado",
    A_req_mm2,
    A_disp_mm2: A_disp_pescoco_mm2,
    atende: A_disp_pescoco_mm2 >= A_req_mm2,
    massa_kg: massa_extra_pescoco_kg,
    memoriaCalculo: {
      componente: `Bocal ${entrada.tag} — Reforço (pescoço espessado)`,
      metodo: "API 650 5.7.2 — área de reforço pelo pescoço",
      itemNorma: "API 650, 5.7",
      formula: "A_disp = 2 · L_proj · (t_p − t_h) ≥ A_req = d · t_h",
      parametros: {
        d_furo_mm,
        t_local_mm,
        t_p_grosso_mm,
        L_proj_mm,
      },
      substituicao:
        `A_req = ${d_furo_mm.toFixed(1)} × ${t_local_mm.toFixed(2)} = ${A_req_mm2.toFixed(0)} mm²; ` +
        `A_disp = 2 × ${L_proj_mm.toFixed(0)} × (${t_p_grosso_mm.toFixed(2)} − ${t_local_mm.toFixed(2)}) = ` +
        `${A_disp_pescoco_mm2.toFixed(0)} mm²`,
      resultado: { valor: A_disp_pescoco_mm2, unidade: "mm²" },
    },
  };

  // ============================================================
  // Adoção: o mais econômico que ATENDA. Se nenhum atende, adota
  // o anel (mais conservador) e marca atende=false para alertar.
  // ============================================================
  const candidatos = [reforcoAnel, reforcoPescoco].filter((r) => r.atende);
  const reforcoAdotado =
    candidatos.length > 0
      ? candidatos.reduce((m, c) => (c.massa_kg < m.massa_kg ? c : m))
      : reforcoAnel;

  const pesoTotal_kg =
    massa_pescoco_kg + reforcoAdotado.massa_kg + flange.massa_kg;

  return {
    entrada,
    d_furo_mm,
    t_local_mm,
    t_pescoco_mm,
    L_pescoco_mm,
    massa_pescoco_kg,
    reforcos: [reforcoAnel, reforcoPescoco],
    reforcoAdotado,
    flange,
    pesoTotal_kg,
    memoriaCalculo: {
      componente: `Bocal ${entrada.tag}`,
      metodo: "API 650 5.7 (área de reforço) + ASME B16.5 (flange)",
      itemNorma: "API 650, 5.7",
      formula:
        "M_bocal = M_pescoço + M_reforço(adotado) + M_flange; A_req = d · t_h",
      parametros: {
        DN_pol: entrada.DN_pol,
        d_furo_mm,
        t_local_mm,
        t_pescoco_mm,
        L_pescoco_mm,
        metodo_reforco: reforcoAdotado.metodo,
      },
      substituicao:
        `M = ${massa_pescoco_kg.toFixed(2)} + ${reforcoAdotado.massa_kg.toFixed(2)} + ` +
        `${flange.massa_kg.toFixed(2)} = ${pesoTotal_kg.toFixed(2)} kg ` +
        `(reforço adotado: ${reforcoAdotado.metodo})`,
      resultado: { valor: pesoTotal_kg, unidade: "kg" },
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Massa de um tubo cilíndrico (paredes finas) — π · D_médio · t · L · ρ. */
function massaTuboCilindrico(
  bore_mm: number,
  espessura_mm: number,
  L_mm: number,
): number {
  const D_medio_mm = bore_mm + espessura_mm;
  const volume_m3 =
    Math.PI *
    (D_medio_mm / 1000) *
    (espessura_mm / 1000) *
    (L_mm / 1000);
  return volume_m3 * DENSIDADE_ACO_CARBONO;
}

/**
 * Estima a espessura típica de um tubo Sch 40 por DN.
 * Valores compilados de catálogo (não da norma).
 */
function estimaEspessuraSchedule40(DN_pol: number): number {
  // Tabela enxuta de Sch 40 em mm
  const tabela: Record<number, number> = {
    1: 3.38,
    1.5: 3.68,
    2: 3.91,
    3: 5.49,
    4: 6.02,
    6: 7.11,
    8: 8.18,
    10: 9.27,
    12: 10.31,
    14: 11.13,
    16: 12.7,
    18: 14.27,
    20: 15.09,
    24: 17.48,
  };
  return tabela[DN_pol] ?? 6.35;
}

function validarEntradaBocal(e: EntradaBocal): void {
  if (!e.tag.trim()) throw new Error("TAG do bocal é obrigatória.");
  if (e.DN_pol <= 0) throw new Error(`DN inválido: ${e.DN_pol}"`);
  if (e.posicao !== "costado" && e.posicao !== "teto") {
    throw new Error(`Posição inválida: ${e.posicao}`);
  }
  if (e.posicao === "costado" && (e.elevacao_m ?? 0) < 0) {
    throw new Error(`Elevação negativa: ${e.elevacao_m} m`);
  }
}

// =============================================================================
// Sugestão automática de bocais mínimos por norma (ADR §7)
// =============================================================================

export interface BocalSugerido extends EntradaBocal {
  /** Texto explicativo da função no projeto. */
  readonly justificativa: string;
}

export interface OpcoesSugestaoBocais {
  /** Diâmetro do tanque em metros — define quantidade e DN dos manholes. */
  readonly D_m?: number;
  /** Altura do tanque em metros — pode influenciar bocais futuros. */
  readonly H_m?: number;
}

/**
 * Limiares NTN (a confirmar com Nilton):
 *   - D ≤ 6 m  → 1 manhole no costado (DN 20") e 1 no teto (DN 20")
 *   - 6 < D ≤ 9 m → 2 manholes no costado (DN 24") e 1 no teto (DN 20")
 *   - D > 9 m → 2 manholes no costado (DN 24") e 2 no teto (DN 20")
 *
 * Dreno:
 *   - D ≤ 5 m  → DN 2"
 *   - 5 < D ≤ 10 m → DN 3"
 *   - D > 10 m → DN 4"
 */
const LIMITE_DUPLO_MANHOLE_COSTADO_M = 6;
const LIMITE_DUPLO_MANHOLE_TETO_M = 9;

function dnDreno_pol(D_m: number): number {
  if (D_m <= 5) return 2;
  if (D_m <= 10) return 3;
  return 4;
}

function dnEntradaSaida_pol(D_m: number): number {
  // Tanques pequenos: 4". Médios: 6". Grandes: 8".
  if (D_m <= 6) return 4;
  if (D_m <= 12) return 6;
  return 8;
}

/**
 * Lista de bocais mínimos sugeridos para um projeto NTN, parametrizada por
 * geometria do tanque (decisão 7 do ADR 0001 + regra dimensional NTN).
 *
 * Quantidades e DN variam com o diâmetro:
 *   - Manholes do costado: 1 × DN 20" se D ≤ 6 m; 2 × DN 24" se D > 6 m
 *   - Manholes do teto:    1 × DN 20" se D ≤ 9 m; 2 × DN 20" se D > 9 m
 *   - Dreno: DN 2"/3"/4" conforme faixa de D
 *   - Entradas/saídas: DN 4"/6"/8" conforme faixa de D
 *
 * Compatibilidade: chamada sem argumentos retorna a lista padrão para D=8 m
 * (mantém o comportamento histórico ~"tanque médio").
 */
export function sugerirBocaisMinimos(
  opcoes: OpcoesSugestaoBocais = {},
): ReadonlyArray<BocalSugerido> {
  const D_m = opcoes.D_m ?? 8.0;

  const sugestoes: BocalSugerido[] = [];

  // ============== TETO ==============
  // Manholes do teto
  const nManholesTeto = D_m > LIMITE_DUPLO_MANHOLE_TETO_M ? 2 : 1;
  for (let i = 1; i <= nManholesTeto; i++) {
    sugestoes.push({
      tag: `M-T-${String(i).padStart(2, "0")}`,
      funcao: "manhole",
      posicao: "teto",
      DN_pol: 20,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      justificativa:
        nManholesTeto === 1
          ? "Boca de visita do teto (acesso ao interior)."
          : `Boca de visita do teto ${i}/${nManholesTeto} — D > 9 m exige 2 acessos opostos.`,
    });
  }

  // Instrumentação fixa do teto
  sugestoes.push(
    {
      tag: "EM-T-01",
      funcao: "instrumentacao",
      posicao: "teto",
      DN_pol: 4,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      justificativa: "Escotilha de medição manual.",
    },
    {
      tag: "LT-T-01",
      funcao: "instrumentacao",
      posicao: "teto",
      DN_pol: 4,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      justificativa: "Medidor de nível eletrônico.",
    },
    {
      tag: "TT-T-01",
      funcao: "instrumentacao",
      posicao: "teto",
      DN_pol: 2,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      justificativa: "Sensor de temperatura.",
    },
    {
      tag: "LSH-T-01",
      funcao: "instrumentacao",
      posicao: "teto",
      DN_pol: 2,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      justificativa: "Sensor de transbordo (high level switch).",
    },
    {
      tag: "VPV-T-01",
      funcao: "vent",
      posicao: "teto",
      DN_pol: 6,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      justificativa: "Bocal da válvula de pressão e vácuo (VPV).",
    },
  );

  // ============== COSTADO ==============
  // Manholes do costado
  const dnManholeCostado = D_m > LIMITE_DUPLO_MANHOLE_COSTADO_M ? 24 : 20;
  const nManholesCostado = D_m > LIMITE_DUPLO_MANHOLE_COSTADO_M ? 2 : 1;
  for (let i = 1; i <= nManholesCostado; i++) {
    sugestoes.push({
      tag: `M-C-${String(i).padStart(2, "0")}`,
      funcao: "manhole",
      posicao: "costado",
      DN_pol: dnManholeCostado,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      elevacao_m: 1.0,
      justificativa:
        nManholesCostado === 1
          ? `Boca de visita lateral DN ${dnManholeCostado}" (D ≤ 6 m).`
          : `Boca de visita lateral ${i}/2 DN ${dnManholeCostado}" — D > 6 m exige 2 acessos opostos.`,
    });
  }

  const dnES = dnEntradaSaida_pol(D_m);
  sugestoes.push(
    {
      tag: "N-IN-01",
      funcao: "entrada-produto",
      posicao: "costado",
      DN_pol: dnES,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      elevacao_m: 1.5,
      justificativa: `Bocal de entrada DN ${dnES}" (recebimento de produto).`,
    },
    {
      tag: "N-OUT-01",
      funcao: "saida-produto",
      posicao: "costado",
      DN_pol: dnES,
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      elevacao_m: 0.5,
      justificativa: `Bocal de saída DN ${dnES}" (despacho de produto).`,
    },
    {
      tag: "N-LOW-01",
      funcao: "saida-produto",
      posicao: "costado",
      DN_pol: Math.max(4, dnES - 2),
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      elevacao_m: 0.3,
      justificativa: "Saída baixa.",
    },
    {
      tag: "N-DRN-01",
      funcao: "dreno",
      posicao: "costado",
      DN_pol: dnDreno_pol(D_m),
      classe: "150#",
      tipoFlange: "WN",
      face: "RF",
      elevacao_m: 0.15,
      justificativa: `Dreno do fundo DN ${dnDreno_pol(D_m)}" (proporcional ao diâmetro).`,
    },
  );

  return sugestoes;
}
