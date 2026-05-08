/**
 * Tabela de chapas comerciais e otimizador de aproveitamento.
 *
 * Os pesos por m² (kgf/m²) replicam a tabela da planilha NTN
 * (CALCULO DE TANQUES.xlsx, aba "Tabela espessuras") para garantir
 * compatibilidade numérica nos testes de regressão.
 */

import type { AvaliacaoChapa, ChapaComercial } from "./types.js";

export const CHAPAS_COMERCIAIS: ReadonlyArray<ChapaComercial> = [
  { polegada: "3/16", espessura: 4.75, pesoPorM2: 37.35 },
  { polegada: "1/4", espessura: 6.35, pesoPorM2: 49.8 },
  { polegada: "5/16", espessura: 8.0, pesoPorM2: 62.25 },
  { polegada: "3/8", espessura: 9.5, pesoPorM2: 74.7 },
  { polegada: "1/2", espessura: 12.5, pesoPorM2: 99.6 },
  { polegada: "5/8", espessura: 16.0, pesoPorM2: 124.5 },
  { polegada: "3/4", espessura: 19.0, pesoPorM2: 149.4 },
];

export const CHAPA_MAIS_FINA: ChapaComercial = CHAPAS_COMERCIAIS[0]!;
export const CHAPA_MAIS_GROSSA: ChapaComercial =
  CHAPAS_COMERCIAIS[CHAPAS_COMERCIAIS.length - 1]!;

/**
 * Largura (em mm) a partir da qual a indústria não comercializa chapas
 * com espessura inferior a 6,35 mm (1/4″) — regra prática NTN.
 *
 * Resumindo:
 *  - Largura ≤ 2.000 mm → toda a tabela disponível (3/16″ até 3/4″)
 *  - Largura ≥ 2.400 mm → mínimo 1/4″ (6,35 mm)
 */
export const LARGURA_LIMITE_ESP_GROSSA_MM = 2400;
export const ESPESSURA_MIN_LARGAS_MM = 6.35;

/**
 * Lista de chapas disponíveis para a largura solicitada (filtra pela regra
 * comercial: chapas largas não existem em espessuras finas).
 */
export function chapasDisponiveis(
  larguraChapa_mm: number = 0,
): ReadonlyArray<ChapaComercial> {
  if (larguraChapa_mm >= LARGURA_LIMITE_ESP_GROSSA_MM) {
    return CHAPAS_COMERCIAIS.filter((c) => c.espessura >= ESPESSURA_MIN_LARGAS_MM);
  }
  return CHAPAS_COMERCIAIS;
}

/**
 * Seleciona a chapa comercial mais fina capaz de atender à espessura calculada.
 * Replica a regra da planilha NTN: ENCAIXAR no primeiro patamar superior.
 *
 * Se `larguraChapa_mm` for informada e ≥ 2.400 mm, a busca pula chapas finas
 * que não existem comercialmente nessa largura — o piso passa a ser 6,35 mm
 * (1/4″).
 *
 * @throws Error se a espessura calculada exceder a chapa mais grossa cadastrada.
 */
export function selecionarChapaComercial(
  espessuraCalculada_mm: number,
  larguraChapa_mm: number = 0,
): ChapaComercial {
  if (espessuraCalculada_mm <= 0) {
    throw new Error(`Espessura inválida: ${espessuraCalculada_mm} mm (deve ser > 0)`);
  }
  const candidatas = chapasDisponiveis(larguraChapa_mm);
  for (const chapa of candidatas) {
    if (espessuraCalculada_mm <= chapa.espessura) return chapa;
  }
  throw new Error(
    `Espessura ${espessuraCalculada_mm.toFixed(2)} mm excede a chapa comercial mais grossa ` +
      `(${CHAPA_MAIS_GROSSA.polegada}" = ${CHAPA_MAIS_GROSSA.espessura} mm). VERIFICAR.`,
  );
}

/**
 * Avalia o aproveitamento de chapa comercial para um diâmetro D.
 *
 * Regra crítica de Nilton (NBR 7821 / prática NTN):
 *   - Aproveitamento ÓTIMO: π·D é múltiplo exato do comprimento da chapa.
 *   - Aproveitamento BOM: resto entre 2 m e 4 m (chapa adicional comercializável).
 *   - Aproveitamento RUIM: caso contrário (desperdício alto).
 *
 * Exemplo de Nilton: D = 7,64 m → π·D ≈ 24,0 m → 4 chapas de 6 m (ótimo).
 */
export function avaliarAproveitamentoChapa(
  D_m: number,
  comprimentoChapa_m: number,
): AvaliacaoChapa {
  if (D_m <= 0 || comprimentoChapa_m <= 0) {
    throw new Error("D e comprimento da chapa devem ser positivos.");
  }
  const circunferencia = Math.PI * D_m;
  const chapasInteiras = Math.floor(circunferencia / comprimentoChapa_m);
  const resto = circunferencia - chapasInteiras * comprimentoChapa_m;

  // Tolerância prática: 1% do comprimento da chapa (60 mm para chapa 6 m,
  // 120 mm para chapa 12 m). Diferenças menores são consideradas "exatas"
  // do ponto de vista construtivo — corte e ajuste em obra absorvem.
  const tolerancia_m = 0.01 * comprimentoChapa_m;

  let classificacao: AvaliacaoChapa["classificacao"];
  let chapasNecessarias: number;
  let chapaAdicional_m = 0;

  if (resto <= tolerancia_m) {
    // Resto desprezível → exato no número de chapas inteiras
    classificacao = "otimo";
    chapasNecessarias = chapasInteiras;
  } else if (comprimentoChapa_m - resto <= tolerancia_m) {
    // Resto quase = comprimento → usa +1 chapa cheia
    classificacao = "otimo";
    chapasNecessarias = chapasInteiras + 1;
  } else if (resto >= 2 && resto <= 4) {
    // Resto comercializável (2 a 4 m) → arredonda a 0,5 m superior
    classificacao = "bom";
    chapasNecessarias = chapasInteiras + 1;
    chapaAdicional_m = arredondarParaCima(resto, 0.5);
  } else {
    // Caso "ruim": resto entre 0 e 2 m, ou entre 4 m e comprimento
    classificacao = "ruim";
    chapasNecessarias = chapasInteiras + 1;
    chapaAdicional_m = arredondarParaCima(resto, 0.5);
  }

  const totalUtilizado = chapasNecessarias * comprimentoChapa_m;
  const desperdicio_pct =
    classificacao === "otimo"
      ? 0
      : ((totalUtilizado - circunferencia) / totalUtilizado) * 100;

  // Descrição construtiva legível
  const descricao = (() => {
    if (classificacao === "otimo") {
      return `${chapasNecessarias} × ${comprimentoChapa_m} m`;
    }
    // Tem 1 chapa adicional comercializável
    if (chapaAdicional_m > 0 && chapaAdicional_m < comprimentoChapa_m) {
      const adicional_str = Number.isInteger(chapaAdicional_m)
        ? `${chapaAdicional_m}`
        : chapaAdicional_m.toFixed(1).replace(".", ",");
      return chapasInteiras > 0
        ? `${chapasInteiras} × ${comprimentoChapa_m} m + 1 × ${adicional_str} m`
        : `1 × ${adicional_str} m`;
    }
    // Fallback (não deve cair aqui): valor decimal
    const equivalente = circunferencia / comprimentoChapa_m;
    return `${equivalente.toFixed(2).replace(".", ",")} × ${comprimentoChapa_m} m`;
  })();

  return {
    D_m,
    comprimentoChapa_m,
    circunferencia_m: circunferencia,
    chapasInteiras,
    resto_m: resto,
    chapasNecessarias,
    classificacao,
    desperdicio_pct,
    descricao,
    chapaAdicional_m,
  };
}

/** Arredondamento para cima ao múltiplo mais próximo de `step`. */
function arredondarParaCima(valor: number, step: number): number {
  return Math.ceil(valor / step) * step;
}

/**
 * Sugere combinações (D, H) para um volume desejado, ordenadas por:
 *   1. Aproveitamento de chapas (ótimo > bom > ruim)
 *   2. Razão H/D próxima de 1,0 (boa prática)
 *   3. Menor altura total
 */
export interface SugestaoGeometria {
  readonly D_m: number;
  readonly H_m: number;
  readonly volume_m3: number;
  readonly razaoHD: number;
  readonly avaliacao: AvaliacaoChapa;
}

export function sugerirGeometriasPorVolume(
  volumeDesejado_m3: number,
  comprimentoChapa_m: number,
  opts: {
    H_min_m?: number;
    H_max_m?: number;
    D_min_m?: number;
    D_max_m?: number;
    /** @deprecated — mantido por compatibilidade; ignorado nesta versão */
    passo_m?: number;
    razaoHDIdeal?: number;
    limite?: number;
  } = {},
): SugestaoGeometria[] {
  const H_min = opts.H_min_m ?? 3;
  const H_max = opts.H_max_m ?? 25;
  const D_min = opts.D_min_m ?? 2;
  const D_max = opts.D_max_m ?? 60;
  const limite = opts.limite ?? 12;

  /**
   * Gera diâmetros candidatos a partir da matemática de chapas:
   *   D = n · L / π        (n chapas inteiras por anel — aproveitamento ótimo)
   *   D = (n·L + r) / π   (n inteiras + resto r ∈ [2,4] m — aproveitamento bom)
   *
   * Estratégia:
   *   - Para cada n de 2 a 50: gera D_otimo = n·L/π
   *   - Para cada n de 1 a 50 e resto de 2 a 4 m (passo 0,5 m): gera D_bom
   *   - Para D ≤ 12 m, prioriza H > D (coluna mais alta que larga)
   */
  const candidates = new Map<number, SugestaoGeometria>();

  function tryD(D_m_raw: number) {
    const D_m = Number(D_m_raw.toFixed(3));
    if (D_m < D_min || D_m > D_max) return;
    if (candidates.has(D_m)) return; // já processado
    const area = (Math.PI * D_m * D_m) / 4;
    const H = volumeDesejado_m3 / area;
    if (H < H_min || H > H_max) return;
    const avaliacao = avaliarAproveitamentoChapa(D_m, comprimentoChapa_m);
    candidates.set(D_m, {
      D_m,
      H_m: Number(H.toFixed(3)),
      volume_m3: volumeDesejado_m3,
      razaoHD: H / D_m,
      avaliacao,
    });
  }

  // Chapas inteiras (aproveitamento ótimo)
  for (let n = 2; n <= 60; n++) {
    tryD((n * comprimentoChapa_m) / Math.PI);
  }

  // Resto entre 2 e 4 m em passos de 0,5 m (aproveitamento bom)
  for (let n = 1; n <= 50; n++) {
    for (let resto = 2.0; resto <= 4.0; resto += 0.5) {
      tryD((n * comprimentoChapa_m + resto) / Math.PI);
    }
  }

  // Fallback para volumes que não geram candidatos suficientes:
  // adicionamos uma varredura fina em D ≤ 12 m com passo 0,1 m
  if (candidates.size < 4) {
    for (let D = D_min; D <= Math.min(D_max, 30); D += 0.1) {
      tryD(D);
    }
  }

  const lista = Array.from(candidates.values());

  const score = (s: SugestaoGeometria): number => {
    const classScore =
      s.avaliacao.classificacao === "otimo"
        ? 0
        : s.avaliacao.classificacao === "bom"
          ? 1
          : 2;
    // Para D ≤ 12 m: bônus quando H > D (tanque mais esbelto = mais econômico)
    const bonusEsbelto = s.D_m <= 12 && s.H_m > s.D_m ? -50 : 0;
    const razaoPenalty = Math.abs(s.razaoHD - 1.0);
    return classScore * 1000 + bonusEsbelto + razaoPenalty * 10 + s.H_m * 0.01;
  };

  lista.sort((a, b) => score(a) - score(b));
  return lista.slice(0, limite);
}
