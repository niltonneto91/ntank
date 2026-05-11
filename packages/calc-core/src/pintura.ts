/**
 * Cálculo do plano de pintura do tanque.
 *
 * Área pintável:
 *   - Costado externo: π × D_ext × H
 *   - Teto externo: area_m2 do teto (já calculada)
 *   - Acessórios: estimativa por peso (0,05 m²/kg)
 *   - Fundo: NÃO pintado (apoiado na fundação)
 *
 * Planos disponíveis:
 *   2 demãos: Primer + Acabamento
 *   3 demãos: Primer + Intermediário + Acabamento
 *
 * Padrões NTN:
 *   Primer Epóxi   120 µm  6 m²/L
 *   Intermediário   50 µm  8 m²/L
 *   Acabamento      70 µm  8 m²/L
 *
 * Cálculo do volume de tinta por demão:
 *   V = Área / Rendimento   [L]
 */

import type { ResultadoTanqueCompleto } from "./types.js";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ConfigDemao {
  readonly espessura_um: number;    // espessura seca (µm)
  readonly rendimento_m2_L: number; // rendimento (m²/L)
  readonly custo_R$_L: number;      // custo por litro
}

export interface ConfigPintura {
  readonly plano: "2-demaos" | "3-demaos";
  readonly primer: ConfigDemao;
  readonly intermediario: ConfigDemao;
  readonly acabamento: ConfigDemao;
}

export interface ResultadoDemao {
  readonly nome: string;
  readonly espessura_um: number;
  readonly rendimento_m2_L: number;
  readonly custo_R$_L: number;
  readonly volume_L: number;
  readonly custo_R$: number;
}

export interface ResultadoPintura {
  readonly areaCostado_m2: number;
  readonly areaTeto_m2: number;
  readonly areaAcessorios_m2: number;
  readonly areaTotalPintavel_m2: number;
  readonly demaos: ReadonlyArray<ResultadoDemao>;
  readonly totalVolume_L: number;
  readonly totalCusto_R$: number;
}

export interface EntradaPintura {
  readonly resultado: ResultadoTanqueCompleto;
  readonly config: ConfigPintura;
}

// ─── Padrão NTN ──────────────────────────────────────────────────────────────

export const CONFIG_PINTURA_DEFAULT: ConfigPintura = {
  plano: "2-demaos",
  primer:        { espessura_um: 120, rendimento_m2_L: 6, custo_R$_L: 0 },
  intermediario: { espessura_um:  50, rendimento_m2_L: 8, custo_R$_L: 0 },
  acabamento:    { espessura_um:  70, rendimento_m2_L: 8, custo_R$_L: 0 },
};

// ─── Cálculo ──────────────────────────────────────────────────────────────────

export function calcularPintura(
  entrada: EntradaPintura,
): ResultadoPintura {
  const { resultado, config } = entrada;

  // Área do costado externo = π × D_ext × H
  // D_ext ≈ D_nominal + 2 × e_1º_anel (já calculado no fundo, mas aqui usamos a área do costado)
  // Usamos resultado.costado.area_m2 que já representa a superfície lateral
  const areaCostado_m2 = resultado.costado.area_m2;

  // Área do teto (superfície externa)
  const areaTeto_m2 = resultado.teto.area_m2;

  // Acessórios: estimativa por massa (0,05 m²/kg — superfície de perfis estruturais leves)
  const areaAcessorios_m2 = resultado.pesoAcessorios_kg * 0.05;

  const areaTotalPintavel_m2 =
    areaCostado_m2 + areaTeto_m2 + areaAcessorios_m2;

  // Demãos conforme plano
  const nomeDemaos: Array<[string, ConfigDemao]> =
    config.plano === "3-demaos"
      ? [
          ["Primer Epóxi", config.primer],
          ["Intermediário", config.intermediario],
          ["Acabamento", config.acabamento],
        ]
      : [
          ["Primer Epóxi", config.primer],
          ["Acabamento", config.acabamento],
        ];

  const demaos: ResultadoDemao[] = nomeDemaos.map(([nome, d]) => {
    const volume_L = areaTotalPintavel_m2 / d.rendimento_m2_L;
    const custo_R$ = volume_L * d.custo_R$_L;
    return {
      nome,
      espessura_um: d.espessura_um,
      rendimento_m2_L: d.rendimento_m2_L,
      custo_R$_L: d.custo_R$_L,
      volume_L:  Number(volume_L.toFixed(1)),
      custo_R$:  Number(custo_R$.toFixed(2)),
    };
  });

  const totalVolume_L = demaos.reduce((s, d) => s + d.volume_L, 0);
  const totalCusto_R$ = demaos.reduce((s, d) => s + d.custo_R$, 0);

  return {
    areaCostado_m2:        Number(areaCostado_m2.toFixed(2)),
    areaTeto_m2:           Number(areaTeto_m2.toFixed(2)),
    areaAcessorios_m2:     Number(areaAcessorios_m2.toFixed(2)),
    areaTotalPintavel_m2:  Number(areaTotalPintavel_m2.toFixed(2)),
    demaos,
    totalVolume_L:  Number(totalVolume_L.toFixed(1)),
    totalCusto_R$:  Number(totalCusto_R$.toFixed(2)),
  };
}
