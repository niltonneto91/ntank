/**
 * Cálculo da taxa de corrosão — API 653.
 *
 * A taxa de corrosão é calculada a partir do histórico de inspeções quando
 * disponível (espessura anterior + data anterior). Quando não há histórico,
 * usa a taxa assumida pelo operador (valor conservador típico para o produto
 * e condições do tanque).
 *
 * CR_2pt = (t_anterior − t_medida) / anos_entre_inspecoes   [mm/ano]
 *
 * Quando há 3 ou mais campanhas de medição, usa regressão linear dos mínimos
 * quadrados para obter uma estimativa mais precisa e robusta da taxa real.
 *
 * API 653 não especifica taxa padrão — o engenheiro responsável deve
 * definir com base no histórico, produto e critério de risco.
 *
 * NÃO reproduz texto da norma.
 */

import { anosEntreDataas, round3 } from "./conversoes.js";
import type { CursoMedido, MedicaoHistorica, ResultadoTaxaCorrosao, AlertaAPI653 } from "./types.js";

// ---------------------------------------------------------------------------
// Regressão linear com múltiplas campanhas
// ---------------------------------------------------------------------------

/**
 * Calcula a taxa de corrosão via regressão linear dos mínimos quadrados
 * usando múltiplas campanhas de medição.
 *
 * Modelo: t = a − CR × Δt (onde Δt é o tempo em anos desde a primeira medição).
 * A taxa CR é o valor absoluto do coeficiente angular.
 *
 * Com 2 pontos, equivale à fórmula de dois pontos clássica.
 * Com 3+ pontos, a regressão considera a tendência geral, tornando o cálculo
 * menos sensível a erros pontuais de medição.
 *
 * @param historico   Medições anteriores (excluindo a atual), qualquer ordem
 * @param t_atual_mm  Espessura medida na inspeção atual [mm]
 * @param dataAtual   Data da inspeção atual (ISO 8601)
 * @returns { CR_mm_ano, R2, n, anos_span } ou null se dados insuficientes
 */
export function calcularCRMultiHistorico(
  historico: MedicaoHistorica[],
  t_atual_mm: number,
  dataAtual: string,
): { CR_mm_ano: number; R2: number; n: number; anos_span: number } | null {
  // Combinar histórico + medição atual e ordenar por data crescente
  const todos = [
    ...historico.map((h) => ({ t_mm: h.t_mm, data: h.data })),
    { t_mm: t_atual_mm, data: dataAtual },
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  if (todos.length < 2) return null;

  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
  const t0_ms = new Date(todos[0]!.data).getTime();
  const tn_ms = new Date(todos[todos.length - 1]!.data).getTime();
  const anos_span = (tn_ms - t0_ms) / MS_PER_YEAR;

  if (anos_span < 0.01) return null; // intervalo insuficiente

  const pts = todos.map((m) => ({
    x: (new Date(m.data).getTime() - t0_ms) / MS_PER_YEAR,
    y: m.t_mm,
  }));

  const n = pts.length;

  // Caso especial: exatamente 2 pontos
  if (n === 2) {
    const dx = pts[1]!.x - pts[0]!.x;
    if (dx <= 0) return null;
    const CR = round3(Math.max(0, (pts[0]!.y - pts[1]!.y) / dx));
    return { CR_mm_ano: CR, R2: 1, n, anos_span };
  }

  // Regressão linear: t = a + b*x   (b < 0 para corrosão crescente)
  const sumX  = pts.reduce((s, p) => s + p.x, 0);
  const sumY  = pts.reduce((s, p) => s + p.y, 0);
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;

  if (Math.abs(denom) < 1e-10) return null;

  const b = (n * sumXY - sumX * sumY) / denom; // inclinação (negativa = corrosão)
  const CR = round3(Math.max(0, -b));

  // Coeficiente de determinação R²
  const meanY = sumY / n;
  const SStot = pts.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const a     = (sumY - b * sumX) / n;
  const SSres = pts.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0);
  const R2    = SStot > 1e-10 ? Math.max(0, 1 - SSres / SStot) : 1;

  return { CR_mm_ano: CR, R2, n, anos_span };
}

// ---------------------------------------------------------------------------
// Cálculo de taxa (ponto único ou multi-histórico)
// ---------------------------------------------------------------------------

/**
 * Calcula a taxa de corrosão de um curso a partir do histórico e da taxa assumida.
 * A taxa adotada é sempre a MAIOR entre a histórica e a assumida (conservador).
 *
 * @param t_medida_mm        Espessura medida na inspeção atual [mm]
 * @param t_anterior_mm      Espessura medida na inspeção anterior [mm] — opcional (compat.)
 * @param data_anterior      Data da inspeção anterior (ISO 8601) — opcional (compat.)
 * @param dataInspecao       Data da inspeção atual (ISO 8601)
 * @param CR_assumida_mm_ano Taxa assumida pelo operador [mm/ano]
 * @param historico          Medições anteriores — quando presente, tem precedência
 *                           sobre t_anterior_mm / data_anterior; com 3+ pontos
 *                           usa regressão linear.
 */
export function calcularTaxaCorrosao(
  t_medida_mm: number,
  t_anterior_mm: number | null | undefined,
  data_anterior: string | null | undefined,
  dataInspecao: string,
  CR_assumida_mm_ano: number,
  historico?: MedicaoHistorica[],
): ResultadoTaxaCorrosao {
  const alertas: AlertaAPI653[] = [];

  let CR_historica_mm_ano: number | null = null;
  let anos_entre_inspecoes: number | null = null;
  let n_medicoes = 1; // apenas a inspeção atual

  // ---------------------------------------------------------------------------
  // Prioridade 1: histórico com múltiplos pontos
  // ---------------------------------------------------------------------------
  if (historico && historico.length > 0) {
    const multi = calcularCRMultiHistorico(historico, t_medida_mm, dataInspecao);
    if (multi && multi.n >= 2 && multi.anos_span > 0) {
      CR_historica_mm_ano = multi.CR_mm_ano;
      anos_entre_inspecoes = round3(multi.anos_span);
      n_medicoes = multi.n;

      if (multi.n >= 3 && multi.R2 < 0.7) {
        alertas.push({
          code: "C005",
          nivel: "INFO",
          mensagem:
            `Taxa de corrosão calculada por regressão linear com ${multi.n} campanhas ` +
            `(R² = ${multi.R2.toFixed(2)}). Baixo R² indica variabilidade nas medições — ` +
            "considerar revisão dos valores medidos.",
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Prioridade 2: dois pontos clássicos (backward compat)
  // ---------------------------------------------------------------------------
  else if (
    t_anterior_mm != null &&
    t_anterior_mm > 0 &&
    data_anterior &&
    data_anterior.trim() !== ""
  ) {
    anos_entre_inspecoes = anosEntreDataas(data_anterior, dataInspecao);
    if (anos_entre_inspecoes != null && anos_entre_inspecoes > 0) {
      const delta_t = t_anterior_mm - t_medida_mm;
      CR_historica_mm_ano = round3(Math.max(0, delta_t / anos_entre_inspecoes));
      n_medicoes = 2;

      if (delta_t < 0) {
        alertas.push({
          code: "C002",
          nivel: "INFO",
          mensagem:
            `Espessura medida (${t_medida_mm} mm) é MAIOR que a anterior (${t_anterior_mm} mm). ` +
            "Possível variabilidade de medição ou melhoria de revestimento. Taxa histórica adotada = 0.",
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Alerta quando CR histórica é significativamente maior que a assumida
  // ---------------------------------------------------------------------------
  if (CR_historica_mm_ano != null && CR_historica_mm_ano > CR_assumida_mm_ano * 1.5) {
    alertas.push({
      code: "C001",
      nivel: "ALERTA",
      mensagem:
        `Taxa de corrosão histórica (${CR_historica_mm_ano.toFixed(3)} mm/ano) é ` +
        `significativamente maior que a assumida (${CR_assumida_mm_ano.toFixed(3)} mm/ano). ` +
        "Revisar a taxa assumida para os próximos ciclos de inspeção.",
    });
  }

  // Taxa adotada: maior entre a histórica e a assumida (abordagem conservadora)
  const CR_adotada_mm_ano =
    CR_historica_mm_ano != null
      ? round3(Math.max(CR_historica_mm_ano, CR_assumida_mm_ano))
      : CR_assumida_mm_ano;

  if (CR_adotada_mm_ano <= 0) {
    alertas.push({
      code: "C003",
      nivel: "ALERTA",
      mensagem:
        "Taxa de corrosão adotada = 0. Isso resulta em vida útil infinita — " +
        "verificar se a taxa é realista para o produto e condições do tanque.",
    });
  }

  return {
    CR_historica_mm_ano,
    CR_assumida_mm_ano,
    CR_adotada_mm_ano,
    anos_entre_inspecoes,
    n_medicoes,
    alertas,
  };
}

/**
 * Calcula a taxa de corrosão para cada curso a partir dos dados medidos.
 * Retorna um array com a taxa adotada por curso.
 */
export function calcularTaxasCursos(
  cursos: CursoMedido[],
  dataInspecao: string,
  CR_global_mm_ano: number,
): { numero: number; CR_adotada_mm_ano: number }[] {
  return cursos.map((c) => {
    // Construir histórico efetivo a partir do campo historico ou do par t_anterior/data_anterior
    const historico = c.historico && c.historico.length > 0
      ? c.historico
      : (c.t_anterior_mm != null && c.data_anterior
          ? [{ t_mm: c.t_anterior_mm, data: c.data_anterior }]
          : undefined);

    const resultado = calcularTaxaCorrosao(
      c.t_medida_mm,
      c.t_anterior_mm,
      c.data_anterior,
      dataInspecao,
      CR_global_mm_ano,
      historico,
    );
    return { numero: c.numero, CR_adotada_mm_ano: resultado.CR_adotada_mm_ano };
  });
}
