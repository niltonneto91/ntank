/**
 * Dimensionamento e verificação de bacia de contenção — NBR 17505-2:2024 §5.9.2.
 *
 * Algoritmo de dimensionamento (item 7):
 *   L e W são calculados pela geometria real dos tanques (soma de diâmetros + distâncias
 *   mínimas + bordas), não por relação L/W arbitrária. O item normativo §5.9.2 exige que
 *   os distanciamentos sejam respeitados; portanto as dimensões mínimas da bacia derivam
 *   diretamente das regras de distanciamento.
 *
 * NÃO reproduz texto integral da norma.
 */

import {
  calcularVolumeRequerido,
  calcularVolumeDisponivel,
  calcularDeslocamentos,
  calcularAlturaDiqueMinimo,
  FREEBOARD_MINIMO_M,
  ALTURA_MAX_DIQUE_M,
} from "./volume.js";
import { calcularDistanciamentos, distMinTanqueMuro, distMinEntreATanques } from "./distanciamentos.js";
import type {
  TanqueBacia,
  EntradaVerificarBacia,
  EntradaDimensionarBacia,
  ResultadoVerificarBacia,
  ResultadoDimensionarBacia,
  DetalhamentoDeslocamentos,
  PosicaoTanqueBacia,
  AlertaBacia,
} from "./types.js";

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Arredonda para cima na precisão de 0,1 m. */
function ceilDecim1(v: number): number {
  return Math.ceil(v * 10) / 10;
}

// ---------------------------------------------------------------------------
// Layout geométrico (compartilhado entre verificar e dimensionar)
// ---------------------------------------------------------------------------

interface FileirasLayout {
  row1: TanqueBacia[];
  row2: TanqueBacia[];
}

/**
 * Divide os tanques em 1 ou 2 fileiras respeitando o campo `fileira` de cada tanque.
 *
 * Regras:
 * - `fileira === 1` → sempre na fileira inferior (row2), independente do diâmetro.
 * - `fileira === 0` ou `undefined` → fileira superior (row1), ordenados por D desc.
 * - Retrocompatibilidade: se não há tanques forçados em row2 e total ≤ 3, retorna 1 fileira
 *   (comportamento original para projetos antigos sem o campo `fileira`).
 */
function montarFileiras(tanques: TanqueBacia[]): FileirasLayout {
  const row2 = [...tanques.filter((t) => t.fileira === 1)]
    .sort((a, b) => b.D_m - a.D_m);
  const row1Candidates = [...tanques.filter((t) => t.fileira !== 1)]
    .sort((a, b) => b.D_m - a.D_m);

  // Sem tanques forçados em row2 e ≤3 tanques no total → 1 fileira (retrocompat)
  if (row2.length === 0 && row1Candidates.length <= 3) {
    return { row1: row1Candidates, row2: [] };
  }

  return { row1: row1Candidates, row2 };
}

/**
 * Calcula o comprimento mínimo de uma fileira de tanques incluindo as bordas até os muros.
 *
 *   L_row = d_borda(T0) + D0 + d_entre(T0,T1) + D1 + … + d_borda(Tn)
 */
function comprimentoFileira(row: TanqueBacia[]): number {
  if (row.length === 0) return 0;
  let L = distMinTanqueMuro(row[0]!.D_m) + row[0]!.D_m;
  for (let i = 1; i < row.length; i++) {
    L += distMinEntreATanques(row[i - 1]!.D_m, row[i]!.D_m) + row[i]!.D_m;
  }
  L += distMinTanqueMuro(row[row.length - 1]!.D_m);
  return L;
}

/**
 * Calcula a largura mínima da bacia para 1 ou 2 fileiras.
 *
 * 1 fileira: W = d_borda(Dmax) + Dmax + d_borda(Dmax)
 * 2 fileiras: W = d_borda(Dmax_r1) + Dmax_r1 + d_entre(Dmax_r1, Dmax_r2) + Dmax_r2 + d_borda(Dmax_r2)
 */
function larguraBacia(row1: TanqueBacia[], row2: TanqueBacia[]): number {
  const Dmax1 = Math.max(...row1.map((t) => t.D_m));
  const db1 = distMinTanqueMuro(Dmax1);

  if (row2.length === 0) {
    return db1 + Dmax1 + db1;
  }

  const Dmax2 = Math.max(...row2.map((t) => t.D_m));
  const db2 = distMinTanqueMuro(Dmax2);
  const dEntre = distMinEntreATanques(Dmax1, Dmax2);
  return db1 + Dmax1 + dEntre + Dmax2 + db2;
}

/**
 * Calcula as posições geométricas dos tanques no plano da bacia.
 * Origem: canto superior-esquerdo interno da bacia.
 */
export function calcularPosicoesTanques(
  tanques: TanqueBacia[],
  L_m: number,
  W_m: number,
): PosicaoTanqueBacia[] {
  if (tanques.length === 0) return [];

  const { row1, row2 } = montarFileiras(tanques);

  /** Centro Y de uma fileira baseado no diâmetro máximo da fileira. */
  const yCentroFileira = (row: TanqueBacia[], fromTop: boolean): number => {
    const Dmax = Math.max(...row.map((t) => t.D_m));
    const db = distMinTanqueMuro(Dmax);
    if (fromTop) return db + Dmax / 2;
    return W_m - db - Dmax / 2;
  };

  /** Posiciona os tanques de uma fileira da esquerda para a direita. */
  const posicionarFileira = (
    row: TanqueBacia[],
    yCentro: number,
    fileira: 0 | 1,
  ): PosicaoTanqueBacia[] => {
    const posicoes: PosicaoTanqueBacia[] = [];
    let xCursor = distMinTanqueMuro(row[0]!.D_m) + row[0]!.D_m / 2;

    for (let i = 0; i < row.length; i++) {
      const t = row[i]!;
      posicoes.push({ id: t.id, cx_m: xCursor, cy_m: yCentro, r_m: t.D_m / 2, fileira });
      if (i + 1 < row.length) {
        const next = row[i + 1]!;
        xCursor += t.D_m / 2 + distMinEntreATanques(t.D_m, next.D_m) + next.D_m / 2;
      }
    }
    return posicoes;
  };

  const yCentro1 = yCentroFileira(row1, true);
  const posR1 = posicionarFileira(row1, yCentro1, 0);

  if (row2.length === 0) return posR1;

  const yCentro2 = yCentroFileira(row2, false);
  const posR2 = posicionarFileira(row2, yCentro2, 1);

  return [...posR1, ...posR2];
}

// ---------------------------------------------------------------------------
// Verificação de bacia existente
// ---------------------------------------------------------------------------

/**
 * Verifica se uma bacia de contenção existente atende aos requisitos da
 * NBR 17505-2 §5.9.2.
 */
export function verificarBacia(
  entrada: EntradaVerificarBacia,
): ResultadoVerificarBacia {
  const alertas: AlertaBacia[] = [];
  const fb = Math.max(entrada.freeboard_m ?? FREEBOARD_MINIMO_M, FREEBOARD_MINIMO_M);

  // -----------------------------------------------------------------------
  // Resolver área efetiva — aceita area_m2 direto OU comprimento × largura
  // Para bacias irregulares (modo "livre"), o usuário informa a área total
  // interna independente da planta (L, T, arredondada etc.).
  // -----------------------------------------------------------------------
  const areaInterna: number =
    entrada.area_m2 != null
      ? entrada.area_m2
      : (entrada.comprimento_m ?? 0) * (entrada.largura_m ?? 0);

  // Derivar L/W equivalentes para funções que recebem dois eixos.
  // Como calcularVolumeDisponivel usa apenas L×W (não os eixos separadamente),
  // qualquer decomposição com produto = areaInterna produz resultado correto.
  const L_ef = entrada.comprimento_m != null
    ? entrada.comprimento_m
    : Math.sqrt(areaInterna * 1.5);      // razão L/W ≈ 1.5 para layout SVG
  const W_ef = entrada.largura_m != null
    ? entrada.largura_m
    : (L_ef > 0 ? areaInterna / L_ef : 0);

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

  const V_outros = entrada.V_deslocamentos_outros_m3 ?? 0;
  const volumeRequerido = round2(calcularVolumeRequerido(entrada.tanques));
  const alturaEfetiva = round2(Math.max(entrada.alturaTotal_m - fb, 0));

  // Deslocamentos internos com o modelo físico correto
  const desl = calcularDeslocamentos(entrada.tanques, alturaEfetiva);

  const volumeDisponivel = round2(
    calcularVolumeDisponivel(
      L_ef,
      W_ef,
      entrada.tanques,
      entrada.alturaTotal_m,
      fb,
      V_outros,
    ),
  );

  const deslocamentos: DetalhamentoDeslocamentos = {
    V_desl_bases_m3: round2(desl.V_desl_bases_m3),
    V_desl_corpos_m3: round2(desl.V_desl_corpos_m3),
    V_desl_outros_m3: round2(V_outros),
    V_desl_total_m3: round2(desl.V_desl_total_m3 + V_outros),
  };

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
  const posicoesTanques = calcularPosicoesTanques(entrada.tanques, L_ef, W_ef);

  return {
    volumeRequerido_m3: volumeRequerido,
    volumeDisponivel_m3: volumeDisponivel,
    alturaEfetiva_m: alturaEfetiva,
    freeboard_m: fb,
    deslocamentos,
    aprovado,
    utilizacao_pct,
    alturaExcedeMuro,
    areaInterna_m2: round2(areaInterna),
    distanciamentos,
    posicoesTanques,
    alertas,
  };
}

// ---------------------------------------------------------------------------
// Dimensionamento de nova bacia
// ---------------------------------------------------------------------------

/**
 * Dimensiona uma nova bacia de contenção retangular para acomodar os tanques
 * fornecidos, respeitando os requisitos da NBR 17505-2 §5.9.2.
 *
 * Algoritmo:
 *   1. Monta fileiras de tanques ordenadas por D desc (1 fileira ≤3 tanques, 2 fileiras >3)
 *   2. Calcula L = maior comprimento de fileira (soma diâmetros + d_entre + bordas)
 *   3. Calcula W = d_borda + Dmax_f1 + d_entre_fileiras + Dmax_f2 + d_borda
 *   4. Com L e W, calcula h necessária para conter V_req
 *   5. Se h > alturaMaxMuro: expande L proporcionalmente e alerta
 */
export function dimensionarBacia(
  entrada: EntradaDimensionarBacia,
): ResultadoDimensionarBacia {
  const alertas: AlertaBacia[] = [];
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

  const desl0: DetalhamentoDeslocamentos = {
    V_desl_bases_m3: 0, V_desl_corpos_m3: 0, V_desl_outros_m3: 0, V_desl_total_m3: 0,
  };

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
      deslocamentos: desl0,
      distanciamentos: [],
      posicoesTanques: [],
      alertas,
    };
  }

  const volumeRequerido = round2(calcularVolumeRequerido(entrada.tanques));
  const V_desl = entrada.V_deslocamentos_outros_m3 ?? 0;

  // -----------------------------------------------------------------------
  // Modo área livre — área interna fornecida diretamente pelo usuário.
  // A área é uma restrição do terreno (não há expansão automática).
  // -----------------------------------------------------------------------
  if (entrada.area_m2 != null && entrada.area_m2 > 0) {
    const area = entrada.area_m2;
    // Derivar L/W equivalentes (produto = area) para as funções de cálculo
    const L_ef = Math.sqrt(area * 1.5);
    const W_ef = area / L_ef;

    const h_parede = round2(
      calcularAlturaDiqueMinimo(volumeRequerido, L_ef, W_ef, entrada.tanques, fb, V_desl),
    );
    const h_efetiva_req = round2(Math.max(h_parede - fb, 0));
    const alturaExcedeLimite = h_parede > alturaMaxMuro;

    if (alturaExcedeLimite) {
      alertas.push({
        code: "B008",
        nivel: "CRITICO",
        mensagem:
          `Altura necessária (${h_parede.toFixed(2)} m) excede o limite de ` +
          `${alturaMaxMuro.toFixed(1)} m (NBR 17505-2 §5.9.2.2). ` +
          "Aumente a área disponível ou reduza o volume dos tanques.",
      });
    }

    const deslFinal = calcularDeslocamentos(entrada.tanques, h_efetiva_req);
    const deslocamentos: DetalhamentoDeslocamentos = {
      V_desl_bases_m3: round2(deslFinal.V_desl_bases_m3),
      V_desl_corpos_m3: round2(deslFinal.V_desl_corpos_m3),
      V_desl_outros_m3: round2(V_desl),
      V_desl_total_m3: round2(deslFinal.V_desl_total_m3 + V_desl),
    };

    const distanciamentos = calcularDistanciamentos(entrada.tanques);

    return {
      volumeRequerido_m3: volumeRequerido,
      alturaEfetiva_m: h_efetiva_req,
      alturaParede_m: h_parede,
      freeboard_m: fb,
      areaLiquidaMinima_m2: round2(area),
      areaTotalSugerida_m2: round2(area),
      comprimentoSugerido_m: 0,
      larguraSugerida_m: 0,
      alturaExcedeLimite,
      areaInterna_m2: round2(area),
      deslocamentos,
      distanciamentos,
      posicoesTanques: [],
      alertas,
    };
  }

  // Altura efetiva máxima disponível
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
      deslocamentos: desl0,
      distanciamentos: calcularDistanciamentos(entrada.tanques),
      posicoesTanques: [],
      alertas,
    };
  }

  // -----------------------------------------------------------------------
  // Passo 1-3: Layout geométrico → L e W mínimos por espaçamentos normativos
  // -----------------------------------------------------------------------
  const { row1, row2 } = montarFileiras(entrada.tanques);

  const L_row1 = comprimentoFileira(row1);
  const L_row2 = comprimentoFileira(row2);
  const L_geo = Math.max(L_row1, L_row2);
  const W_geo = larguraBacia(row1, row2);

  let L = ceilDecim1(L_geo);
  let W = ceilDecim1(W_geo);

  // -----------------------------------------------------------------------
  // Passo 4: Calcular h necessária com L e W geométricos
  //
  // Fórmula: h_parede = calcularAlturaDiqueMinimo(V_req, L, W, tanques, fb, V_desl)
  //
  // A fórmula usa o modelo físico correto:
  //   h_efetiva × [L×W − Σ_{j≠maior} A_j] = V_req + V_desl + V_bases_flat − V_corpos_flat
  // -----------------------------------------------------------------------
  const areaLiquidaMinima = round2((volumeRequerido + V_desl) / alturaEfetiva); // aprox. para exibição

  let h_parede = round2(calcularAlturaDiqueMinimo(volumeRequerido, L, W, entrada.tanques, fb, V_desl));
  let h_efetiva_required = round2(h_parede - fb);
  let alturaExcedeLimite = h_parede > alturaMaxMuro;

  // -----------------------------------------------------------------------
  // Passo 5: Se h excede limite, expandir L pela fórmula direta correta
  //
  // Alvo: h_efetiva_max × [L×W − A_corpos] = V_req + V_desl + V_bases_flat − V_corpos_flat
  //   → L×W = (numerador / h_efetiva_max) + A_corpos
  //   → L = ceil((numerador / h_efetiva_max + A_corpos) / W)
  // -----------------------------------------------------------------------
  if (alturaExcedeLimite) {
    const L_original = L;
    const h_efetiva_max = alturaMaxMuro - fb;

    // Pré-computar termos para a equação de L
    const tanqueMaior = entrada.tanques.reduce((m, t) => t.volume_m3 > m.volume_m3 ? t : m);
    const naoMaiores = entrada.tanques.filter(t => t.id !== tanqueMaior.id);
    const A_corpos = naoMaiores.reduce((acc, t) => acc + (Math.PI / 4) * t.D_m * t.D_m, 0);
    const V_bases_flat = entrada.tanques.reduce((acc, t) => {
      const D = (t.diametroAnel_m && t.diametroAnel_m > t.D_m) ? t.diametroAnel_m : t.D_m;
      return acc + (Math.PI / 4) * D * D * (t.alturaAnel_m ?? 0);
    }, 0);
    const V_corpos_flat = naoMaiores.reduce((acc, t) =>
      acc + (Math.PI / 4) * t.D_m * t.D_m * (t.alturaAnel_m ?? 0), 0);

    const numerador = volumeRequerido + V_desl + V_bases_flat - V_corpos_flat;
    L = ceilDecim1((numerador / h_efetiva_max + A_corpos) / W);

    // Recalcular com L expandido
    h_parede = round2(calcularAlturaDiqueMinimo(volumeRequerido, L, W, entrada.tanques, fb, V_desl));
    h_efetiva_required = round2(h_parede - fb);
    alturaExcedeLimite = h_parede > alturaMaxMuro + 0.005; // tolerância de arredondamento

    alertas.push({
      code: "B007",
      nivel: "ALERTA",
      mensagem:
        `Comprimento expandido automaticamente de ${L_original.toFixed(1)} m para ` +
        `${L.toFixed(1)} m para respeitar a altura máxima de ${alturaMaxMuro.toFixed(1)} m ` +
        `(NBR 17505-2 §5.9.2.2). Altura da parede adotada: ${h_parede.toFixed(2)} m.`,
    });
  }

  // Deslocamentos na h_efetiva final (para exibição no painel)
  const deslFinal = calcularDeslocamentos(entrada.tanques, h_efetiva_required);
  const deslocamentos: DetalhamentoDeslocamentos = {
    V_desl_bases_m3: round2(deslFinal.V_desl_bases_m3),
    V_desl_corpos_m3: round2(deslFinal.V_desl_corpos_m3),
    V_desl_outros_m3: round2(V_desl),
    V_desl_total_m3: round2(deslFinal.V_desl_total_m3 + V_desl),
  };

  const areaTotalSugerida = round2(L * W);

  const distanciamentos = calcularDistanciamentos(entrada.tanques);
  const posicoesTanques = calcularPosicoesTanques(entrada.tanques, L, W);

  return {
    volumeRequerido_m3: volumeRequerido,
    alturaEfetiva_m: h_efetiva_required,
    alturaParede_m: h_parede,
    freeboard_m: fb,
    areaLiquidaMinima_m2: areaLiquidaMinima,
    areaTotalSugerida_m2: areaTotalSugerida,
    comprimentoSugerido_m: round1(L),
    larguraSugerida_m: round1(W),
    alturaExcedeLimite,
    areaInterna_m2: areaTotalSugerida,
    deslocamentos,
    distanciamentos,
    posicoesTanques,
    alertas,
  };
}
