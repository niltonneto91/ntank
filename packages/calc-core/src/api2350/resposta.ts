/**
 * Cálculo de tempo de resposta e volume de resposta — API 2350.
 *
 * O tempo total de resposta é a soma dos tempos parciais de cada etapa
 * necessária para terminar o recebimento após detecção de nível alto.
 *
 * O volume de resposta é o volume que entra no tanque durante o tempo
 * de resposta — deve caber entre HH e CH.
 *
 * Tudo física pura — sem copyright normativo.
 */

import type {
  ComponentesTempoAPI2350,
  ResultadoTempoRespostaAPI2350,
  EntradaVolumeRespostaAPI2350,
  ResultadoVolumeRespostaAPI2350,
  AlertaAPI2350,
} from "./types.js";
import { m3_para_L, m3_para_bbl, round2, round3 } from "./conversoes.js";

/**
 * Calcula o tempo total de resposta.
 *
 * Componentes somados:
 *   detecção + validação + comunicação + decisão + ação operacional +
 *   fechamento de válvula + parada de bomba + drenagem de linha + margem
 *
 * O tempo adotado deve ser ≥ calculado; se não informado, usa o calculado.
 */
export function calcularTempoRespostaAPI2350(
  componentes: ComponentesTempoAPI2350,
  tempoAdotado_min?: number | null,
): ResultadoTempoRespostaAPI2350 {
  const alertas: AlertaAPI2350[] = [];

  const total = round2(
    componentes.detecao_min +
      componentes.validacao_min +
      componentes.comunicacao_min +
      componentes.decisao_min +
      componentes.acaoOperacional_min +
      componentes.fechamentoValvula_min +
      componentes.paradaBomba_min +
      componentes.drenagemLinha_min +
      componentes.margemSeguranca_min,
  );

  let adotado = tempoAdotado_min ?? total;

  if (adotado < total) {
    alertas.push({
      code: "T001",
      nivel: "CRITICO",
      mensagem:
        `Tempo adotado (${adotado} min) é MENOR que o tempo calculado (${total} min). ` +
        "O tempo adotado deve ser igual ou maior que a soma de todos os componentes.",
    });
    adotado = total; // força mínimo
  }

  if (total === 0) {
    alertas.push({
      code: "T002",
      nivel: "ALERTA",
      mensagem:
        "Todos os componentes de tempo estão zerados. " +
        "Preencher os tempos reais de cada etapa da resposta operacional.",
    });
  }

  if (componentes.margemSeguranca_min === 0) {
    alertas.push({
      code: "T003",
      nivel: "ALERTA",
      mensagem:
        "Margem de segurança de tempo zerada. Recomenda-se incluir margem mínima " +
        "para incertezas operacionais (ex.: 2–5 min ou 10% do total).",
    });
  }

  alertas.push({
    code: "A002",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Tempo de resposta calculado com base nos dados fornecidos. " +
      "Validar com procedimento operacional aprovado e teste funcional real. " +
      "Referência: API Standard 2350, 5th Edition (2020).",
  });

  return {
    total_calculado_min: total,
    total_adotado_min: round2(adotado),
    componentes,
    alertas,
  };
}

/**
 * Calcula o volume de resposta requerido.
 *
 * Física: volume = Q_efetiva [m³/h] × tempo_resposta [min] / 60 [min/h]
 *
 * Conservador: usa apenas a vazão de ENTRADA máxima.
 * Não desconta saída simultânea (API 2350 recomenda abordagem conservadora).
 */
export function calcularVolumeRespostaAPI2350(
  entrada: EntradaVolumeRespostaAPI2350,
): ResultadoVolumeRespostaAPI2350 {
  const { Q_efetiva_m3h, tempo_adotado_min } = entrada;

  // volume [m³] = Q [m³/h] × t [min] / 60
  const volume_m3 = (Q_efetiva_m3h * tempo_adotado_min) / 60;

  const formula =
    `V_resposta = Q_efetiva × t_resposta / 60\n` +
    `V_resposta = ${Q_efetiva_m3h} m³/h × ${tempo_adotado_min} min / 60\n` +
    `V_resposta = ${round3(volume_m3)} m³  (= ${round2(m3_para_L(volume_m3))} L` +
    `  = ${round2(m3_para_bbl(volume_m3))} bbl)`;

  return {
    volume_m3: round3(volume_m3),
    volume_L: round2(m3_para_L(volume_m3)),
    volume_bbl: round2(m3_para_bbl(volume_m3)),
    formula,
  };
}
