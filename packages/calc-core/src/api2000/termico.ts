/**
 * Cálculo do efeito térmico normal — API Standard 2000, 7ª edição (2014).
 *
 * O efeito térmico é causado pela variação da temperatura ambiente
 * (diurna/sazonal) que expande ou contrai o gás no espaço vazio do tanque.
 *
 * API 2000 fornece fatores tabelados (Tabela 2) em função do volume do tanque.
 * Esses fatores são protegidos por copyright — este módulo usa um valor
 * informado pelo usuário (obtido da sua cópia da norma).
 *
 * Referência: API Standard 2000, 7ª edição (2014), Seção 5 — Thermal Effects.
 */

import {
  type AlertaVentilacao,
  type ClasseLiquidoAPI2000,
} from "./types.js";
import { nm3hParaScfh } from "./conversoes.js";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EntradaTermico {
  /** Volume nominal do tanque [m³] */
  V_nominal_m3: number;
  /** Temperatura de armazenamento do produto [°C] */
  T_armazenamento_C: number;
  /** Classe do produto */
  classe: ClasseLiquidoAPI2000;
  /**
   * Vazão de efeito térmico [Nm³/h] obtida diretamente da
   * API 2000 Tabela 2, para o volume do tanque e temperatura do produto.
   *
   * null = não preenchido. O sistema não calcula automaticamente pois
   * a tabela é protegida por copyright.
   *
   * INSTRUÇÃO: Consulte a API Standard 2000, 7ª ed. (2014), Tabela 2
   * (ou equivalente), para o volume do tanque em barris e a temperatura
   * de armazenamento. Insira o valor em Nm³/h.
   */
  Q_termico_Nm3h: number | null;
  /** Produto armazenado tem blanketing/inertização? */
  blanketing: boolean;
}

export interface ResultadoTermico {
  /** Vazão de efeito térmico [Nm³/h] — valor da Tabela 2 ou null */
  Q_termico_Nm3h: number | null;
  /** Vazão de efeito térmico [SCFH] */
  Q_termico_SCFH: number | null;
  /** Volume do tanque em barris (para referência na Tabela 2) */
  V_bbl: number;
  /** Indica se o valor foi informado pelo usuário ou é placeholder */
  informado: boolean;
  referenciaNormativa: string;
  instrucao: string;
  alertas: AlertaVentilacao[];
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

const BBL_POR_M3 = 6.28981;

/**
 * Processa o efeito térmico normal.
 *
 * Para tanques pequenos (< ~500 m³ / ~3.145 bbl) o efeito térmico
 * pode superar a ventilação por movimentação de líquido.
 * Para tanques grandes, geralmente é dominado pela movimentação.
 */
export function calcularTermico(entrada: EntradaTermico): ResultadoTermico {
  const alertas: AlertaVentilacao[] = [];

  const V_bbl = round1(entrada.V_nominal_m3 * BBL_POR_M3);
  const Q_Nm3h = entrada.Q_termico_Nm3h;
  const Q_SCFH = Q_Nm3h !== null ? round1(nm3hParaScfh(Q_Nm3h)) : null;

  if (Q_Nm3h === null) {
    alertas.push({
      code: "T001",
      nivel: "ALERTA",
      mensagem:
        `Efeito térmico não quantificado — valor da API 2000 Tabela 2 não informado. ` +
        `Volume do tanque: ${round1(entrada.V_nominal_m3)} m³ (${V_bbl} bbl). ` +
        `Consulte a API 2000, 7ª ed. (2014), Tabela 2 e insira a vazão correspondente.`,
    });
  }

  if (V_bbl < 3145 && Q_Nm3h === null) {
    alertas.push({
      code: "T002",
      nivel: "ALERTA",
      mensagem:
        `Tanque pequeno (${V_bbl} bbl < 3.145 bbl). Para volumes nessa faixa, ` +
        `o efeito térmico pode ser o cenário dominante. ` +
        `Recomenda-se fortemente preencher a Tabela 2.`,
    });
  }

  if (entrada.blanketing) {
    alertas.push({
      code: "T003",
      nivel: "INFO",
      mensagem:
        "Sistema de blanketing presente. O efeito térmico pode ser absorvido pelo " +
        "sistema de controle de pressão do blanketing — avaliar com API 2000 Seção 8.",
    });
  }

  return {
    Q_termico_Nm3h: Q_Nm3h,
    Q_termico_SCFH: Q_SCFH,
    V_bbl,
    informado: Q_Nm3h !== null,
    referenciaNormativa: "API Standard 2000, 7ª edição (2014), Seção 5 — Thermal Effects",
    instrucao:
      `Tabela 2 da API 2000: localizar linha de ${V_bbl} bbl e coluna de ` +
      `T = ${entrada.T_armazenamento_C} °C. Inserir valor em Nm³/h no campo acima.`,
    alertas,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
