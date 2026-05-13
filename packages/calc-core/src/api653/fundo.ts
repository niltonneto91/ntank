/**
 * Avaliação do fundo do tanque — API 653 §4.4.
 *
 * Espessuras mínimas aceitáveis (API 653 §4.4.5):
 *   - Chapa do fundo: 2,5 mm (0,1 in)
 *   - Chapa anelar: calculada em função do diâmetro e do produto
 *     (ver tabela §4.4.7 — implementado como mínimo de 6,0 mm quando
 *     não há dados de projeto disponíveis, conservador)
 *
 * Nota de direitos autorais: a tabela completa da §4.4.7 não é reproduzida.
 * O valor mínimo de 6,0 mm é o mínimo da tabela para qualquer diâmetro
 * e é o valor conservador adotado aqui. O engenheiro deve consultar o exemplar
 * licenciado da API 653 para obter o mínimo específico.
 *
 * NÃO reproduz texto integral da norma.
 */

import { anosEntreDataas, round2, round3 } from "./conversoes.js";
import { calcularTaxaCorrosao } from "./corrosao.js";
import type { FundoMedido, ResultadoAvaliacaoFundo, AlertaAPI653 } from "./types.js";

/** Espessura mínima normativa do fundo: 2,5 mm (API 653 §4.4.5) */
export const T_MIN_FUNDO_MM = 2.5;

/**
 * Espessura mínima conservadora da anelar: 6,0 mm.
 * Ver nota na documentação do módulo.
 * Referência: API 653 §4.4.7 (valor mínimo da tabela).
 */
export const T_MIN_ANELAR_MM = 6.0;

/**
 * Avalia as condições do fundo e das chapas anulares.
 *
 * @param fundo         Dados medidos do fundo
 * @param dataInspecao  Data da inspeção atual (ISO 8601)
 */
export function avaliarFundo(
  fundo: FundoMedido,
  dataInspecao: string,
): ResultadoAvaliacaoFundo {
  const alertas: AlertaAPI653[] = [];

  // Histórico efetivo: preferir campo 'historico'; fallback para par clássico
  const historicoEfetivo =
    fundo.historico && fundo.historico.length > 0
      ? fundo.historico
      : fundo.t_anterior_mm != null && fundo.data_anterior
      ? [{ t_mm: fundo.t_anterior_mm, data: fundo.data_anterior }]
      : undefined;

  // Taxa de corrosão do fundo
  const taxa = calcularTaxaCorrosao(
    fundo.t_medida_mm,
    fundo.t_anterior_mm,
    fundo.data_anterior,
    dataInspecao,
    fundo.CR_assumida_mm_ano,
    historicoEfetivo,
  );
  taxa.alertas.forEach((a) => alertas.push({ ...a, code: `${a.code}-F` }));
  const CR = taxa.CR_adotada_mm_ano;

  const t_sobra_mm = round2(fundo.t_medida_mm - T_MIN_FUNDO_MM);
  let RUL_anos: number | null = null;

  // Status do fundo
  let statusFundo: "APROVADO" | "CRITICO" | "REPROVADO" = "APROVADO";

  if (fundo.t_medida_mm < T_MIN_FUNDO_MM) {
    statusFundo = "REPROVADO";
    RUL_anos = 0;
    alertas.push({
      code: "F001",
      nivel: "CRITICO",
      mensagem:
        `Espessura do fundo medida (${fundo.t_medida_mm} mm) está ` +
        `ABAIXO do mínimo aceitável (${T_MIN_FUNDO_MM} mm — API 653 §4.4.5). ` +
        "Reparo ou substituição do fundo é obrigatório antes do retorno ao serviço.",
    });
  } else if (CR > 0) {
    RUL_anos = round2(t_sobra_mm / CR);
    if (RUL_anos < 1) {
      statusFundo = "CRITICO";
      alertas.push({
        code: "F002",
        nivel: "CRITICO",
        mensagem:
          `Vida útil do fundo < 1 ano (${RUL_anos.toFixed(2)} anos). ` +
          "Intervenção urgente necessária.",
      });
    } else if (RUL_anos < 3) {
      statusFundo = "CRITICO";
      alertas.push({
        code: "F003",
        nivel: "ALERTA",
        mensagem:
          `Vida útil do fundo entre 1–3 anos (${RUL_anos.toFixed(2)} anos). ` +
          "Planejar intervenção no próximo ciclo.",
      });
    }
  }

  // Avaliação da anelar (opcional)
  let anelarAprovado: boolean | null = null;
  if (fundo.t_anelar_mm != null) {
    anelarAprovado = fundo.t_anelar_mm >= T_MIN_ANELAR_MM;
    if (!anelarAprovado) {
      alertas.push({
        code: "F004",
        nivel: "CRITICO",
        mensagem:
          `Espessura da chapa anelar (${fundo.t_anelar_mm} mm) está abaixo do mínimo ` +
          `conservador de ${T_MIN_ANELAR_MM} mm (API 653 §4.4.7). ` +
          "Consultar o exemplar licenciado da norma para o valor específico ao diâmetro do tanque.",
      });
    }
  }

  return {
    t_nominal_mm: fundo.t_nominal_mm,
    t_medida_mm: fundo.t_medida_mm,
    t_min_aceitavel_mm: T_MIN_FUNDO_MM,
    t_sobra_mm: round2(t_sobra_mm),
    CR_mm_ano: CR,
    RUL_anos,
    anelarAprovado,
    t_anelar_min_mm: T_MIN_ANELAR_MM,
    status: statusFundo,
    alertas,
  };
}
