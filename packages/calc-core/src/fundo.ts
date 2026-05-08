/**
 * Cálculo do fundo do tanque.
 *
 * Implementa a versão simplificada de prática NTN, aderente à API 650
 * (item 5.4) e à NBR 7821 (item 5.5), sem reproduzir tabelas das normas:
 *
 *   - Espessura nominal mínima do CORPO do fundo: 6 mm + CA (regra prática
 *     usual; API 650 5.4.1 exige espessura mínima nominal independente
 *     do dimensionamento estrutural — o fundo trabalha basicamente como
 *     placa apoiada).
 *
 *   - Anel anular (annular ring): obrigatório quando D ≥ 12 m OU quando
 *     a primeira camada do costado tiver espessura ≥ 13 mm (regra prática).
 *     Largura mínima: 700 mm (default; ajustável). Espessura ≥ máximo
 *     entre o fundo simples e (e_costado_base − 1 mm), com piso 6,35 mm.
 *
 * Os números são CONSERVADORES e parametrizáveis. Refinar com Nilton
 * contra a planilha NTN antes de uso definitivo.
 */

import { selecionarChapaComercial } from "./chapas.js";
import { DENSIDADE_ACO_CARBONO } from "./materiais.js";
import type { AnelAnular, EntradaFundo, ResultadoFundo } from "./types.js";

/** Espessura mínima nominal do corpo do fundo em mm (regra usual NTN). */
const E_FUNDO_MIN_NOMINAL_MM = 6;

/** Diâmetro a partir do qual o anel anular passa a ser obrigatório (m). */
const D_LIMITE_ANEL_ANULAR_M = 12;

/** Espessura do costado base (mm) acima da qual o anel anular é obrigatório. */
const E_COSTADO_LIMITE_ANEL_ANULAR_MM = 13;

/** Largura padrão do anel anular (mm). */
const LARGURA_ANEL_ANULAR_DEFAULT_MM = 700;

/** Piso da espessura do anel anular (mm). */
const E_ANEL_ANULAR_MIN_MM = 6.35;

export function calcularFundo(entrada: EntradaFundo): ResultadoFundo {
  validarEntradaFundo(entrada);

  const D_m = entrada.D_mm / 1000;
  const CA = entrada.CA_mm;

  // -------------------------------------------------------------------
  // Diâmetro real do fundo
  // D_fundo = D_nominal + 2 × e_1º_anel + 100 mm (overhang perimetral)
  // Ref.: API 650, 5.4 — chapa de fundo prolonga-se 50 mm além do costado.
  // -------------------------------------------------------------------
  const e_costado_base =
    entrada.e_costado_base_mm ?? estimarECostadoBase(D_m, CA, entrada.G ?? 1);
  const D_fundo_m = D_m + 2 * (e_costado_base / 1000) + 0.100;

  // -------------------------------------------------------------------
  // Corpo do fundo
  // -------------------------------------------------------------------
  const e_calc = E_FUNDO_MIN_NOMINAL_MM + CA;
  const chapaCorpo = selecionarChapaComercial(e_calc);
  const area_m2 = (Math.PI * D_fundo_m * D_fundo_m) / 4;
  const peso_corpo_kg =
    area_m2 * (chapaCorpo.espessura / 1000) * DENSIDADE_ACO_CARBONO;

  const memoriaCorpo = {
    componente: "Fundo - Corpo",
    metodo: "API 650 5.4.1 / NBR 7821 5.5.1 (espessura mínima nominal)",
    itemNorma: "API 650, 5.4.1",
    formula: "e_fundo = e_min_nominal + CA",
    parametros: {
      D_m,
      D_fundo_m: Number(D_fundo_m.toFixed(4)),
      e_costado_base_mm: Number(e_costado_base.toFixed(2)),
      e_min_nominal_mm: E_FUNDO_MIN_NOMINAL_MM,
      CA_mm: CA,
      tipo: entrada.tipo,
    },
    substituicao:
      `D_fundo = ${D_m.toFixed(3)} + 2×${(e_costado_base / 1000).toFixed(4)} + 0,100 = ${D_fundo_m.toFixed(4)} m; ` +
      `e_fundo = ${E_FUNDO_MIN_NOMINAL_MM} + ${CA} = ${e_calc.toFixed(2)} mm`,
    resultado: { valor: e_calc, unidade: "mm" },
    espessuraAdotada: {
      valor: chapaCorpo.espessura,
      unidade: "mm",
      justificativa: `Chapa comercial superior ou igual à calculada (${chapaCorpo.polegada}")`,
    },
  };

  // -------------------------------------------------------------------
  // Anel anular
  // -------------------------------------------------------------------
  const exigeAnelAnular =
    entrada.tipo === "plano-com-anel-anular" &&
    (D_m >= D_LIMITE_ANEL_ANULAR_M ||
      e_costado_base >= E_COSTADO_LIMITE_ANEL_ANULAR_MM);

  let anelAnular: AnelAnular | undefined;
  if (exigeAnelAnular) {
    const largura = entrada.larguraAnelAnular_mm ?? LARGURA_ANEL_ANULAR_DEFAULT_MM;
    const e_anel_calc = Math.max(
      E_ANEL_ANULAR_MIN_MM,
      e_costado_base - 1, // regra prática: 1 mm abaixo do costado base
      e_calc, // não pode ser mais fino que o corpo do fundo
    );
    const chapaAnel = selecionarChapaComercial(e_anel_calc);

    const r_externo = D_fundo_m / 2;
    const r_interno = r_externo - largura / 1000;
    const area_anel_m2 = Math.PI * (r_externo * r_externo - r_interno * r_interno);
    const peso_anel_kg =
      area_anel_m2 * (chapaAnel.espessura / 1000) * DENSIDADE_ACO_CARBONO;

    anelAnular = {
      largura_mm: largura,
      espessura_mm: chapaAnel.espessura,
      peso_kg: peso_anel_kg,
      memoriaCalculo: {
        componente: "Fundo - Anel anular",
        metodo: "API 650 5.5 (regra prática NTN)",
        itemNorma: "API 650, 5.5",
        formula:
          "e_anel = max(e_min_anel, e_costado_base − 1 mm, e_corpo_fundo)",
        parametros: {
          D_m,
          e_costado_base_mm: e_costado_base,
          e_corpo_fundo_mm: chapaCorpo.espessura,
          largura_mm: largura,
          motivo:
            D_m >= D_LIMITE_ANEL_ANULAR_M
              ? `D ≥ ${D_LIMITE_ANEL_ANULAR_M} m`
              : `e_costado_base ≥ ${E_COSTADO_LIMITE_ANEL_ANULAR_MM} mm`,
        },
        substituicao:
          `e_anel = max(${E_ANEL_ANULAR_MIN_MM}, ${(e_costado_base - 1).toFixed(2)}, ` +
          `${chapaCorpo.espessura}) = ${e_anel_calc.toFixed(2)} mm`,
        resultado: { valor: e_anel_calc, unidade: "mm" },
        espessuraAdotada: {
          valor: chapaAnel.espessura,
          unidade: "mm",
          justificativa: `Chapa comercial (${chapaAnel.polegada}"). Largura: ${largura} mm.`,
        },
      },
    };
  }

  const pesoTotal_kg = peso_corpo_kg + (anelAnular?.peso_kg ?? 0);

  return {
    tipo: entrada.tipo,
    entrada,
    e_calc_mm: e_calc,
    e_adotada_mm: chapaCorpo.espessura,
    chapaComercial: chapaCorpo,
    area_m2,
    peso_corpo_kg,
    anelAnular,
    pesoTotal_kg,
    memoriaCalculo: memoriaCorpo,
  };
}

/**
 * Estimativa grosseira de espessura da camada base do costado quando
 * o usuário não fornece (para decidir se anel anular é necessário).
 * Usa NBR 7821 simplificada com H = 12 m (altura típica) — só para o
 * efeito condicional, não vai parar nos resultados.
 */
function estimarECostadoBase(D_m: number, CA_mm: number, G: number): number {
  const H_aproximada_m = 12;
  return 0.04 * D_m * (H_aproximada_m - 0.3) * G + CA_mm;
}

function validarEntradaFundo(e: EntradaFundo): void {
  if (e.D_mm <= 0) throw new Error(`D inválido: ${e.D_mm} mm`);
  if (e.CA_mm < 0) throw new Error(`CA inválido: ${e.CA_mm} mm`);
  if (
    !["plano-com-anel-anular", "conico-centro", "conico-periferia"].includes(
      e.tipo,
    )
  ) {
    throw new Error(`Tipo de fundo desconhecido: ${e.tipo}`);
  }
}
