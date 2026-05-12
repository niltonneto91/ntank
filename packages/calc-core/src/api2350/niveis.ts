/**
 * Verificação de níveis operacionais — API 2350.
 *
 * Verifica a adequação das distâncias entre MW, H, HH, AOPS e CH,
 * e se o volume de resposta cabe entre HH e CH.
 *
 * Critério normativo principal (sem reproduzir texto da norma):
 * - Distância mínima HH–CH: 76 mm (3 inches) — mínimo absoluto.
 * - Distância efetiva mínima: max(76 mm, distância calculada pelo volume de resposta).
 * - MW deve estar abaixo de HH (o HH não é nível de operação rotineira).
 * - AOPS, quando presente, deve atuar em ou acima do HH.
 * - CH deve estar abaixo do nível físico máximo de transbordamento.
 *
 * Referência: API Standard 2350, 5th Edition, 2020.
 */

import type {
  EntradaNiveisAPI2350,
  ResultadoNiveisAPI2350,
  StatusVerificacao,
  AlertaAPI2350,
} from "./types.js";
import { round2, round3, m_para_mm } from "./conversoes.js";

/** Distância mínima normativa HH-CH: 3 in = 3 × 25,4 = 76,2 mm (API 2350 §5) */
const DISTANCIA_MINIMA_NORMATIVA_MM = 76.2 as const;

export function verificarNiveisAPI2350(
  entrada: EntradaNiveisAPI2350,
): ResultadoNiveisAPI2350 {
  const {
    H_fisico_max_m, CH_m, AOPS_m, HH_m, H_m, MW_m,
    A_m2, volume_resposta_m3, temAOPS, Q_efetiva_m3h,
  } = entrada;

  const alertas: AlertaAPI2350[] = [];

  // ----- Distâncias disponíveis -----
  const distancia_CH_HH_mm = round2(m_para_mm(CH_m - HH_m));
  const distancia_HH_MW_mm = round2(m_para_mm(HH_m - MW_m));
  const distancia_CH_fisico_mm = round2(m_para_mm(H_fisico_max_m - CH_m));

  // ----- Distância requerida pelo volume de resposta -----
  // distancia_requerida [mm] = volume_resposta [m³] / A [m²] × 1000
  const distancia_requerida_mm = round2(A_m2 > 0 ? (volume_resposta_m3 / A_m2) * 1000 : 0);

  // Distância efetiva mínima = max(normativa, calculada)
  const distancia_efetiva_minima_mm = Math.max(
    DISTANCIA_MINIMA_NORMATIVA_MM,
    distancia_requerida_mm,
  );

  // ----- Tempo disponível entre HH e CH -----
  // t_disponivel [min] = (dist_CH_HH [m] × A [m²]) / Q [m³/h] × 60
  // Requer Q_efetiva_m3h na entrada; retorna 0 quando omitido.
  const volume_disponivel_m3 = (distancia_CH_HH_mm / 1000) * A_m2;
  const tempo_disponivel_HH_CH_min =
    Q_efetiva_m3h && Q_efetiva_m3h > 0
      ? round2((volume_disponivel_m3 / Q_efetiva_m3h) * 60)
      : 0;

  // ----- Status: distância HH→CH -----
  let status_distancia_HH_CH: StatusVerificacao;
  if (distancia_CH_HH_mm <= 0) {
    status_distancia_HH_CH = "REPROVADO";
    alertas.push({
      code: "N001",
      nivel: "CRITICO",
      mensagem: `HH (${HH_m} m) está ACIMA ou NO MESMO NÍVEL do CH (${CH_m} m). ` +
        "Isso é fisicamente impossível — HH deve estar ABAIXO do CH.",
    });
  } else if (distancia_CH_HH_mm < DISTANCIA_MINIMA_NORMATIVA_MM) {
    status_distancia_HH_CH = "REPROVADO";
    alertas.push({
      code: "N002",
      nivel: "CRITICO",
      mensagem:
        `Distância HH→CH disponível (${distancia_CH_HH_mm} mm) é MENOR que o mínimo normativo ` +
        `(${DISTANCIA_MINIMA_NORMATIVA_MM} mm = 3 in). ` +
        "Ajustar os níveis para atender ao requisito mínimo da API 2350.",
    });
  } else if (distancia_CH_HH_mm < distancia_requerida_mm) {
    status_distancia_HH_CH = "REPROVADO";
    alertas.push({
      code: "N003",
      nivel: "CRITICO",
      mensagem:
        `Distância HH→CH disponível (${distancia_CH_HH_mm} mm) é INSUFICIENTE para ` +
        `acomodar o volume de resposta. ` +
        `Requerido: ${distancia_requerida_mm} mm. ` +
        "Reduzir o tempo de resposta, a vazão máxima de enchimento, ou aumentar a distância.",
    });
  } else {
    status_distancia_HH_CH = "APROVADO";
  }

  // ----- Status: MW abaixo de HH -----
  // Requisito normativo API 2350: MW < HH (sem distância mínima especificada).
  // A margem MW→HH < 76 mm é recomendação operacional (não normativa).
  let status_MW_abaixo_HH: StatusVerificacao;
  if (MW_m >= HH_m) {
    status_MW_abaixo_HH = "REPROVADO";
    alertas.push({
      code: "N004",
      nivel: "CRITICO",
      mensagem:
        `MW (${MW_m} m) está ACIMA ou NO MESMO NÍVEL do HH (${HH_m} m). ` +
        "Operar rotineiramente no nível HH não é aceitável — HH é camada de proteção, não controle de enchimento.",
    });
  } else {
    status_MW_abaixo_HH = "APROVADO";
    if (distancia_HH_MW_mm < 76.2) {
      alertas.push({
        code: "N005",
        nivel: "ALERTA",
        mensagem:
          `Margem MW→HH (${distancia_HH_MW_mm.toFixed(1)} mm) é menor que 76 mm. ` +
          "Recomendação operacional: aumentar margem para evitar acionamentos inadvertidos do alarme HH. " +
          "(Não há distância mínima MW→HH na API 2350 — verificação somente operacional.)",
      });
    }
  }

  // ----- Status: AOPS -----
  let status_AOPS: StatusVerificacao | null = null;
  if (temAOPS && AOPS_m != null) {
    if (AOPS_m < HH_m) {
      status_AOPS = "REPROVADO";
      alertas.push({
        code: "N006",
        nivel: "CRITICO",
        mensagem:
          `Nível de atuação do AOPS (${AOPS_m} m) está ABAIXO do HH (${HH_m} m). ` +
          "O AOPS deve atuar em ou acima do HH, permitindo ao MOPS agir primeiro. " +
          "Se o AOPS atuar antes do alarme HH, o MOPS fica inoperante.",
      });
    } else if (AOPS_m > CH_m) {
      status_AOPS = "REPROVADO";
      alertas.push({
        code: "N007",
        nivel: "CRITICO",
        mensagem:
          `Nível de atuação do AOPS (${AOPS_m} m) está ACIMA do CH (${CH_m} m). ` +
          "O AOPS deve atuar ABAIXO do CH para prevenir o transbordamento.",
      });
    } else {
      status_AOPS = "APROVADO";
    }
  } else if (temAOPS && AOPS_m == null) {
    status_AOPS = "INDETERMINADO";
    alertas.push({
      code: "N008",
      nivel: "ALERTA",
      mensagem: "AOPS declarado como presente, mas nível de atuação não informado.",
    });
  }

  // ----- Status: CH abaixo do físico -----
  // Requisito normativo API 2350: CH < H_fisico_max (sem folga mínima especificada).
  // Folga < 50 mm é alerta operacional (não normativo).
  let status_CH_abaixo_fisico: StatusVerificacao;
  if (CH_m >= H_fisico_max_m) {
    status_CH_abaixo_fisico = "REPROVADO";
    alertas.push({
      code: "N009",
      nivel: "CRITICO",
      mensagem:
        `CH (${CH_m} m) está ACIMA ou NO MESMO NÍVEL físico máximo (${H_fisico_max_m} m). ` +
        "O CH deve estar abaixo do ponto de transbordamento real.",
    });
  } else {
    status_CH_abaixo_fisico = "APROVADO";
    if (distancia_CH_fisico_mm < 50) {
      alertas.push({
        code: "N010",
        nivel: "ALERTA",
        mensagem:
          `Folga CH→nível físico (${distancia_CH_fisico_mm.toFixed(1)} mm) é muito pequena. ` +
          "Verificar se há freeboard suficiente após o CH. " +
          "(A API 2350 não especifica folga mínima CH→físico — verificação somente operacional.)",
      });
    }
  }

  // Aviso geral (H level opcional)
  if (H_m != null && H_m >= HH_m) {
    alertas.push({
      code: "N011",
      nivel: "CRITICO",
      mensagem:
        `Nível H (High) (${H_m} m) está acima ou no mesmo nível do HH (${HH_m} m). ` +
        "H deve ser estritamente inferior ao HH.",
    });
  }

  alertas.push({
    code: "A003",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Verificação de níveis preliminar — não substitui análise de risco formal, " +
      "validação com instrumentação certificada e ART/RRT do responsável técnico. " +
      "Referência: API Standard 2350, 5th Edition, 2020.",
  });

  return {
    distancia_CH_HH_mm,
    distancia_HH_MW_mm,
    distancia_CH_fisico_mm,
    distancia_requerida_mm,
    distancia_minima_normativa_mm: DISTANCIA_MINIMA_NORMATIVA_MM,
    distancia_efetiva_minima_mm: round2(distancia_efetiva_minima_mm),
    tempo_disponivel_HH_CH_min,
    status_distancia_HH_CH,
    status_MW_abaixo_HH,
    status_AOPS,
    status_CH_abaixo_fisico,
    alertas,
  };
}
