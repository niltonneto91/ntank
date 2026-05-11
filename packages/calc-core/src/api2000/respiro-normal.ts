/**
 * Cálculo de respiro normal — API Standard 2000, 7ª edição (2014).
 *
 * Cobre dois cenários (API 2000, Seção 5):
 *   1. Inbreathing (entrada de ar) — esvaziamento do tanque
 *   2. Outbreathing (saída de vapor/ar) — enchimento do tanque
 *
 * ⚠️  IMPORTANTE — Fatores normativos:
 * Os fatores de ventilação da API 2000 (Tabela 1) são protegidos por copyright.
 * Este módulo calcula o MÍNIMO FÍSICO por deslocamento de líquido quando os
 * fatores não são informados, e exibe alertas claros. Para cálculo normativo
 * completo, o usuário deve inserir os fatores corretos da Tabela 1 da norma.
 *
 * Rastreabilidade: API Standard 2000, 7th Edition (2014), Section 5
 */

import {
  type AlertaVentilacao,
  type ClasseLiquidoAPI2000,
  type EntradaRespiroNormal,
  type ResultadoRespiroNormal,
} from "./types.js";
import {
  fatorCorrecaoTemperatura,
  nm3hParaScfh,
} from "./conversoes.js";

// ---------------------------------------------------------------------------
// Validação de entradas
// ---------------------------------------------------------------------------

function validarEntrada(
  entrada: EntradaRespiroNormal,
  alertas: AlertaVentilacao[],
): boolean {
  if (entrada.Q_enchimento_m3h < 0) {
    alertas.push({
      code: "V001",
      nivel: "BLOQUEANTE",
      mensagem: "Vazão de enchimento não pode ser negativa.",
    });
    return false;
  }
  if (entrada.Q_esvaziamento_m3h < 0) {
    alertas.push({
      code: "V002",
      nivel: "BLOQUEANTE",
      mensagem: "Vazão de esvaziamento não pode ser negativa.",
    });
    return false;
  }
  if (entrada.Q_enchimento_m3h === 0 && entrada.Q_esvaziamento_m3h === 0) {
    alertas.push({
      code: "V003",
      nivel: "CRITICO",
      mensagem:
        "Vazão de enchimento e esvaziamento são ambas zero. Verificar dados.",
    });
  }
  if (entrada.T_armazenamento_C >= 100) {
    alertas.push({
      code: "A001",
      nivel: "BLOQUEANTE",
      mensagem:
        "Temperatura de armazenamento próxima ou acima de 100 °C. " +
        "Se o produto tiver ponto de ebulição ≤ temperatura de armazenamento, " +
        "o escopo da API 2000 Seção 5 não se aplica — consultar Seção 6 (emergência).",
    });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Alertas normativos por classe de produto
// ---------------------------------------------------------------------------

function gerarAlertasClasse(
  classe: ClasseLiquidoAPI2000,
  alertas: AlertaVentilacao[],
): void {
  if (classe === "IA" || classe === "IB" || classe === "IC") {
    alertas.push({
      code: "A003",
      nivel: "CRITICO",
      mensagem:
        `Produto Classe ${classe} — válvula pressão/vácuo normalmente fechada é obrigatória ` +
        "conforme API 2000. Verificar se as exceções aplicáveis da norma se aplicam. " +
        "Respiro aberto não é aceitável sem análise específica.",
    });
  }
  if (classe === "IA" || classe === "IB") {
    alertas.push({
      code: "A003B",
      nivel: "ALERTA",
      mensagem:
        `Produto Classe ${classe} tem pressão de vapor elevada. O fator de outbreathing ` +
        "da API 2000 Tabela 1 para esta classe pode ser significativamente maior que 1,0 " +
        "por geração de vapor — verifique com a norma.",
    });
  }
}

// ---------------------------------------------------------------------------
// Alertas de fatores ausentes
// ---------------------------------------------------------------------------

function alertarFatoresAusentes(
  entrada: EntradaRespiroNormal,
  alertas: AlertaVentilacao[],
): void {
  if (entrada.fator_inbreathing === null) {
    alertas.push({
      code: "F001",
      nivel: "ALERTA",
      mensagem:
        "Fator de inbreathing (API 2000, 7ª ed., Tabela 1) não informado. " +
        "Usando mínimo físico por deslocamento de líquido. " +
        "Para cálculo normativo completo, insira o fator correto da Tabela 1.",
    });
  }
  if (entrada.fator_outbreathing === null) {
    alertas.push({
      code: "F002",
      nivel: "ALERTA",
      mensagem:
        "Fator de outbreathing (API 2000, 7ª ed., Tabela 1) não informado. " +
        "Usando mínimo físico por deslocamento de líquido. " +
        "Para cálculo normativo completo, insira o fator correto da Tabela 1.",
    });
  }
}

// ---------------------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------------------

/**
 * Calcula as vazões de respiro normal (inbreathing e outbreathing).
 *
 * Referência: API Standard 2000, 7th Edition (2014), Section 5.
 *
 * Mínimo físico — deslocamento de líquido (API 2000, princípio geral):
 *   Q_gás [Nm³/h] = Q_líquido [m³/h] × fator_T
 *   onde fator_T = 273,15 / (T_armazenamento + 273,15)  [correção ideal de temperatura]
 *
 * Cálculo normativo completo — quando fator da Tabela 1 é informado:
 *   Q_normativo [Nm³/h] = Q_líquido [m³/h] × fator_tabela_1
 *
 * O fator da Tabela 1 inclui a conversão de m³/h de líquido para Nm³/h de ar
 * equivalente, já corrigida para as condições normais. Verificar unidades da
 * tabela consultada com atenção.
 *
 * A vazão adotada é sempre o MAIOR entre o mínimo físico e o normativo.
 */
export function calcularRespiroNormal(
  entrada: EntradaRespiroNormal,
): ResultadoRespiroNormal {
  const alertas: AlertaVentilacao[] = [];

  // Validar
  validarEntrada(entrada, alertas);
  gerarAlertasClasse(entrada.classe, alertas);
  alertarFatoresAusentes(entrada, alertas);

  // Fator de correção de temperatura (lei dos gases ideais, pressão ≈ atm constante)
  const fator_T = fatorCorrecaoTemperatura(entrada.T_armazenamento_C);

  // --- Inbreathing (esvaziamento → entrada de ar) ---
  const Q_in_fisico = entrada.Q_esvaziamento_m3h * fator_T;

  const Q_in_normativo =
    entrada.fator_inbreathing !== null
      ? entrada.Q_esvaziamento_m3h * entrada.fator_inbreathing
      : null;

  // Adotar o maior entre físico e normativo (segurança)
  const Q_in_adotado =
    Q_in_normativo !== null
      ? Math.max(Q_in_fisico, Q_in_normativo)
      : Q_in_fisico;

  // --- Outbreathing (enchimento → saída de vapor/ar) ---
  const Q_out_fisico = entrada.Q_enchimento_m3h * fator_T;

  const Q_out_normativo =
    entrada.fator_outbreathing !== null
      ? entrada.Q_enchimento_m3h * entrada.fator_outbreathing
      : null;

  const Q_out_adotado =
    Q_out_normativo !== null
      ? Math.max(Q_out_fisico, Q_out_normativo)
      : Q_out_fisico;

  // --- Requeridos (para dimensionar VPV) ---
  // Se simultaneo = true: o VPV precisa atender AMBOS cenários ao mesmo tempo.
  // Se simultaneo = false: dimensionar separadamente (o maior define o tamanho do VPV).
  // Nota: API 2000 trata inbreathing (vácuo) e outbreathing (pressão) separadamente —
  // cada um dimensiona um lado diferente do VPV.
  const Q_in_requerido = Q_in_adotado;
  const Q_out_requerido = Q_out_adotado;

  if (entrada.simultaneo) {
    alertas.push({
      code: "A009",
      nivel: "INFO",
      mensagem:
        "Enchimento e esvaziamento simultâneos indicados. " +
        "O VPV deve ser selecionado para suportar ambas as condições. " +
        "Verificar com API 2000 se a combinação dos cenários é aplicável.",
    });
  }

  if (entrada.blanketing) {
    alertas.push({
      code: "A010",
      nivel: "INFO",
      mensagem:
        "Sistema de blanketing/inertização presente. " +
        "Verificar impacto na vazão de respiro normal: em sistemas fechados, " +
        "a entrada de ar pode ser substituída pela entrada do gás de blanketing. " +
        "Consultar API 2000 Seção 8 (vapor recovery).",
    });
  }

  alertas.push({
    code: "A011",
    nivel: "AVISO_LEGAL",
    mensagem:
      "Resultado preliminar — não substitui seleção final de dispositivo com curva " +
      "certificada do fabricante, verificação de perdas de carga e ART/RRT.",
  });

  const usouMinimoFisico =
    entrada.fator_inbreathing === null || entrada.fator_outbreathing === null;

  return {
    Q_in_fisico_Nm3h: round4(Q_in_fisico),
    Q_in_normativo_Nm3h: Q_in_normativo !== null ? round4(Q_in_normativo) : null,
    Q_in_adotado_Nm3h: round4(Q_in_adotado),
    Q_out_fisico_Nm3h: round4(Q_out_fisico),
    Q_out_normativo_Nm3h: Q_out_normativo !== null ? round4(Q_out_normativo) : null,
    Q_out_adotado_Nm3h: round4(Q_out_adotado),
    Q_in_requerido_Nm3h: round4(Q_in_requerido),
    Q_out_requerido_Nm3h: round4(Q_out_requerido),
    Q_in_requerido_SCFH: round2(nm3hParaScfh(Q_in_requerido)),
    Q_out_requerido_SCFH: round2(nm3hParaScfh(Q_out_requerido)),
    formula_in:
      Q_in_normativo !== null
        ? `Q_in = Q_esvaziamento × F_tab1 = ${entrada.Q_esvaziamento_m3h} × ${entrada.fator_inbreathing} = ${round4(Q_in_normativo)} Nm³/h`
        : `Q_in_físico = Q_esvaziamento × (273,15 / (T + 273,15)) = ${entrada.Q_esvaziamento_m3h} × ${round4(fator_T)} = ${round4(Q_in_fisico)} Nm³/h`,
    formula_out:
      Q_out_normativo !== null
        ? `Q_out = Q_enchimento × F_tab1 = ${entrada.Q_enchimento_m3h} × ${entrada.fator_outbreathing} = ${round4(Q_out_normativo)} Nm³/h`
        : `Q_out_físico = Q_enchimento × (273,15 / (T + 273,15)) = ${entrada.Q_enchimento_m3h} × ${round4(fator_T)} = ${round4(Q_out_fisico)} Nm³/h`,
    referenciaNormativa:
      "API Standard 2000, 7ª edição (2014), Seção 5 — Normal Venting",
    parametros: {
      Q_enchimento_m3h: entrada.Q_enchimento_m3h,
      Q_esvaziamento_m3h: entrada.Q_esvaziamento_m3h,
      T_armazenamento_C: entrada.T_armazenamento_C,
      fator_T: round4(fator_T),
      classe: entrada.classe,
      fator_inbreathing_usado: entrada.fator_inbreathing,
      fator_outbreathing_usado: entrada.fator_outbreathing,
    },
    alertas,
    usouMinimoFisico,
  };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
