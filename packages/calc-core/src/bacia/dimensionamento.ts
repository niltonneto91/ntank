/**
 * Dimensionamento e verificação de bacia de contenção — NBR 17505-2:2024 §5.9.2.
 *
 * NÃO reproduz texto integral da norma.
 */

import {
  calcularVolumeRequerido,
  calcularVolumeDisponivel,
  calcularAreaBasesTanques,
  calcularAlturaDiqueMinimo,
  FREEBOARD_MINIMO_M,
  ALTURA_MAX_DIQUE_M,
} from "./volume.js";
import { calcularDistanciamentos, distMinTanqueMuro } from "./distanciamentos.js";
import type {
  EntradaVerificarBacia,
  EntradaDimensionarBacia,
  ResultadoVerificarBacia,
  ResultadoDimensionarBacia,
  AlertaBacia,
} from "./types.js";

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Verifica se uma bacia de contenção existente atende aos requisitos da
 * NBR 17505-2 §5.9.2.
 */
export function verificarBacia(
  entrada: EntradaVerificarBacia,
): ResultadoVerificarBacia {
  const alertas: AlertaBacia[] = [];
  const fb = Math.max(entrada.freeboard_m ?? FREEBOARD_MINIMO_M, FREEBOARD_MINIMO_M);

  // Verificação: altura do dique não pode exceder 3,0 m
  const alturaExcedeMuro = entrada.alturaTotal_m > ALTURA_MAX_DIQUE_M;
  if (alturaExcedeMuro) {
    alertas.push({
      code: "B001",
      nivel: "CRITICO",
      mensagem:
        `Altura do dique (${entrada.alturaTotal_m.toFixed(2)} m) excede o máximo ` +
        `de ${ALTURA_MAX_DIQUE_M.toFixed(1)} m (NBR 17505-2 §5.9.2.2).`,
    });
  }

  if (fb < FREEBOARD_MINIMO_M - 0.001) {
    alertas.push({
      code: "B002",
      nivel: "ALERTA",
      mensagem:
        `Sobrealtura informada (${fb.toFixed(2)} m) é menor que o mínimo ` +
        `de ${FREEBOARD_MINIMO_M.toFixed(2)} m (NBR 17505-2 §5.9.2.2.1).`,
    });
  }

  const volumeRequerido = round2(calcularVolumeRequerido(entrada.tanques));
  const areaBasesTanques = round2(calcularAreaBasesTanques(entrada.tanques));
  const alturaEfetiva = round2(Math.max(entrada.alturaTotal_m - fb, 0));
  const volumeDisponivel = round2(
    calcularVolumeDisponivel(
      entrada.comprimento_m,
      entrada.largura_m,
      entrada.tanques,
      entrada.alturaTotal_m,
      fb,
      entrada.V_deslocamentos_outros_m3 ?? 0,
    ),
  );

  const aprovado = volumeDisponivel >= volumeRequerido && !alturaExcedeMuro;
  const utilizacao_pct =
    volumeRequerido > 0
      ? round2((volumeDisponivel / volumeRequerido) * 100)
      : 100;

  if (!aprovado && !alturaExcedeMuro) {
    alertas.push({
      code: "B003",
      nivel: "CRITICO",
      mensagem:
        `Volume disponível (${volumeDisponivel.toFixed(1)} m³) é INSUFICIENTE. ` +
        `Necessário: ${volumeRequerido.toFixed(1)} m³ (NBR 17505-2 §5.9.2.2.1). ` +
        `Déficit: ${(volumeRequerido - volumeDisponivel).toFixed(1)} m³.`,
    });
  } else if (aprovado && utilizacao_pct > 100) {
    // Não deveria acontecer, mas por segurança
    alertas.push({
      code: "B004",
      nivel: "INFO",
      mensagem: "Bacia atende ao volume requerido.",
    });
  }

  if (aprovado && utilizacao_pct > 90) {
    alertas.push({
      code: "B005",
      nivel: "ALERTA",
      mensagem:
        `Utilização da bacia (${utilizacao_pct.toFixed(1)}%) está acima de 90%. ` +
        "Considerar ampliação para segurança operacional.",
    });
  }

  if (entrada.tanques.length === 0) {
    alertas.push({
      code: "B010",
      nivel: "INFO",
      mensagem: "Nenhum tanque informado. Insira os tanques para calcular.",
    });
  }

  const distanciamentos = calcularDistanciamentos(entrada.tanques);

  return {
    volumeRequerido_m3: volumeRequerido,
    volumeDisponivel_m3: volumeDisponivel,
    alturaEfetiva_m: alturaEfetiva,
    freeboard_m: fb,
    areaBasesTanques_m2: areaBasesTanques,
    aprovado,
    utilizacao_pct,
    alturaExcedeMuro,
    distanciamentos,
    alertas,
  };
}

/**
 * Dimensiona uma nova bacia de contenção retangular para acomodar os tanques
 * fornecidos, respeitando os requisitos da NBR 17505-2 §5.9.2.
 */
export function dimensionarBacia(
  entrada: EntradaDimensionarBacia,
): ResultadoDimensionarBacia {
  const alertas: AlertaBacia[] = [];
  const relacao = entrada.relacaoLC ?? 1.5;
  const fb = Math.max(entrada.freeboard_m ?? FREEBOARD_MINIMO_M, FREEBOARD_MINIMO_M);
  const alturaMaxMuro = Math.min(entrada.alturaMaxMuro_m, ALTURA_MAX_DIQUE_M);

  if (entrada.alturaMaxMuro_m > ALTURA_MAX_DIQUE_M) {
    alertas.push({
      code: "B001",
      nivel: "ALERTA",
      mensagem:
        `Altura máxima do dique limitada a ${ALTURA_MAX_DIQUE_M.toFixed(1)} m ` +
        `(NBR 17505-2 §5.9.2.2). Valor informado (${entrada.alturaMaxMuro_m.toFixed(2)} m) foi ajustado.`,
    });
  }

  if (entrada.tanques.length === 0) {
    alertas.push({
      code: "B010",
      nivel: "INFO",
      mensagem: "Nenhum tanque informado. Insira os tanques para dimensionar.",
    });
    return {
      volumeRequerido_m3: 0,
      alturaEfetiva_m: 0,
      alturaParede_m: fb,
      freeboard_m: fb,
      areaLiquidaMinima_m2: 0,
      areaTotalSugerida_m2: 0,
      comprimentoSugerido_m: 0,
      larguraSugerida_m: 0,
      alturaExcedeLimite: false,
      distanciamentos: [],
      alertas,
    };
  }

  const volumeRequerido = round2(calcularVolumeRequerido(entrada.tanques));
  const areaBasesTanques = calcularAreaBasesTanques(entrada.tanques);

  // Altura efetiva máxima disponível para contenção
  const alturaEfetiva = round2(alturaMaxMuro - fb);

  if (alturaEfetiva <= 0) {
    alertas.push({
      code: "B006",
      nivel: "CRITICO",
      mensagem:
        `Freeboard (${fb.toFixed(2)} m) ≥ altura máxima do muro (${alturaMaxMuro.toFixed(2)} m). ` +
        "Não é possível dimensionar a bacia com esses parâmetros.",
    });
    return {
      volumeRequerido_m3: volumeRequerido,
      alturaEfetiva_m: 0,
      alturaParede_m: fb,
      freeboard_m: fb,
      areaLiquidaMinima_m2: 0,
      areaTotalSugerida_m2: 0,
      comprimentoSugerido_m: 0,
      larguraSugerida_m: 0,
      alturaExcedeLimite: true,
      distanciamentos: calcularDistanciamentos(entrada.tanques),
      alertas,
    };
  }

  // Área líquida mínima necessária para contenção
  const areaLiquidaMinima = round2(
    (volumeRequerido + (entrada.V_deslocamentos_outros_m3 ?? 0)) / alturaEfetiva,
  );

  // Área total interna mínima: líquida + bases dos tanques
  // Acrescenta bordas de distância mínima tanque→muro em todas as direções
  const diametrMaximo = Math.max(...entrada.tanques.map((t) => t.D_m), 0);
  const dBorda = distMinTanqueMuro(diametrMaximo);

  // Área total mínima = área líquida + área bases + margens para distâncias
  // Estimativa inicial: A_total = (A_liq_min + A_bases) + folgas de borda
  // Usamos relação L/W para derivar dimensões
  const areaTotalEstimada = areaLiquidaMinima + areaBasesTanques;

  // L × W = areaTotalEstimada, L/W = relacao
  // L = sqrt(areaTotalEstimada × relacao), W = areaTotalEstimada / L
  let L = Math.sqrt(areaTotalEstimada * relacao);
  let W = areaTotalEstimada / L;

  // Adicionar bordas mínimas em cada lado (2 × dBorda por eixo)
  L += 2 * dBorda;
  W += 2 * dBorda;

  // Arredondar para cima em 0,1 m
  L = Math.ceil(L * 10) / 10;
  W = Math.ceil(W * 10) / 10;

  const areaTotalSugerida = round2(L * W);

  // Verificar se a altura do dique excede o limite
  const h_parede_final = round2(
    calcularAlturaDiqueMinimo(
      volumeRequerido,
      L,
      W,
      entrada.tanques,
      fb,
    ),
  );
  const alturaExcedeLimite = h_parede_final > ALTURA_MAX_DIQUE_M;

  if (alturaExcedeLimite) {
    alertas.push({
      code: "B007",
      nivel: "CRITICO",
      mensagem:
        `A altura calculada da parede do dique (${h_parede_final.toFixed(2)} m) excede ` +
        `o máximo de ${ALTURA_MAX_DIQUE_M.toFixed(1)} m. Ampliar a área da bacia ou ` +
        "reduzir o volume dos tanques.",
    });
  }

  if (volumeRequerido === 0) {
    alertas.push({
      code: "B010",
      nivel: "INFO",
      mensagem: "Nenhum tanque informado ou todos com volume zero.",
    });
  }

  const distanciamentos = calcularDistanciamentos(entrada.tanques);

  return {
    volumeRequerido_m3: volumeRequerido,
    alturaEfetiva_m: alturaEfetiva,
    alturaParede_m: round2(alturaEfetiva + fb),
    freeboard_m: fb,
    areaLiquidaMinima_m2: areaLiquidaMinima,
    areaTotalSugerida_m2: areaTotalSugerida,
    comprimentoSugerido_m: round1(L),
    larguraSugerida_m: round1(W),
    alturaExcedeLimite,
    distanciamentos,
    alertas,
  };
}
