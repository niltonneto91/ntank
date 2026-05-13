/**
 * Avaliação do teto do tanque — API 653 §4.5.1.
 *
 * A API 653 §4.5.1 refere-se à API 650 para os critérios mínimos do teto.
 * A API 650 §5.10.5.2 estabelece a espessura mínima de 3/16" (4,76 mm) para
 * chapas de teto cônico e dome autoportante.
 *
 * O cálculo de vida útil segue o mesmo princípio do costado:
 *   RUL = (t_medida − t_min) / CR   [anos]
 *
 * Suporta múltiplas campanhas históricas via campo `historico` do TetoMedido,
 * usando regressão linear quando há 3+ pontos (mais preciso).
 *
 * NÃO reproduz texto integral da norma.
 */

import { round2 } from "./conversoes.js";
import { calcularTaxaCorrosao } from "./corrosao.js";
import type { TetoMedido, ResultadoAvaliacaoTeto, AlertaAPI653 } from "./types.js";

/**
 * Espessura mínima normativa do teto: 3/16" = 4,76 mm.
 * Referência: API 650 §5.10.5.2 (aplicado via API 653 §4.5.1).
 */
export const T_MIN_TETO_MM = 4.76; // 3/16"

/**
 * Avalia a vida útil do teto do tanque.
 *
 * @param teto         Dados medidos do teto (espessura atual + histórico)
 * @param dataInspecao Data da inspeção atual (ISO 8601)
 */
export function avaliarTeto(
  teto: TetoMedido,
  dataInspecao: string,
): ResultadoAvaliacaoTeto {
  const alertas: AlertaAPI653[] = [];
  const t_min_mm = T_MIN_TETO_MM;

  // Histórico efetivo: preferir campo 'historico'; fallback para par clássico
  const historicoEfetivo =
    teto.historico && teto.historico.length > 0
      ? teto.historico
      : teto.t_anterior_mm != null && teto.data_anterior
      ? [{ t_mm: teto.t_anterior_mm, data: teto.data_anterior }]
      : undefined;

  const taxa = calcularTaxaCorrosao(
    teto.t_medida_mm,
    teto.t_anterior_mm,
    teto.data_anterior,
    dataInspecao,
    teto.CR_assumida_mm_ano,
    historicoEfetivo,
  );
  taxa.alertas.forEach((a) => alertas.push({ ...a, code: `${a.code}-T` }));

  const CR = taxa.CR_adotada_mm_ano;
  const t_sobra_mm = round2(teto.t_medida_mm - t_min_mm);

  let RUL_anos: number | null = null;
  let status: "APROVADO" | "CRITICO" | "REPROVADO" = "APROVADO";

  if (teto.t_medida_mm < t_min_mm) {
    status = "REPROVADO";
    RUL_anos = 0;
    alertas.push({
      code: "T001",
      nivel: "CRITICO",
      mensagem:
        `Espessura do teto medida (${teto.t_medida_mm} mm) está ABAIXO do mínimo ` +
        `normativo de ${t_min_mm} mm (3/16" — API 650 §5.10.5.2). ` +
        "Reparo ou substituição obrigatório antes do retorno ao serviço.",
    });
  } else if (CR > 0) {
    RUL_anos = round2(t_sobra_mm / CR);
    if (RUL_anos < 1) {
      status = "CRITICO";
      alertas.push({
        code: "T002",
        nivel: "CRITICO",
        mensagem:
          `Vida útil do teto < 1 ano (${RUL_anos.toFixed(2)} anos). ` +
          "Intervenção urgente necessária.",
      });
    } else if (RUL_anos < 3) {
      status = "CRITICO";
      alertas.push({
        code: "T003",
        nivel: "ALERTA",
        mensagem:
          `Vida útil do teto entre 1–3 anos (${RUL_anos.toFixed(2)} anos). ` +
          "Planejar intervenção no próximo ciclo de inspeção.",
      });
    }
  }

  if (teto.t_medida_mm > 0 && teto.t_nominal_mm > 0 && teto.t_medida_mm < teto.t_nominal_mm) {
    alertas.push({
      code: "T004",
      nivel: "INFO",
      mensagem:
        `Perda de espessura no teto: ${(teto.t_nominal_mm - teto.t_medida_mm).toFixed(2)} mm ` +
        `(${((1 - teto.t_medida_mm / teto.t_nominal_mm) * 100).toFixed(1)}% da nominal).`,
    });
  }

  return {
    t_nominal_mm: teto.t_nominal_mm,
    t_medida_mm: teto.t_medida_mm,
    t_min_mm,
    t_sobra_mm,
    CR_mm_ano: CR,
    CR_historica_mm_ano: taxa.CR_historica_mm_ano,
    CR_assumida_mm_ano: teto.CR_assumida_mm_ano,
    anos_entre_inspecoes: taxa.anos_entre_inspecoes,
    n_medicoes: taxa.n_medicoes,
    RUL_anos,
    status,
    alertas,
  };
}
