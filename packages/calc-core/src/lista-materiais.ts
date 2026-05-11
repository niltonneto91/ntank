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
  readonly componente: "Costado" | "Fundo" | "Teto";
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

  const itens: ItemListaMateriais[] = [];

  // ── Costado ─────────────────────────────────────────────────────────────────
  for (const { chapa, quantidade } of resultado.costado.listaChapas) {
    const areaUn = (largCostado / 1_000) * (comprCostado / 1_000);
    itens.push({
      componente:     "Costado",
      espessura_mm:   chapa.espessura,
      polegada:       chapa.polegada,
      largura_mm:     largCostado,
      comprimento_mm: comprCostado,
      quantidade,
      areaUnitaria_m2: Number(areaUn.toFixed(4)),
      areaTotal_m2:    Number((areaUn * quantidade).toFixed(3)),
      pesoPorM2_kg:    chapa.pesoPorM2,
      pesoTotal_kg:    Number((chapa.pesoPorM2 * areaUn * quantidade).toFixed(1)),
    });
  }

  // ── Fundo ────────────────────────────────────────────────────────────────────
  {
    const chapa  = resultado.fundo.chapaComercial;
    const areaUn = (largFundo / 1_000) * (comprFundo / 1_000);
    const qtde   = Math.ceil((resultado.fundo.area_m2 / areaUn) * 1.15);
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
    const qtde   = Math.ceil((areaAnel_m2 / areaUn) * 1.1);
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

  // ── Teto ─────────────────────────────────────────────────────────────────────
  {
    const chapa  = resultado.teto.chapaComercial;
    const areaUn = (largTeto / 1_000) * (comprTeto / 1_000);
    const qtde   = Math.ceil((resultado.teto.area_m2 / areaUn) * 1.15);
    itens.push({
      componente:     "Teto",
      espessura_mm:   chapa.espessura,
      polegada:       chapa.polegada,
      largura_mm:     largTeto,
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
