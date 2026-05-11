/**
 * Verificação de capacidade de dispositivos de alívio.
 *
 * Compara a capacidade certificada do dispositivo com a vazão requerida
 * pelo cálculo de respiro normal ou emergência.
 *
 * Referência: API Standard 2000, 7ª edição (2014), Section 7.
 */

import {
  type AlertaVentilacao,
  type DispositivoAlivioAPI2000,
  type StatusDispositivo,
  type VerificacaoDispositivo,
} from "./types.js";

/**
 * Verifica se a capacidade de um dispositivo de alívio atende a
 * vazão requerida para um cenário específico.
 *
 * @param dispositivo Dados do dispositivo cadastrado
 * @param cenario Cenário de cálculo: "inbreathing", "outbreathing" ou "emergencia"
 * @param Q_requerido_Nm3h Vazão requerida calculada [Nm³/h ar equivalente]
 */
export function verificarDispositivo(
  dispositivo: DispositivoAlivioAPI2000,
  cenario: "inbreathing" | "outbreathing" | "emergencia",
  Q_requerido_Nm3h: number,
): VerificacaoDispositivo {
  const alertas: AlertaVentilacao[] = [];

  // Selecionar capacidade conforme cenário
  const Q_bruto =
    cenario === "inbreathing"
      ? dispositivo.capacidade_vacuo_Nm3h
      : dispositivo.capacidade_pressao_Nm3h;

  // Aplicar redução por corta-chamas
  let Q_disponivel: number | null = null;
  if (Q_bruto !== null && Q_bruto !== undefined) {
    const red = dispositivo.cortaChamas
      ? (dispositivo.reducaoCorta_pct ?? 25) / 100
      : 0;
    Q_disponivel = Q_bruto * (1 - red);

    if (dispositivo.cortaChamas) {
      alertas.push({
        code: "A004",
        nivel: "ALERTA",
        mensagem:
          `Corta-chamas instalado — capacidade reduzida em ${dispositivo.reducaoCorta_pct ?? 25}% ` +
          "(estimativa). Verificar perda de carga real com curva do fabricante.",
      });
    }
  } else {
    alertas.push({
      code: "F003",
      nivel: "ALERTA",
      mensagem:
        `Capacidade do dispositivo ${dispositivo.tag} não informada para o cenário "${cenario}". ` +
        "Status indeterminado.",
    });
  }

  // Calcular margem
  let margem: number | null = null;
  let status: StatusDispositivo = "INDETERMINADO";

  if (Q_disponivel !== null) {
    margem = Q_requerido_Nm3h > 0
      ? Q_disponivel / Q_requerido_Nm3h
      : null;

    if (margem !== null) {
      status = margem >= 1.0 ? "APROVADO" : "REPROVADO";
    }

    if (status === "REPROVADO" && margem !== null) {
      alertas.push({
        code: "D001",
        nivel: "CRITICO",
        mensagem:
          `Dispositivo ${dispositivo.tag} REPROVADO para ${cenario}: ` +
          `capacidade ${Q_disponivel.toFixed(1)} Nm³/h < requerido ${Q_requerido_Nm3h.toFixed(1)} Nm³/h ` +
          `(margem ${(margem * 100).toFixed(1)}%).`,
      });
    }
  }

  // Alertas adicionais
  if (dispositivo.tipo === "respiro-aberto") {
    alertas.push({
      code: "A012",
      nivel: "INFO",
      mensagem:
        `Dispositivo ${dispositivo.tag} é respiro aberto — verificar se o produto armazenado ` +
        "permite o uso de dispositivo normalmente aberto conforme API 2000 e classificação de área.",
    });
  }

  alertas.push({
    code: "A011",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Verificação preliminar. A capacidade certificada deve ser confirmada na curva " +
      "do fabricante para a pressão de ajuste e condições de contrapressão do projeto.",
  });

  return {
    dispositivo,
    cenario,
    Q_requerido_Nm3h,
    Q_disponivel_Nm3h: Q_disponivel !== null ? round2(Q_disponivel) : null,
    margem: margem !== null ? round4(margem) : null,
    status,
    alertas,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
