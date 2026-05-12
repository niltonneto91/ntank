/**
 * Datas recomendadas para a próxima inspeção — API 653 §6.
 *
 * Intervalos máximos entre inspeções (API 653 §6.3 e §6.4):
 *
 *   Inspeção INTERNA (out-of-service):
 *     Intervalo ≤ min(RUL / 4, 20 anos)
 *     Para tanques com alto risco, o intervalo pode ser menor.
 *
 *   Inspeção EXTERNA (on-stream):
 *     Intervalo ≤ min(RUL / 2, 10 anos)
 *     (Nota: varia por edição da norma e por critério de risco do operador)
 *
 * A norma usa Remaining Life dividida por fator de segurança.
 * O fator 4 (interna) e 2 (externa) são os valores padrão da API 653 §6.
 * Limites absolutos: 20 anos (interna) e 10 anos (externa).
 *
 * NÃO reproduz texto integral da norma.
 */

import { adicionarAnos, round1 } from "./conversoes.js";
import type { ResultadoProximaInspecao, AlertaAPI653 } from "./types.js";

/** Fator de segurança para inspeção interna: RUL / 4 (API 653 §6) */
const FATOR_INTERNO = 4;
/** Fator de segurança para inspeção externa: RUL / 2 (API 653 §6) */
const FATOR_EXTERNO = 2;
/** Intervalo máximo absoluto para inspeção interna [anos] */
const MAX_INTERNO_ANOS = 20;
/** Intervalo máximo absoluto para inspeção externa [anos] */
const MAX_EXTERNO_ANOS = 10;

/**
 * Calcula as datas recomendadas para a próxima inspeção interna e externa.
 *
 * @param dataInspecao     Data da inspeção atual (ISO 8601)
 * @param RUL_costado_anos Vida útil restante do curso crítico do costado [anos] — null se indefinida
 * @param RUL_fundo_anos   Vida útil restante do fundo [anos] — null se indefinida ou fundo não avaliado
 */
export function calcularProximaInspecao(
  dataInspecao: string,
  RUL_costado_anos: number | null,
  RUL_fundo_anos: number | null,
): ResultadoProximaInspecao {
  const alertas: AlertaAPI653[] = [];

  // RUL crítico = menor entre costado e fundo (excluindo nulls)
  const vals = [RUL_costado_anos, RUL_fundo_anos].filter((v): v is number => v !== null && v > 0);
  const RUL_critico = vals.length > 0 ? Math.min(...vals) : null;

  let intervaloInterno: number | null = null;
  let intervaloExterno: number | null = null;
  let dataProximaInterna: string | null = null;
  let dataProximaExterna: string | null = null;

  if (RUL_critico !== null) {
    intervaloInterno = round1(Math.min(RUL_critico / FATOR_INTERNO, MAX_INTERNO_ANOS));
    intervaloExterno = round1(Math.min(RUL_critico / FATOR_EXTERNO, MAX_EXTERNO_ANOS));

    dataProximaInterna = adicionarAnos(dataInspecao, intervaloInterno);
    dataProximaExterna = adicionarAnos(dataInspecao, intervaloExterno);

    if (intervaloInterno < 1) {
      alertas.push({
        code: "I001",
        nivel: "CRITICO",
        mensagem:
          `Intervalo recomendado para próxima inspeção INTERNA < 1 ano (${intervaloInterno.toFixed(1)} anos). ` +
          "Avaliação de risco e decisão de reparo/substituição urgentes.",
      });
    } else if (intervaloInterno < 3) {
      alertas.push({
        code: "I002",
        nivel: "ALERTA",
        mensagem:
          `Intervalo recomendado para próxima inspeção INTERNA < 3 anos (${intervaloInterno.toFixed(1)} anos). ` +
          "Planejar próxima parada de manutenção.",
      });
    }
  } else {
    // Sem RUL definido: usar limites absolutos (conservador)
    intervaloInterno = MAX_INTERNO_ANOS;
    intervaloExterno = MAX_EXTERNO_ANOS;
    dataProximaInterna = adicionarAnos(dataInspecao, MAX_INTERNO_ANOS);
    dataProximaExterna = adicionarAnos(dataInspecao, MAX_EXTERNO_ANOS);
    alertas.push({
      code: "I003",
      nivel: "INFO",
      mensagem:
        "Taxa de corrosão = 0 ou não informada — usando intervalos máximos absolutos " +
        `(interna: ${MAX_INTERNO_ANOS} anos, externa: ${MAX_EXTERNO_ANOS} anos). ` +
        "Verificar se a taxa de corrosão adotada é adequada.",
    });
  }

  return {
    dataInspecao,
    RUL_critico_anos: RUL_critico,
    dataProximaInterna,
    intervaloInterno_anos: intervaloInterno,
    dataProximaExterna,
    intervaloExterno_anos: intervaloExterno,
    alertas,
  };
}
