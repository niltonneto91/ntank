/**
 * Adapter entre o ProjetoNTANK (modelo da UI) e o calc-core
 * (núcleo de cálculo TypeScript puro).
 */

import {
  calcularTanqueCompleto,
  compararCostado,
  getMaterial,
  type ComparativoCostado,
  type EntradaBocal,
  type EntradaCostado,
  type EntradaTanqueCompleto,
  type MetodoCostado,
  type ResultadoTanqueCompleto,
} from "@ntank/calc-core";
import type { BocalProjeto, ProjetoNTANK } from "./projeto";

export function montarEntradaCostado(projeto: ProjetoNTANK): EntradaCostado {
  const { geometria, parametros } = projeto;
  const material = (() => {
    try {
      return getMaterial(parametros.materialId);
    } catch {
      return undefined;
    }
  })();

  return {
    D_mm: geometria.D_m * 1000,
    H_mm: geometria.H_m * 1000,
    G: parametros.G,
    CA_mm: parametros.CA_mm,
    larguraChapa_mm: parametros.larguraChapa_mm,
    comprimentoChapa_mm: parametros.comprimentoChapa_mm,
    material,
    E: parametros.E,
  };
}

export function calcularCostado(projeto: ProjetoNTANK): ComparativoCostado {
  const entrada = montarEntradaCostado(projeto);
  return compararCostado(entrada, projeto.parametros.custoAcoPorKg_R$);
}

function bocalParaCalcCore(b: BocalProjeto): EntradaBocal {
  return {
    tag: b.tag,
    funcao: b.funcao,
    posicao: b.posicao,
    DN_pol: b.DN_pol,
    classe: b.classe,
    tipoFlange: b.tipoFlange,
    face: b.face,
    elevacao_m: b.elevacao_m,
  };
}

/**
 * Cálculo do TANQUE COMPLETO (costado + fundo + teto + bocais) usando o
 * método de costado escolhido. Se `metodo` for omitido → usa o de menor custo.
 */
export function calcularTanqueWeb(
  projeto: ProjetoNTANK,
  metodo: MetodoCostado = "auto",
): ResultadoTanqueCompleto {
  const entradaCostado = montarEntradaCostado(projeto);
  const CA_fundo_mm = projeto.parametros.aplicarCAFundo
    ? (projeto.parametros.CA_fundo_mm ?? projeto.parametros.CA_mm)
    : 0;
  const CA_teto_mm = projeto.parametros.aplicarCATeto
    ? (projeto.parametros.CA_teto_mm ?? projeto.parametros.CA_mm)
    : 0;
  const entrada: EntradaTanqueCompleto = {
    costado: entradaCostado,
    fundo: {
      tipo: projeto.fundo.tipo,
      larguraAnelAnular_mm: projeto.fundo.larguraAnelAnular_mm,
      CA_mm: CA_fundo_mm,
    },
    teto: {
      tipo: projeto.teto.tipo,
      anguloCone_graus: projeto.teto.anguloCone_graus,
      R_dome_m: projeto.teto.R_dome_m,
      pesoEstruturaPorM2_kg: projeto.teto.pesoEstruturaPorM2_kg,
      CA_mm: CA_teto_mm,
    },
    bocais: projeto.bocais.map(bocalParaCalcCore),
    acessorios:
      projeto.acessorios.escada.tipo === "nenhuma" &&
      projeto.acessorios.plataformas.length === 0
        ? undefined
        : {
            escada: {
              tipo: projeto.acessorios.escada.tipo,
              largura_mm: projeto.acessorios.escada.largura_mm,
              anguloHelicoidal_graus:
                projeto.acessorios.escada.anguloHelicoidal_graus,
              passoPe_mm: projeto.acessorios.escada.passoPe_mm,
              comGaiola: projeto.acessorios.escada.comGaiola,
            },
            plataformas: projeto.acessorios.plataformas.map((p) => ({
              id: p.nome,
              cota_m: p.cota_m,
              largura_m: p.largura_m,
              comprimento_m: p.comprimento_m,
              comGuardaCorpo: p.comGuardaCorpo,
            })),
            guardaCorpoEscada: projeto.acessorios.guardaCorpoEscada,
          },
    metodoCostado: metodo,
    custoAcoPorKg_R$: projeto.parametros.custoAcoPorKg_R$,
  };
  return calcularTanqueCompleto(entrada);
}

/**
 * Roda os 3 métodos de costado em paralelo, mas DESTA VEZ comparando
 * o tanque completo (costado + fundo + teto). O critério de menor
 * custo se aplica ao total.
 */
export function compararTanqueCompleto(
  projeto: ProjetoNTANK,
): {
  variantes: ReadonlyArray<{
    metodo: "NBR 7821 Simplificada" | "API 650 1-Foot" | "API 650 VDP";
    resultado: ResultadoTanqueCompleto;
  }>;
  recomendada: {
    metodo: "NBR 7821 Simplificada" | "API 650 1-Foot" | "API 650 VDP";
    resultado: ResultadoTanqueCompleto;
  };
} {
  const metodos: ReadonlyArray<
    "NBR 7821 Simplificada" | "API 650 1-Foot" | "API 650 VDP"
  > = ["NBR 7821 Simplificada", "API 650 1-Foot", "API 650 VDP"];

  const variantes = metodos.map((m) => ({
    metodo: m,
    resultado: calcularTanqueWeb(projeto, m),
  }));

  const recomendada = variantes.reduce((melhor, atual) =>
    atual.resultado.custo_R$ < melhor.resultado.custo_R$ ? atual : melhor,
  );

  return { variantes, recomendada };
}
