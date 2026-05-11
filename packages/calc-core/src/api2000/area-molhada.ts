/**
 * Cálculo de área molhada (wetted area) para tanques de armazenamento.
 *
 * A área molhada é a área da superfície do tanque em contato com o líquido —
 * usada no cálculo de ventilação de emergência por fogo (API 2000, Seção 6).
 *
 * Referência: API Standard 2000, 7ª edição (2014), Seção 6 e Apêndice.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EntradaAreaMolhada {
  /** Diâmetro interno do tanque [m] */
  D_m: number;
  /** Altura máxima do nível de líquido [m] */
  H_liq_m: number;
}

export interface ResultadoAreaMolhada {
  /** Área molhada do costado [m²] */
  A_costado_m2: number;
  /** Nota: fundo apoiado em fundação não entra na área molhada (API 2000) */
  A_fundo_m2: 0;
  /** Área molhada total [m²] */
  A_total_m2: number;
  /** Área molhada em ft² (para referência com API 2000 em unidades imperiais) */
  A_total_ft2: number;
  formula: string;
  referenciaNormativa: string;
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

/**
 * Calcula a área molhada de um tanque vertical cilíndrico de teto fixo.
 *
 * Fórmula — costado molhado até a linha máxima de líquido:
 *   A_costado = π × D × H_liq
 *
 * Notas:
 *   - Fundo não conta (apoiado em fundação de areia/concreto — não exposto ao fogo)
 *   - Teto não conta como área molhada em condição normal (vapor space acima do líquido)
 *   - Para tanques de teto flutuante, o teto flutua sobre o líquido — tratar separadamente
 *
 * Referência: API Standard 2000, 7ª edição (2014), Seção 6.
 */
export function calcularAreaMolhadaVertical(
  entrada: EntradaAreaMolhada,
): ResultadoAreaMolhada {
  const { D_m, H_liq_m } = entrada;

  const A_costado = Math.PI * D_m * H_liq_m;
  const A_total = A_costado; // fundo não conta (= 0)
  const A_total_ft2 = A_total * 10.7639;

  return {
    A_costado_m2: round2(A_costado),
    A_fundo_m2: 0,
    A_total_m2: round2(A_total),
    A_total_ft2: round2(A_total_ft2),
    formula: `A_molhada = π × D × H_liq = π × ${D_m} × ${H_liq_m} = ${round2(A_total)} m²`,
    referenciaNormativa:
      "API Standard 2000, 7ª edição (2014), Seção 6 — Emergency Venting",
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
