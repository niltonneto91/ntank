/**
 * Classificação preliminar de categoria OPS — API 2350.
 *
 * Categorias 0, 1, 2 e 3 conforme API Standard 2350, 5th Edition, 2020.
 *
 * IMPORTANTE: A classificação aqui é PRELIMINAR e ORIENTATIVA.
 * A API 2350 exige que o proprietário/operador realize sua própria
 * análise de risco para confirmar a categoria aplicável.
 *
 * Os valores de tempo mínimo de resposta por categoria (Annex G da API 2350)
 * são carregados como NULL — o usuário deve inserir os valores do seu exemplar
 * licenciado da norma. Este módulo não reproduz o conteúdo do Annex G.
 *
 * NOTA DE COPYRIGHT: As definições de categoria foram implementadas a partir
 * de conhecimento público. Não reproduz texto normativo da API 2350.
 */

import type {
  EntradaCategoriaAPI2350,
  ResultadoCategoriaAPI2350,
  CategoriaOPS,
  TipoOPS,
  AlertaAPI2350,
} from "./types.js";

/**
 * Classifica a categoria OPS preliminar do tanque.
 *
 * Lógica de progressão:
 *   Cat 0 → sem ATG/instrumento automático, sem transmissão remota
 *   Cat 1 → instrumento local ou ATG com display local apenas
 *   Cat 2 → ATG + nível e alarme HH transmitidos para centro de controle
 *   Cat 3 → ATG + LAHH INDEPENDENTE + transmissão a local continuamente ocupado
 *            + capacidade de encerrar remotamente
 */
export function classificarCategoriaOPS(
  entrada: EntradaCategoriaAPI2350,
): ResultadoCategoriaAPI2350 {
  const {
    temATG,
    nivelTransmitidoRemoto,
    alarmeHHTransmitidoLocalOcupado,
    temLAHHIndependente,
    presencaOperacional,
    capacidadeEncerrarRemoto,
    temAOPS,
  } = entrada;

  const alertas: AlertaAPI2350[] = [];
  const atendidos: string[] = [];
  const naoAtendidos: string[] = [];

  // Determinar tipo de OPS
  let tipoOPS: TipoOPS;
  if (temAOPS && !nivelTransmitidoRemoto) {
    tipoOPS = "AOPS";
  } else if (temAOPS) {
    tipoOPS = "MOPS+AOPS";
  } else {
    tipoOPS = "MOPS";
  }

  // --- Avaliação Cat 3 ---
  const requisitos3 = {
    temATG,
    temLAHHIndependente,
    nivelTransmitidoRemoto,
    alarmeHHTransmitidoLocalOcupado,
    capacidadeEncerrarRemoto,
  };

  if (
    requisitos3.temATG &&
    requisitos3.temLAHHIndependente &&
    requisitos3.nivelTransmitidoRemoto &&
    requisitos3.alarmeHHTransmitidoLocalOcupado &&
    requisitos3.capacidadeEncerrarRemoto
  ) {
    atendidos.push("ATG instalado");
    atendidos.push("Sensor LAHH independente do ATG");
    atendidos.push("Nível transmitido remotamente");
    atendidos.push("Alarme HH transmitido a local continuamente ocupado");
    atendidos.push("Capacidade de encerrar recebimento remotamente");

    if (presencaOperacional === "nao-assistida") {
      alertas.push({
        code: "C301",
        nivel: "INFO",
        mensagem:
          "Instalação não assistida com Categoria 3: verificar se o tempo de resposta " +
          "disponível é suficiente para encerrar o fluxo remotamente.",
      });
    }

    return buildResult(3, tipoOPS, atendidos, naoAtendidos, alertas, entrada);
  }

  // Registrar o que falta para Cat 3
  if (!temATG) naoAtendidos.push("ATG não instalado (exigido para Cat 3)");
  if (!temLAHHIndependente) naoAtendidos.push("Sensor LAHH independente não presente (exigido para Cat 3)");
  if (!nivelTransmitidoRemoto) naoAtendidos.push("Nível não transmitido remotamente (exigido para Cat 3)");
  if (!alarmeHHTransmitidoLocalOcupado) naoAtendidos.push("Alarme HH não chega a local continuamente ocupado (exigido para Cat 3)");
  if (!capacidadeEncerrarRemoto) naoAtendidos.push("Sem capacidade de encerrar remotamente (exigido para Cat 3)");

  // --- Avaliação Cat 2 ---
  if (temATG && nivelTransmitidoRemoto && alarmeHHTransmitidoLocalOcupado) {
    atendidos.push("ATG instalado");
    atendidos.push("Nível transmitido a centro de controle");
    atendidos.push("Alarme HH transmitido a local continuamente ocupado");

    if (presencaOperacional === "nao-assistida") {
      alertas.push({
        code: "C201",
        nivel: "CRITICO",
        mensagem:
          "Instalação não assistida com Categoria 2: a API 2350 exige presença operacional " +
          "no início e no final do recebimento, ou centro de controle continuamente ocupado " +
          "com capacidade de encerrar o fluxo. Reclassificar ou implementar Cat 3.",
      });
    }

    return buildResult(2, tipoOPS, atendidos, naoAtendidos, alertas, entrada);
  }

  // --- Avaliação Cat 1 ---
  // Cat 1 requer pelo menos um ATG com display local (sem transmissão remota completa).
  // Sem ATG → Cat 0 (instrumentação manual apenas).
  if (temATG) {
    atendidos.push("ATG instalado (display local)");

    if (presencaOperacional !== "plena") {
      alertas.push({
        code: "C101",
        nivel: "CRITICO",
        mensagem:
          "Categoria 1 exige instalação PLENAMENTE ASSISTIDA — operador competente " +
          "presente durante todo o recebimento. Instalação semi ou não assistida " +
          "não é compatível com Categoria 1 sem instrumentação adicional.",
      });
    }

    return buildResult(1, tipoOPS, atendidos, naoAtendidos, alertas, entrada);
  }

  // --- Cat 0 ---
  naoAtendidos.push("Sem ATG ou instrumento automático de nível");
  naoAtendidos.push("Sem transmissão de nível ou alarme remoto");

  if (presencaOperacional !== "plena") {
    alertas.push({
      code: "C001",
      nivel: "CRITICO",
      mensagem:
        "Categoria 0 exige instalação PLENAMENTE ASSISTIDA com monitoramento " +
        "contínuo nas primeiras horas, durante todo o recebimento e na hora final. " +
        "A única prevenção é planejar o recebimento dentro do volume disponível.",
    });
  }

  alertas.push({
    code: "C002",
    nivel: "ALERTA",
    mensagem:
      "Categoria 0: sem instrumentação automática de nível, o único mecanismo de " +
      "prevenção é o planejamento do volume e a presença operacional integral.",
  });

  return buildResult(0, tipoOPS, atendidos, naoAtendidos, alertas, entrada);
}

function buildResult(
  categoria: CategoriaOPS,
  tipoOPS: TipoOPS,
  atendidos: string[],
  naoAtendidos: string[],
  alertas: AlertaAPI2350[],
  entrada: EntradaCategoriaAPI2350,
): ResultadoCategoriaAPI2350 {
  const justificativas: Record<CategoriaOPS, string> = {
    0: "Sem instrumentação automática de nível e sem transmissão remota.",
    1: "Instrumento local de nível ou ATG sem transmissão remota de nível/alarme.",
    2: "ATG com nível e alarme HH transmitidos a centro de controle ou local ocupado.",
    3: "ATG mais sensor LAHH independente, transmissão a local continuamente ocupado e capacidade de encerrar remotamente.",
  };

  alertas.push({
    code: "A004",
    nivel: "AVISO_LEGAL",
    mensagem:
      `Categoria ${categoria} — PRELIMINAR. A classificação definitiva deve ser determinada ` +
      "pelo proprietário/operador com base em análise de risco formal conforme " +
      "API Standard 2350, 5th Edition, 2020.",
  });

  return {
    categoria,
    tipoOPS,
    justificativa: justificativas[categoria],
    requisitosAtendidos: atendidos,
    requisitosNaoAtendidos: naoAtendidos,
    alertas,
  };
}
