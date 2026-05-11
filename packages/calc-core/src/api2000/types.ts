/**
 * Tipos do módulo API 2000 (7ª edição, 2014) — Ventilação de Tanques.
 *
 * Filosofia: todos os valores normativos que dependem de tabelas protegidas
 * por copyright (API 2000, Tables 1–X) são armazenados como `number | null`.
 * null = placeholder — o usuário deve preencher com o valor correto da norma.
 *
 * O NTANK calcula o mínimo físico por deslocamento de líquido mesmo sem os
 * fatores normativos, e exibe alertas claros quando eles estão ausentes.
 */

// ---------------------------------------------------------------------------
// Classificação de produto
// ---------------------------------------------------------------------------

/** Classes de inflamabilidade conforme NBR 17505 / NFPA 30 */
export type ClasseLiquidoAPI2000 =
  | "IA"   // PF < 23°C e PE < 38°C  (ex.: gasolina)
  | "IB"   // PF < 23°C e PE ≥ 38°C  (ex.: acetona)
  | "IC"   // 23°C ≤ PF < 38°C       (ex.: xileno)
  | "II"   // 38°C ≤ PF < 60°C       (ex.: diesel)
  | "IIIA" // 60°C ≤ PF < 93°C       (ex.: óleo combustível leve)
  | "IIIB" // PF ≥ 93°C              (ex.: asfalto)
  | "nao-inflamavel"; // fora da classificação

/** Tipo de tanque suportado no módulo API 2000 MVP */
export type TipoTanqueAPI2000 =
  | "vertical-teto-fixo"
  | "vertical-teto-flutuante-interno"
  | "vertical-teto-flutuante-externo"
  | "horizontal";

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export type NivelAlerta =
  | "BLOQUEANTE" // impede o cálculo
  | "CRITICO"    // resultado pode estar incorreto
  | "ALERTA"     // atenção — verificar
  | "INFO"       // informação complementar
  | "AVISO_LEGAL"; // limitação da análise

export interface AlertaVentilacao {
  code: string;
  nivel: NivelAlerta;
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Entrada do cálculo de respiro normal
// ---------------------------------------------------------------------------

export interface EntradaRespiroNormal {
  /** Vazão máxima de enchimento [m³/h] */
  Q_enchimento_m3h: number;
  /** Vazão máxima de esvaziamento [m³/h] */
  Q_esvaziamento_m3h: number;
  /** Temperatura de armazenamento do produto [°C] */
  T_armazenamento_C: number;
  /** Classe do líquido armazenado */
  classe: ClasseLiquidoAPI2000;
  /**
   * Fator de outbreathing (saída) da API 2000 Tabela 1 [adimensional].
   * null = não preenchido → usar mínimo físico por deslocamento.
   *
   * O fator inclui a conversão de m³/h de líquido para Nm³/h de ar.
   * Verificar unidades e condições de referência na Tabela 1.
   */
  fator_outbreathing: number | null;
  /**
   * Fator de inbreathing (entrada) da API 2000 Tabela 1 [adimensional].
   * null = não preenchido → usar mínimo físico por deslocamento.
   */
  fator_inbreathing: number | null;
  /** Enchimento e esvaziamento ocorrem simultaneamente? */
  simultaneo: boolean;
  /** Produto possui sistema de blanketing (inertização)? */
  blanketing: boolean;
}

// ---------------------------------------------------------------------------
// Resultado do cálculo de respiro normal
// ---------------------------------------------------------------------------

export interface ResultadoRespiroNormal {
  // --- Inbreathing (esvaziamento — entrada de ar) ---
  /** Vazão física mínima de entrada de ar [Nm³/h] — deslocamento puro */
  Q_in_fisico_Nm3h: number;
  /**
   * Vazão normativa de entrada de ar [Nm³/h].
   * null se fator não foi informado.
   */
  Q_in_normativo_Nm3h: number | null;
  /** Vazão adotada: normativa se disponível, física se não */
  Q_in_adotado_Nm3h: number;

  // --- Outbreathing (enchimento — saída de vapor/ar) ---
  /** Vazão física mínima de saída de vapor/ar [Nm³/h] — deslocamento puro */
  Q_out_fisico_Nm3h: number;
  /**
   * Vazão normativa de saída [Nm³/h].
   * null se fator não foi informado.
   */
  Q_out_normativo_Nm3h: number | null;
  /** Vazão adotada para outbreathing */
  Q_out_adotado_Nm3h: number;

  // --- Totais ---
  /** Vazão de inbreathing requerida [Nm³/h] — para dimensionar VPV de vácuo */
  Q_in_requerido_Nm3h: number;
  /** Vazão de outbreathing requerida [Nm³/h] — para dimensionar VPV de pressão */
  Q_out_requerido_Nm3h: number;

  // --- Conversões ---
  Q_in_requerido_SCFH: number;
  Q_out_requerido_SCFH: number;

  // --- Memória de cálculo ---
  formula_in: string;
  formula_out: string;
  referenciaNormativa: string;
  parametros: {
    Q_enchimento_m3h: number;
    Q_esvaziamento_m3h: number;
    T_armazenamento_C: number;
    fator_T: number; // 273.15 / (T + 273.15) — correção de temperatura
    classe: ClasseLiquidoAPI2000;
    fator_inbreathing_usado: number | null;
    fator_outbreathing_usado: number | null;
  };
  alertas: AlertaVentilacao[];
  usouMinimoFisico: boolean; // true quando algum fator normativo estava null
}

// ---------------------------------------------------------------------------
// Dispositivo de alívio
// ---------------------------------------------------------------------------

export type TipoDispositivo =
  | "VPV"                   // Válvula pressão/vácuo (normalmente fechada)
  | "respiro-aberto"        // Respiro aberto (breather vent)
  | "valvula-emergencia"    // Válvula de alívio de emergência
  | "hatch-emergencia"      // Tampa de emergência / manhole de emergência
  | "teto-fragil"           // Junta frágil teto-costado
  | "outro";

export interface DispositivoAlivioAPI2000 {
  id: string;
  tag: string;
  tipo: TipoDispositivo;
  fabricante?: string;
  modelo?: string;
  DN_pol?: number;
  /** Pressão de ajuste [kPa(g)] — para alívio de pressão */
  P_ajuste_kPa?: number;
  /** Vácuo de ajuste [kPa(g)] — para alívio de vácuo */
  V_ajuste_kPa?: number;
  /** Capacidade certificada em pressão [Nm³/h ar] */
  capacidade_pressao_Nm3h?: number | null;
  /** Capacidade certificada em vácuo [Nm³/h ar] */
  capacidade_vacuo_Nm3h?: number | null;
  /** Há corta-chamas (flame arrester) instalado? */
  cortaChamas: boolean;
  /** Redução de capacidade pelo corta-chamas [%] — estimativa, verificar com fabricante */
  reducaoCorta_pct?: number;
  notas?: string;
}

// ---------------------------------------------------------------------------
// Resultado de verificação de dispositivo
// ---------------------------------------------------------------------------

export type StatusDispositivo = "APROVADO" | "REPROVADO" | "INDETERMINADO";

export interface VerificacaoDispositivo {
  dispositivo: DispositivoAlivioAPI2000;
  cenario: "inbreathing" | "outbreathing" | "emergencia";
  Q_requerido_Nm3h: number;
  Q_disponivel_Nm3h: number | null;
  margem: number | null; // Q_disponivel / Q_requerido
  status: StatusDispositivo;
  alertas: AlertaVentilacao[];
}
