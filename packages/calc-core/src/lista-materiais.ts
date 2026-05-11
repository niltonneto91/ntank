/**
 * Geração da lista de materiais (chapas) do tanque.
 *
 * Costado: usa resultado.costado.listaChapas (agrupado por espessura),
 *          com dimensões largura × comprimento vindas da entrada do costado.
 *
 * Fundo e Teto: quantidade estimada por:
 *   n = ceil(area / (largura × comprimento) × 1,15)
 *   onde 1,15 = fator de aproveitamento (15% de perda no corte circular).
 */

import type { ResultadoTanqueCompleto } from "./types.js";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ItemListaMateriais {
  /** Componente de origem. */
  readonly componente: "Costado" | "Fundo" | "Fundo Duplo" | "Teto";
  readonly espessura_mm: number;
  readonly polegada: string;
  readonly largura_mm: number;
  readonly comprimento_mm: number;
  readonly quantidade: number;
  readonly areaUnitaria_m2: number;
  readonly areaTotal_m2: number;
  readonly pesoPorM2_kg: number;
  readonly pesoTotal_kg: number;
}

export interface ListaMateriais {
  readonly itens: ReadonlyArray<ItemListaMateriais>;
  readonly totalChapas: number;
  readonly totalArea_m2: number;
  readonly totalPeso_kg: number;
}

export interface EntradaListaMateriais {
  readonly resultado: ResultadoTanqueCompleto;
  /** Largura da chapa de fundo (mm). Default = largura do costado. */
  readonly larguraChapaFundo_mm?: number;
  /** Comprimento da chapa de fundo (mm). Default = comprimento do costado. */
  readonly comprimentoChapaFundo_mm?: number;
  /** Largura da chapa de teto (mm). Default = largura do costado. */
  readonly larguraChapaTeto_mm?: number;
  /** Comprimento da chapa de teto (mm). Default = comprimento do costado. */
  readonly comprimentoChapaTeto_mm?: number;
  /** Fundo duplo ativo? */
  readonly fundoDuploAtivo?: boolean;
  /** Largura da chapa do fundo duplo (mm). Default = larguraChapaFundo_mm. */
  readonly larguraChapaFundoDuplo_mm?: number;
  /** Comprimento da chapa do fundo duplo (mm). Default = comprimentoChapaFundo_mm. */
  readonly comprimentoChapaFundoDuplo_mm?: number;
  /** CA do fundo duplo (mm). Default = CA do fundo (resultado.fundo.entrada.CA_mm). */
  readonly CA_fundoDuplo_mm?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Arredonda quantidade de chapas para cima apenas quando a parte decimal
 * for >= 0,1 (equivale a mais de 10% de sobra que justifica pedir uma chapa
 * adicional). Abaixo de 0,1 trunca — as sobras cabem numa boa.
 */
function arredondarChapas(qtd: number): number {
  const fracional = qtd - Math.floor(qtd);
  return fracional >= 0.1 ? Math.ceil(qtd) : Math.floor(qtd);
}

// ─── Cálculo ──────────────────────────────────────────────────────────────────

export function calcularListaMateriais(
  entrada: EntradaListaMateriais,
): ListaMateriais {
  const { resultado } = entrada;
  const largCostado = resultado.costado.entrada.larguraChapa_mm;
  const comprCostado = resultado.costado.entrada.comprimentoChapa_mm;

  const largFundo  = entrada.larguraChapaFundo_mm    ?? largCostado;
  const comprFundo = entrada.comprimentoChapaFundo_mm ?? comprCostado;
  const largTeto   = entrada.larguraChapaTeto_mm     ?? largCostado;
  const comprTeto  = entrada.comprimentoChapaTeto_mm  ?? comprCostado;
  const largFD     = entrada.larguraChapaFundoDuplo_mm    ?? largFundo;
  const comprFD    = entrada.comprimentoChapaFundoDuplo_mm ?? comprFundo;

  const itens: ItemListaMateriais[] = [];

  // ── Costado ─────────────────────────────────────────────────────────────────
  for (const { chapa, quantidade } of resultado.costado.listaChapas) {
    const areaUn = (largCostado / 1_000) * (comprCostado / 1_000);
    // chapasPorAnel é float (π×D/L); decimal >= 0,1 → arredonda para cima
    const qtdeCostado = arredondarChapas(quantidade);
    itens.push({
      componente:     "Costado",
      espessura_mm:   chapa.espessura,
      polegada:       chapa.polegada,
      largura_mm:     largCostado,
      comprimento_mm: comprCostado,
      quantidade:     qtdeCostado,
      areaUnitaria_m2: Number(areaUn.toFixed(4)),
      areaTotal_m2:    Number((areaUn * qtdeCostado).toFixed(3)),
      pesoPorM2_kg:    chapa.pesoPorM2,
      pesoTotal_kg:    Number((chapa.pesoPorM2 * areaUn * qtdeCostado).toFixed(1)),
    });
  }

  // ── Fundo ────────────────────────────────────────────────────────────────────
  {
    const chapa  = resultado.fundo.chapaComercial;
    const areaUn = (largFundo / 1_000) * (comprFundo / 1_000);
    const qtde   = arredondarChapas((resultado.fundo.area_m2 / areaUn) * 1.15);
    itens.push({
      componente:     "Fundo",
      espessura_mm:   chapa.espessura,
      polegada:       chapa.polegada,
      largura_mm:     largFundo,
      comprimento_mm: comprFundo,
      quantidade:     qtde,
      areaUnitaria_m2: Number(areaUn.toFixed(4)),
      areaTotal_m2:    Number((areaUn * qtde).toFixed(3)),
      pesoPorM2_kg:    chapa.pesoPorM2,
      pesoTotal_kg:    Number((chapa.pesoPorM2 * areaUn * qtde).toFixed(1)),
    });
  }

  // Anel anular (espessura diferente do corpo se existir)
  if (
    resultado.fundo.anelAnular &&
    resultado.fundo.anelAnular.espessura_mm !== resultado.fundo.e_adotada_mm
  ) {
    const aa = resultado.fundo.anelAnular;
    // Área do anel anular já calculada internamente; usamos a largura do anel para estimar
    const D_ext_m = Math.sqrt((4 * resultado.fundo.area_m2) / Math.PI);
    const areaAnel_m2 = Math.PI * (D_ext_m / 2) * (aa.largura_mm / 1_000) * 2; // approx annular band
    const areaUn = (largFundo / 1_000) * (comprFundo / 1_000);
    const qtde   = arredondarChapas((areaAnel_m2 / areaUn) * 1.1);
    const pesoM2 = aa.espessura_mm * 7.85; // kg/m² ≈ e_mm × 7,85
    itens.push({
      componente:     "Fundo",
      espessura_mm:   aa.espessura_mm,
      polegada:       `${aa.espessura_mm.toFixed(2)} mm (anel anular)`,
      largura_mm:     largFundo,
      comprimento_mm: comprFundo,
      quantidade:     qtde,
      areaUnitaria_m2: Number(areaUn.toFixed(4)),
      areaTotal_m2:    Number((areaUn * qtde).toFixed(3)),
      pesoPorM2_kg:    Number(pesoM2.toFixed(1)),
      pesoTotal_kg:    Number((pesoM2 * areaUn * qtde).toFixed(1)),
    });
  }

  // ── Fundo duplo (se ativo) ───────────────────────────────────────────────────
  if (entrada.fundoDuploAtivo) {
    // Mesma espessura e área do fundo principal; CA pode diferir.
    const chapaFD = resultado.fundo.chapaComercial;
    const areaUn  = (largFD / 1_000) * (comprFD / 1_000);
    const qtde    = arredondarChapas((resultado.fundo.area_m2 / areaUn) * 1.15);
    itens.push({
      componente:      "Fundo Duplo",
      espessura_mm:    chapaFD.espessura,
      polegada:        chapaFD.polegada,
      largura_mm:      largFD,
      comprimento_mm:  comprFD,
      quantidade:      qtde,
      areaUnitaria_m2: Number(areaUn.toFixed(4)),
      areaTotal_m2:    Number((areaUn * qtde).toFixed(3)),
      pesoPorM2_kg:    chapaFD.pesoPorM2,
      pesoTotal_kg:    Number((chapaFD.pesoPorM2 * areaUn * qtde).toFixed(1)),
    });
  }

  // ── Teto ─────────────────────────────────────────────────────────────────────
  {
    const chapa = resultado.teto.chapaComercial;
    // Chapas 3/16" (4,75 mm) só são fabricadas até 1.800 mm de largura.
    // Se o usuário selecionou largura maior, corrigimos automaticamente aqui.
    const LARGURA_MAX_3_16_MM = 1_800;
    const largTetoEfetiva =
      chapa.espessura === 4.75 && largTeto > LARGURA_MAX_3_16_MM
        ? LARGURA_MAX_3_16_MM
        : largTeto;
    const areaUn = (largTetoEfetiva / 1_000) * (comprTeto / 1_000);
    const qtde   = arredondarChapas((resultado.teto.area_m2 / areaUn) * 1.15);
    itens.push({
      componente:     "Teto",
      espessura_mm:   chapa.espessura,
      polegada:       chapa.polegada,
      largura_mm:     largTetoEfetiva,   // corrigido para 1.800 mm quando 3/16"
      comprimento_mm: comprTeto,
      quantidade:     qtde,
      areaUnitaria_m2: Number(areaUn.toFixed(4)),
      areaTotal_m2:    Number((areaUn * qtde).toFixed(3)),
      pesoPorM2_kg:    chapa.pesoPorM2,
      pesoTotal_kg:    Number((chapa.pesoPorM2 * areaUn * qtde).toFixed(1)),
    });
  }

  const totalChapas  = itens.reduce((s, i) => s + i.quantidade, 0);
  const totalArea_m2 = itens.reduce((s, i) => s + i.areaTotal_m2, 0);
  const totalPeso_kg = itens.reduce((s, i) => s + i.pesoTotal_kg, 0);

  return {
    itens,
    totalChapas,
    totalArea_m2: Number(totalArea_m2.toFixed(2)),
    totalPeso_kg: Number(totalPeso_kg.toFixed(1)),
  };
}
