/**
 * Cálculo de ventilação de emergência por exposição ao fogo externo.
 *
 * API Standard 2000, 7ª edição (2014), Seção 6 — Emergency Venting.
 *
 * METODOLOGIA:
 * 1. Calor absorvido pelo tanque a partir do fogo externo (taxa de absorção).
 * 2. Geração de vapor pelo calor absorvido (física pura — não é propriedade da norma).
 * 3. Conversão para Nm³/h ar equivalente para comparação com dispositivo de emergência.
 *
 * A taxa de absorção de calor por exposição ao fogo (Q_calor) depende da área
 * molhada e do fator ambiental (F). O coeficiente e os fatores F estão na
 * API 2000 Seção 6 — protegidos. Este módulo aceita Q_calor_kW como entrada,
 * que o usuário calcula a partir da fórmula da norma com sua cópia.
 *
 * Alternativamente, o usuário pode informar a vazão de emergência diretamente
 * em Nm³/h, se já tiver calculado por outro meio.
 */

import { type AlertaVentilacao } from "./types.js";
import { nm3hParaScfh, m2ParaFt2, celsiusParaKelvin } from "./conversoes.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ModoEntradaEmergencia =
  | "calor_calculado"   // usuário informa Q_calor_kW + propriedades do produto
  | "vazao_direta";     // usuário informa Q_emergencia_Nm3h diretamente

export interface EntradaEmergenciaFogo {
  /** Modo de entrada do cálculo de emergência */
  modo: ModoEntradaEmergencia;

  // --- Área molhada ---
  /** Área molhada exposta ao fogo [m²] — calculada automaticamente ou manual */
  A_wet_m2: number;

  // --- Modo "calor_calculado" ---
  /**
   * Taxa de absorção de calor pelo tanque [kW], calculada pelo usuário
   * a partir da fórmula da API 2000 Seção 6 com os fatores F e A_wet.
   *
   * Fórmula (API 2000, Seção 6): Q_calor depende de F × f(A_wet)
   * O usuário deve calcular com sua cópia da norma e inserir aqui.
   *
   * null = não informado.
   */
  Q_calor_kW: number | null;

  /**
   * Calor latente de vaporização do produto [kJ/kg].
   * Necessário para converter Q_calor em vazão de vapor.
   * null = não informado → bloqueante para o cálculo.
   */
  L_kJ_kg: number | null;

  /**
   * Massa molecular do vapor do produto [kg/kmol].
   * Necessário para converter massa de vapor em volume.
   * null = não informado.
   */
  M_kg_kmol: number | null;

  /**
   * Temperatura de alívio (reliving temperature) [°C].
   * Geralmente = temperatura de ebulição do produto à pressão de alívio.
   * null = usar temperatura de armazenamento como aproximação.
   */
  T_alivio_C: number | null;

  // --- Modo "vazao_direta" ---
  /**
   * Vazão de emergência informada diretamente [Nm³/h ar equivalente].
   * Usada quando o usuário já possui o resultado calculado externamente.
   */
  Q_emergencia_Nm3h_direto: number | null;

  // --- Metadados ---
  /** Fator ambiental F usado (para registro na memória de cálculo) */
  F_ambiental: number | null;
  /** Pressão máxima admissível em emergência [kPa(g)] */
  P_max_emergencia_kPa: number | null;
  /** Sistema fixo de resfriamento por água presente e operacional? */
  resfriamentoAgua: boolean;
  /** Isolamento térmico aprovado conforme API 2000? */
  isolamentoAprovado: boolean;
}

export interface ResultadoEmergenciaFogo {
  // --- Valores calculados ---
  /** Taxa de calor absorvido [kW] — informada pelo usuário */
  Q_calor_kW: number | null;
  /** Vazão mássica de vapor gerado [kg/h] */
  m_vapor_kg_h: number | null;
  /** Vazão de vapor [Nm³/h] */
  Q_vapor_Nm3h: number | null;
  /** Vazão de emergência requerida [Nm³/h ar equivalente] */
  Q_emergencia_Nm3h: number | null;
  /** Vazão de emergência requerida [SCFH ar equivalente] */
  Q_emergencia_SCFH: number | null;

  // --- Memória de cálculo ---
  modo: ModoEntradaEmergencia;
  formula: string;
  referenciaNormativa: string;
  parametros: {
    A_wet_m2: number;
    A_wet_ft2: number;
    L_kJ_kg: number | null;
    M_kg_kmol: number | null;
    T_alivio_C: number | null;
    F_ambiental: number | null;
  };
  alertas: AlertaVentilacao[];
}

// ---------------------------------------------------------------------------
// Constantes físicas
// ---------------------------------------------------------------------------

/** Volume molar a condições normais (0°C, 101,325 kPa) [Nm³/kmol] */
const V_MOLAR_NM3_KMOL = 22.414;

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
 * Calcula a vazão de ventilação de emergência por exposição ao fogo externo.
 *
 * Física da conversão calor → vapor → Nm³/h:
 *   ṁ_vapor [kg/h] = Q_calor [kW] × 3600 / L [kJ/kg]
 *   ṅ_vapor [kmol/h] = ṁ_vapor / M [kg/kmol]
 *   Q_vapor [Nm³/h] = ṅ_vapor × V_molar [22,414 Nm³/kmol]
 *
 * Esta é física pura — a conversão de calor em taxa de vapor não é propriedade
 * de nenhuma norma. A taxa de absorção de calor (Q_calor_kW) é que depende
 * da fórmula e fatores da API 2000.
 */
export function calcularEmergenciaFogo(
  entrada: EntradaEmergenciaFogo,
): ResultadoEmergenciaFogo {
  const alertas: AlertaVentilacao[] = [];
  const A_wet_ft2 = round2(m2ParaFt2(entrada.A_wet_m2));

  // ------------------------------------------------------------------
  // Modo direto — usuário já calculou a vazão externamente
  // ------------------------------------------------------------------
  if (entrada.modo === "vazao_direta") {
    const Q = entrada.Q_emergencia_Nm3h_direto;
    if (Q === null) {
      alertas.push({
        code: "E001",
        nivel: "ALERTA",
        mensagem: "Vazão de emergência não informada. Preencher Q_emergencia_Nm3h_direto.",
      });
    }
    alertarMetadados(entrada, alertas);
    return {
      Q_calor_kW: null,
      m_vapor_kg_h: null,
      Q_vapor_Nm3h: null,
      Q_emergencia_Nm3h: Q !== null ? round2(Q) : null,
      Q_emergencia_SCFH: Q !== null ? round1(nm3hParaScfh(Q)) : null,
      modo: "vazao_direta",
      formula: "Vazão informada diretamente pelo usuário (calculada externamente).",
      referenciaNormativa: "API Standard 2000, 7ª edição (2014), Seção 6 — Emergency Venting",
      parametros: { A_wet_m2: entrada.A_wet_m2, A_wet_ft2, L_kJ_kg: null, M_kg_kmol: null, T_alivio_C: null, F_ambiental: entrada.F_ambiental },
      alertas,
    };
  }

  // ------------------------------------------------------------------
  // Modo "calor_calculado" — converte Q_calor em Nm³/h
  // ------------------------------------------------------------------
  if (entrada.Q_calor_kW === null) {
    alertas.push({
      code: "E002",
      nivel: "ALERTA",
      mensagem:
        "Taxa de absorção de calor (Q_calor_kW) não informada. " +
        "Calcule Q_calor usando a fórmula da API 2000, 7ª ed., Seção 6, " +
        "com o fator F e a área molhada (A_wet = " + round2(entrada.A_wet_m2) + " m² = " + A_wet_ft2 + " ft²), " +
        "depois insira o resultado em kW.",
    });
  }

  if (entrada.L_kJ_kg === null) {
    alertas.push({
      code: "E003",
      nivel: "CRITICO",
      mensagem:
        "Calor latente de vaporização (L) não informado — " +
        "necessário para converter calor em taxa de vapor. " +
        "Valores típicos: gasolina ≈ 300 kJ/kg, diesel ≈ 250 kJ/kg, etanol ≈ 841 kJ/kg.",
    });
  }

  if (entrada.M_kg_kmol === null) {
    alertas.push({
      code: "E004",
      nivel: "ALERTA",
      mensagem:
        "Massa molecular do vapor (M) não informada. " +
        "Valores típicos: gasolina ≈ 95 kg/kmol, diesel ≈ 198 kg/kmol, etanol = 46 kg/kmol.",
    });
  }

  // Se dados essenciais ausentes, retornar com alertas
  if (entrada.Q_calor_kW === null || entrada.L_kJ_kg === null || entrada.M_kg_kmol === null) {
    alertarMetadados(entrada, alertas);
    return {
      Q_calor_kW: entrada.Q_calor_kW,
      m_vapor_kg_h: null,
      Q_vapor_Nm3h: null,
      Q_emergencia_Nm3h: null,
      Q_emergencia_SCFH: null,
      modo: "calor_calculado",
      formula: "Dados insuficientes — preencher Q_calor_kW, L_kJ_kg e M_kg_kmol.",
      referenciaNormativa: "API Standard 2000, 7ª edição (2014), Seção 6 — Emergency Venting",
      parametros: {
        A_wet_m2: entrada.A_wet_m2, A_wet_ft2,
        L_kJ_kg: entrada.L_kJ_kg, M_kg_kmol: entrada.M_kg_kmol,
        T_alivio_C: entrada.T_alivio_C, F_ambiental: entrada.F_ambiental,
      },
      alertas,
    };
  }

  // Conversão calor → vapor (física)
  // ṁ_vapor [kg/h] = Q_calor [kW] × 3600 s/h ÷ L [kJ/kg]
  const m_vapor_kg_h = (entrada.Q_calor_kW * 3600) / entrada.L_kJ_kg;

  // ṅ_vapor [kmol/h] = ṁ_vapor [kg/h] ÷ M [kg/kmol]
  const n_vapor_kmolh = m_vapor_kg_h / entrada.M_kg_kmol;

  // Q_vapor [Nm³/h] = ṅ_vapor × V_molar [22,414 Nm³/kmol]
  // Corrigir pela temperatura de alívio vs condições normais:
  // Q_Nm3h = ṅ × 22,414 × (273,15 / T_alivio_K)
  const T_K = entrada.T_alivio_C !== null
    ? celsiusParaKelvin(entrada.T_alivio_C)
    : celsiusParaKelvin(150); // padrão conservador para ausência de dado
  const Q_vapor_Nm3h = n_vapor_kmolh * V_MOLAR_NM3_KMOL * (273.15 / T_K);

  alertarMetadados(entrada, alertas);

  const formula =
    `ṁ_vapor = Q_calor × 3600 / L = ${entrada.Q_calor_kW} × 3600 / ${entrada.L_kJ_kg} = ${round1(m_vapor_kg_h)} kg/h\n` +
    `ṅ_vapor = ṁ / M = ${round1(m_vapor_kg_h)} / ${entrada.M_kg_kmol} = ${round4(n_vapor_kmolh)} kmol/h\n` +
    `Q_vapor = ṅ × 22,414 × (273,15 / T_K) = ${round4(n_vapor_kmolh)} × 22,414 × (273,15 / ${round1(T_K)}) = ${round2(Q_vapor_Nm3h)} Nm³/h`;

  return {
    Q_calor_kW: entrada.Q_calor_kW,
    m_vapor_kg_h: round1(m_vapor_kg_h),
    Q_vapor_Nm3h: round2(Q_vapor_Nm3h),
    Q_emergencia_Nm3h: round2(Q_vapor_Nm3h),
    Q_emergencia_SCFH: round1(nm3hParaScfh(Q_vapor_Nm3h)),
    modo: "calor_calculado",
    formula,
    referenciaNormativa: "API Standard 2000, 7ª edição (2014), Seção 6 — Emergency Venting",
    parametros: {
      A_wet_m2: entrada.A_wet_m2, A_wet_ft2,
      L_kJ_kg: entrada.L_kJ_kg, M_kg_kmol: entrada.M_kg_kmol,
      T_alivio_C: entrada.T_alivio_C, F_ambiental: entrada.F_ambiental,
    },
    alertas,
  };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function alertarMetadados(
  entrada: EntradaEmergenciaFogo,
  alertas: AlertaVentilacao[],
): void {
  if (entrada.resfriamentoAgua) {
    alertas.push({
      code: "E005",
      nivel: "INFO",
      mensagem:
        "Sistema de resfriamento por água declarado. Verificar se o fator F " +
        "utilizado já incorpora a redução de API 2000 Seção 6 para este caso.",
    });
  }
  if (entrada.isolamentoAprovado) {
    alertas.push({
      code: "E006",
      nivel: "INFO",
      mensagem:
        "Isolamento térmico declarado como aprovado. Verificar critério de " +
        "resistência térmica mínima da API 2000 para aplicar o fator de redução.",
    });
  }
  alertas.push({
    code: "A011",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Resultado de emergência preliminar. Não substitui seleção final do " +
      "dispositivo de alívio com curva certificada, análise HAZOP e ART/RRT.",
  });
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
