/**
 * Cálculo da taxa de corrosão — API 653.
 *
 * A taxa de corrosão é calculada a partir do histórico de inspeções quando
 * disponível (espessura anterior + data anterior). Quando não há histórico,
 * usa a taxa assumida pelo operador (valor conservador típico para o produto
 * e condições do tanque).
 *
 * CR = (t_anterior − t_medida) / anos_entre_inspecoes   [mm/ano]
 *
 * API 653 não especifica taxa padrão — o engenheiro responsável deve
 * definir com base no histórico, produto e critério de risco.
 *
 * NÃO reproduz texto da norma.
 */

import { anosEntreDataas, round3 } from "./conversoes.js";
import type { CursoMedido, ResultadoTaxaCorrosao, AlertaAPI653 } from "./types.js";

/**
 * Calcula a taxa de corrosão de um curso a partir do histórico e da taxa assumida.
 * A taxa adotada é sempre a MAIOR entre a histórica e a assumida (conservador).
 *
 * @param t_medida_mm        Espessura medida na inspeção atual [mm]
 * @param t_anterior_mm      Espessura medida na inspeção anterior [mm] — opcional
 * @param data_anterior      Data da inspeção anterior (ISO 8601) — opcional
 * @param dataInspecao       Data da inspeção atual (ISO 8601)
 * @param CR_assumida_mm_ano Taxa assumida pelo operador [mm/ano]
 */
export function calcularTaxaCorrosao(
  t_medida_mm: number,
  t_anterior_mm: number | null | undefined,
  data_anterior: string | null | undefined,
  dataInspecao: string,
  CR_assumida_mm_ano: number,
): ResultadoTaxaCorrosao {
  const alertas: AlertaAPI653[] = [];

  let CR_historica_mm_ano: number | null = null;
  let anos_entre_inspecoes: number | null = null;

  // Calcular taxa histórica se houver dados de inspeção anterior
  if (
    t_anterior_mm != null &&
    t_anterior_mm > 0 &&
    data_anterior &&
    data_anterior.trim() !== ""
  ) {
    anos_entre_inspecoes = anosEntreDataas(data_anterior, dataInspecao);
    if (anos_entre_inspecoes != null && anos_entre_inspecoes > 0) {
      const delta_t = t_anterior_mm - t_medida_mm;
      CR_historica_mm_ano = round3(Math.max(0, delta_t / anos_entre_inspecoes));

      if (CR_historica_mm_ano > CR_assumida_mm_ano * 1.5) {
        alertas.push({
          code: "C001",
          nivel: "ALERTA",
          mensagem:
            `Taxa de corrosão histórica (${CR_historica_mm_ano.toFixed(3)} mm/ano) é significativamente ` +
            `maior que a taxa assumida (${CR_assumida_mm_ano.toFixed(3)} mm/ano). ` +
            "Revisar a taxa assumida para os próximos ciclos de inspeção.",
        });
      }

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
    const resultado = calcularTaxaCorrosao(
      c.t_medida_mm,
      c.t_anterior_mm,
      c.data_anterior,
      dataInspecao,
      CR_global_mm_ano,
    );
    return { numero: c.numero, CR_adotada_mm_ano: resultado.CR_adotada_mm_ano };
  });
}
