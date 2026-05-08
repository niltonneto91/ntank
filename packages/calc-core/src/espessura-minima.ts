/**
 * Espessura mínima nominal do costado por faixa de diâmetro.
 *
 * Os valores seguem a prática API 650 (sem reproduzir tabela da norma).
 * Faixas conforme ADR 0001 §4.
 */

export interface FaixaEspessuraMinima {
  readonly D_min_m: number;
  readonly D_max_m: number;
  readonly espessuraMinima_mm: number;
  readonly descricao: string;
}

export const FAIXAS_ESPESSURA_MINIMA: ReadonlyArray<FaixaEspessuraMinima> = [
  {
    D_min_m: 0,
    D_max_m: 15,
    espessuraMinima_mm: 5,
    descricao: "D < 15 m",
  },
  {
    D_min_m: 15,
    D_max_m: 36,
    espessuraMinima_mm: 6,
    descricao: "15 ≤ D < 36 m",
  },
  {
    D_min_m: 36,
    D_max_m: 60,
    espessuraMinima_mm: 8,
    descricao: "36 ≤ D < 60 m",
  },
  {
    D_min_m: 60,
    D_max_m: Infinity,
    espessuraMinima_mm: 10,
    descricao: "D ≥ 60 m",
  },
];

export function espessuraMinimaNominal(D_m: number): number {
  for (const faixa of FAIXAS_ESPESSURA_MINIMA) {
    if (D_m >= faixa.D_min_m && D_m < faixa.D_max_m) {
      return faixa.espessuraMinima_mm;
    }
  }
  // Fallback (não deveria acontecer porque a última faixa vai até Infinity).
  return FAIXAS_ESPESSURA_MINIMA[FAIXAS_ESPESSURA_MINIMA.length - 1]!.espessuraMinima_mm;
}
