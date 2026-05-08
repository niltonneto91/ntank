/**
 * Agregador do tanque completo: costado + fundo + teto.
 *
 * Recebe a entrada do costado (que governa D, H, material, chapa…) +
 * decisões de fundo e teto, e devolve o resultado consolidado com
 * massa total e custo. A variante de costado pode ser escolhida pelo
 * chamador (NBR / 1-Foot / VDP) — por padrão usa a recomendada do
 * comparativo (menor custo).
 */

import { calcularAcessorios } from "./acessorios.js";
import { calcularBocal, type EntradaBocal, type ResultadoBocal } from "./bocais.js";
import { calcularCostadoNBR7821 } from "./costado/nbr-7821.js";
import { calcularCostadoOneFoot } from "./costado/one-foot.js";
import { calcularCostadoVDP } from "./costado/vdp.js";
import { compararCostado, type ComparativoCostado } from "./costado/index.js";
import { calcularFundo } from "./fundo.js";
import { calcularTeto } from "./teto/index.js";
import type {
  EntradaAcessorios,
  EntradaCostado,
  EntradaFundo,
  EntradaTeto,
  ResultadoCostado,
  ResultadoTanqueCompleto,
} from "./types.js";

export type MetodoCostado =
  | "auto"
  | "NBR 7821 Simplificada"
  | "API 650 1-Foot"
  | "API 650 VDP";

export interface EntradaTanqueCompleto {
  readonly costado: EntradaCostado;
  /** Fundo: usar a entrada completa OU passar { tipo } e o agregador completa D_mm/CA_mm. */
  readonly fundo: Pick<EntradaFundo, "tipo"> &
    Partial<Omit<EntradaFundo, "tipo">>;
  readonly teto: Pick<EntradaTeto, "tipo"> &
    Partial<Omit<EntradaTeto, "tipo">>;
  /** Lista de bocais a calcular. Vazia se não há bocais a dimensionar. */
  readonly bocais?: ReadonlyArray<EntradaBocal>;
  /** Acessórios (escada + plataformas + guarda-corpos) — opcional. */
  readonly acessorios?: Omit<EntradaAcessorios, "D_mm" | "H_mm">;
  /** Método de cálculo do costado a adotar; "auto" → menor custo. */
  readonly metodoCostado?: MetodoCostado;
  /** R$/kg do aço para o cálculo de custo (default 6,50). */
  readonly custoAcoPorKg_R$?: number;
}

export function calcularTanqueCompleto(
  entrada: EntradaTanqueCompleto,
): ResultadoTanqueCompleto {
  const custoUnitario = entrada.custoAcoPorKg_R$ ?? 6.5;

  // 1. Costado conforme método escolhido.
  const costado = escolherCostado(
    entrada.costado,
    entrada.metodoCostado ?? "auto",
    custoUnitario,
  );

  // 2. Fundo — propaga D_mm e CA_mm (override permitido em entrada.fundo) +
  //    a espessura da camada base do costado (decide se anel anular é necessário).
  const fundoEntrada: EntradaFundo = {
    D_mm: entrada.costado.D_mm,
    CA_mm: entrada.fundo.CA_mm ?? entrada.costado.CA_mm,
    G: entrada.costado.G,
    e_costado_base_mm:
      entrada.fundo.e_costado_base_mm ??
      costado.aneis[0]?.chapaComercial.espessura,
    larguraAnelAnular_mm: entrada.fundo.larguraAnelAnular_mm,
    tipo: entrada.fundo.tipo,
  };
  const fundo = calcularFundo(fundoEntrada);

  // 3. Teto — CA do teto pode ser overridado (default = CA do costado).
  const tetoEntrada: EntradaTeto = {
    D_mm: entrada.costado.D_mm,
    CA_mm: entrada.teto.CA_mm ?? entrada.costado.CA_mm,
    tipo: entrada.teto.tipo,
    anguloCone_graus: entrada.teto.anguloCone_graus,
    R_dome_m: entrada.teto.R_dome_m,
    pesoEstruturaPorM2_kg: entrada.teto.pesoEstruturaPorM2_kg,
  };
  const teto = calcularTeto(tetoEntrada);

  // 4. Bocais — espessura local default vem do anel do costado mais grosso
  //    (lado conservador) para os de costado, e da espessura do teto para
  //    os de teto. Sem bocais → array vazio.
  const t_costado_max =
    costado.aneis.reduce(
      (m, a) => Math.max(m, a.chapaComercial.espessura),
      0,
    ) || teto.e_adotada_mm;
  const bocais: ResultadoBocal[] = (entrada.bocais ?? []).map((b) => {
    const t_local =
      b.t_local_mm ??
      (b.posicao === "costado"
        ? espessuraNoLocalCostado(costado, b.elevacao_m ?? 0)
        : teto.e_adotada_mm);
    return calcularBocal(
      { ...b, t_local_mm: t_local },
      { t_local_default_mm: t_costado_max },
    );
  });
  const pesoBocais_kg = bocais.reduce((acc, x) => acc + x.pesoTotal_kg, 0);

  // 5. Acessórios (escada + plataformas + guarda-corpos), opcional.
  const acessorios = entrada.acessorios
    ? calcularAcessorios({
        D_mm: entrada.costado.D_mm,
        H_mm: entrada.costado.H_mm,
        escada: entrada.acessorios.escada,
        plataformas: entrada.acessorios.plataformas,
        guardaCorpoEscada: entrada.acessorios.guardaCorpoEscada,
      })
    : undefined;
  const pesoAcessorios_kg = acessorios?.pesoTotal_kg ?? 0;

  const pesoTotal_kg =
    costado.pesoTotal_kg +
    fundo.pesoTotal_kg +
    teto.pesoTotal_kg +
    pesoBocais_kg +
    pesoAcessorios_kg;
  const custo_R$ = pesoTotal_kg * custoUnitario;

  return {
    costado,
    fundo,
    teto,
    bocais,
    pesoBocais_kg,
    acessorios,
    pesoAcessorios_kg,
    pesoTotal_kg,
    custo_R$,
  };
}

/**
 * Retorna a espessura adotada do anel do costado em uma dada elevação.
 * Os anéis estão ordenados base→topo. Se a elevação for além do topo,
 * usa a espessura do último anel.
 */
function espessuraNoLocalCostado(
  costado: ResultadoCostado,
  elevacao_m: number,
): number {
  let alturaAcumulada_m = 0;
  for (const anel of costado.aneis) {
    alturaAcumulada_m += anel.altura_mm / 1000;
    if (elevacao_m <= alturaAcumulada_m) {
      return anel.chapaComercial.espessura;
    }
  }
  return costado.aneis[costado.aneis.length - 1]!.chapaComercial.espessura;
}

function escolherCostado(
  entrada: EntradaCostado,
  metodo: MetodoCostado,
  custoAcoPorKg_R$: number,
): ResultadoCostado {
  if (metodo === "NBR 7821 Simplificada") return calcularCostadoNBR7821(entrada);
  if (metodo === "API 650 1-Foot") return calcularCostadoOneFoot(entrada);
  if (metodo === "API 650 VDP") return calcularCostadoVDP(entrada);
  // auto: menor custo
  const comp: ComparativoCostado = compararCostado(entrada, custoAcoPorKg_R$);
  return comp.recomendada.resultado;
}
