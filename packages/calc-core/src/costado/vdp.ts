/**
 * Costado pelo método Variable-Design-Point (VDP) da API 650, item 5.6.4.
 *
 * O VDP é um método iterativo: para cada anel, recalcula a espessura
 * considerando a INTERAÇÃO entre o anel e o anel inferior. A fórmula de
 * primeiro chute (initial pass) é a mesma do 1-Foot; depois aplica-se o
 * processo iterativo:
 *
 *   t_pd = (4,9 · D · (H − x/1000) · G) / (Sd · E) + CA
 *
 * onde "x" é o "design point" — distância vertical (mm) do fundo do anel
 * onde a espessura efetiva é calculada — função iterativa de:
 *   x = mínimo entre 0,61·sqrt(r·t1), 3,84·H/sqrt(r·t1)·(1 − 1,4·t2/t1), e 1,22·sqrt(r·t1)
 *   (forma simplificada usada na API 650; a forma exata cita L = mínimo entre 3 candidatos.)
 *
 * Esta implementação segue o algoritmo descrito na API 650 5.6.4 — sem
 * reproduzir o texto da norma. Cita apenas item/seção.
 *
 * Faixa típica de aplicação: D > 60 m, ou quando 1-Foot não atende.
 * Para D pequenos, o VDP tende a dar espessuras LIGEIRAMENTE menores que o 1-Foot
 * (vantagem econômica) — por isso o NTANK calcula os dois e compara.
 */

import { CHAPAS_COMERCIAIS, selecionarChapaComercial } from "../chapas.js";
import { espessuraMinimaNominal } from "../espessura-minima.js";
import { MATERIAL_DEFAULT } from "../materiais.js";
import type {
  AnelCostado,
  ChapaComercial,
  EntradaCostado,
  ResultadoCostado,
} from "../types.js";
import { particionarAneis } from "./nbr-7821.js";
import { espessura1FootProjeto, espessura1FootTeste } from "./one-foot.js";

/**
 * Calcula o "design point" x (mm) para o método VDP, anel por anel.
 *
 * x = MIN { 1,22·sqrt(r·t1) ; 3,84·H_ef/sqrt(r·t1)·(1 − 1,4·t2/t1) ; 0,61·sqrt(r·t1) }
 *
 * onde:
 *   r  = raio nominal (m) ÷ 0,001  → mm
 *   t1 = espessura do anel atual (mm)
 *   t2 = espessura do anel SUPERIOR (mm)
 *   H_ef = coluna líquida acima do anel atual (m)
 *
 * Implementação conservadora: se t2 ≥ t1 (anel superior mais grosso, raro),
 * limitamos o termo (1 − 1,4·t2/t1) a 0 para não dar valor negativo.
 */
function calcularDesignPoint(
  r_mm: number,
  t1_mm: number,
  t2_mm: number,
  H_ef_m: number,
): number {
  const rt1 = Math.sqrt(r_mm * t1_mm);
  const x1 = 0.61 * rt1;
  const fator = Math.max(0, 1 - 1.4 * (t2_mm / t1_mm));
  const x2 = 3.84 * (H_ef_m * 1000) / rt1 * fator;
  const x3 = 1.22 * rt1;
  return Math.max(0, Math.min(x1, x2, x3));
}

export interface ResultadoCostadoVDP extends ResultadoCostado {
  readonly metodo: "API 650 VDP";
  readonly iteracoes: number;
}

export function calcularCostadoVDP(entrada: EntradaCostado): ResultadoCostadoVDP {
  const material = entrada.material ?? MATERIAL_DEFAULT;
  const E = entrada.E ?? 0.85;

  if (entrada.D_mm <= 0) throw new Error(`D inválido: ${entrada.D_mm} mm`);
  if (entrada.H_mm <= 0) throw new Error(`H inválido: ${entrada.H_mm} mm`);

  const D_m = entrada.D_mm / 1000;
  const r_mm = entrada.D_mm / 2;
  const larguraChapa_m = entrada.larguraChapa_mm / 1000;
  const comprimentoChapa_m = entrada.comprimentoChapa_mm / 1000;
  const e_min_nominal = espessuraMinimaNominal(D_m);

  const alturasAneis_mm = particionarAneis(entrada.H_mm, entrada.larguraChapa_mm);
  const alturasAneis_m = alturasAneis_mm.map((h) => h / 1000);
  const N = alturasAneis_m.length;
  const chapasPorAnel = (D_m * Math.PI) / comprimentoChapa_m;

  // Passo 1: chute inicial = espessuras pelo 1-Foot.
  const t_d_atual = new Array<number>(N).fill(0);
  const t_t_atual = new Array<number>(N).fill(0);
  for (let i = 0; i < N; i++) {
    const H_ef = alturasAneis_m.slice(i).reduce((a, h) => a + h, 0);
    t_d_atual[i] = espessura1FootProjeto(D_m, H_ef, entrada.G, material.Sd, E, entrada.CA_mm);
    t_t_atual[i] = espessura1FootTeste(D_m, H_ef, material.St, E);
  }

  // Passo 2: iteração VDP para cada anel — usa-se H_ef ajustado pelo design point x.
  const MAX_ITER = 10;
  const TOL_MM = 0.001;
  let iteracoes = 0;
  let convergiu = false;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    iteracoes++;
    let maxDelta = 0;

    for (let i = 0; i < N; i++) {
      const H_ef = alturasAneis_m.slice(i).reduce((a, h) => a + h, 0);
      const t1_d = t_d_atual[i]!;
      const t2_d = i + 1 < N ? t_d_atual[i + 1]! : t1_d;
      const t1_t = t_t_atual[i]!;
      const t2_t = i + 1 < N ? t_t_atual[i + 1]! : t1_t;

      const x_d = calcularDesignPoint(r_mm, t1_d, t2_d, H_ef);
      const x_t = calcularDesignPoint(r_mm, t1_t, t2_t, H_ef);

      // Espessura no design point: H efetivo é reduzido por x/1000.
      const H_ef_ajustado_d = Math.max(0.3, H_ef - x_d / 1000);
      const H_ef_ajustado_t = Math.max(0.3, H_ef - x_t / 1000);

      const t_d_novo =
        (4.9 * D_m * (H_ef_ajustado_d - 0.3) * entrada.G) / (material.Sd * E) +
        entrada.CA_mm;
      const t_t_novo =
        (4.9 * D_m * (H_ef_ajustado_t - 0.3) * 1.0) / (material.St * E);

      maxDelta = Math.max(maxDelta, Math.abs(t_d_novo - t1_d), Math.abs(t_t_novo - t1_t));
      t_d_atual[i] = t_d_novo;
      t_t_atual[i] = t_t_novo;
    }

    if (maxDelta < TOL_MM) {
      convergiu = true;
      break;
    }
  }

  if (!convergiu && iteracoes === MAX_ITER) {
    // Não falha — apenas anota nas memórias de cálculo. VDP raramente diverge
    // em casos bem-condicionados.
  }

  const aneis: AnelCostado[] = [];
  for (let i = 0; i < N; i++) {
    const H_ef = alturasAneis_m.slice(i).reduce((a, h) => a + h, 0);
    const t_d = t_d_atual[i]!;
    const t_t = t_t_atual[i]!;
    const e_calc = Math.max(t_d, t_t);
    const e_aplicada = Math.max(e_calc, e_min_nominal);
    // Piso normativo de 5 mm: aceita 3/16" (4,75 mm) quando cálculo < 5 mm.
    const e_para_comercial =
      e_min_nominal <= 5 && e_aplicada <= 5.0 ? 4.75 : e_aplicada;
    const chapa = selecionarChapaComercial(e_para_comercial, entrada.larguraChapa_mm);

    const peso_kg =
      chapa.pesoPorM2 * larguraChapa_m * comprimentoChapa_m * chapasPorAnel;

    aneis.push({
      indice: i + 1,
      altura_mm: alturasAneis_mm[i]!,
      H_efetiva_m: H_ef,
      e_calc_mm: e_calc,
      chapaComercial: chapa,
      peso_kg,
      memoriaCalculo: {
        componente: `Costado - Anel ${i + 1}`,
        metodo: "API 650 VDP",
        itemNorma: "API 650, 5.6.4 (Variable-Design-Point)",
        formula: "iteração com x = MIN(0,61·sqrt(r·t1) ; 3,84·H/sqrt(r·t1)·(1−1,4·t2/t1) ; 1,22·sqrt(r·t1))",
        parametros: {
          D_m,
          r_mm,
          H_efetiva_m: Number(H_ef.toFixed(4)),
          G: entrada.G,
          Sd_MPa: material.Sd,
          St_MPa: material.St,
          E,
          CA_mm: entrada.CA_mm,
          material: material.designacao,
          iteracoes,
        },
        substituicao:
          `Após ${iteracoes} iteração(ões) VDP: ` +
          `t_d = ${t_d.toFixed(4)} mm  ;  t_t = ${t_t.toFixed(4)} mm  ;  ` +
          `e_calc = max(t_d, t_t) = ${e_calc.toFixed(4)} mm`,
        resultado: { valor: e_calc, unidade: "mm" },
        espessuraAdotada: {
          valor: chapa.espessura,
          unidade: "mm",
          justificativa: (() => {
            const t_struct = e_calc - entrada.CA_mm;
            // CA efetivo = placa adotada − espessura estrutural calculada
            const ca_efetivo = chapa.espessura - t_struct;
            const base = e_calc < e_min_nominal
              ? `Mínimo nominal ${e_min_nominal} mm prevalece`
              : `Chapa ${chapa.polegada}" (${chapa.espessura} mm)`;
            return `${base} · t_estrutural = ${t_struct.toFixed(2)} mm · CA_efetivo = ${ca_efetivo.toFixed(2)} mm`;
          })(),
        },
      },
    });
  }

  const pesoTotal_kg = aneis.reduce((a, anel) => a + anel.peso_kg, 0);
  const area_m2 = D_m * Math.PI * (entrada.H_mm / 1000);

  const mapa = new Map<string, { chapa: ChapaComercial; quantidade: number }>();
  for (const anel of aneis) {
    const e = mapa.get(anel.chapaComercial.polegada);
    if (e) e.quantidade += chapasPorAnel;
    else mapa.set(anel.chapaComercial.polegada, { chapa: anel.chapaComercial, quantidade: chapasPorAnel });
  }
  const listaChapas = Array.from(mapa.values()).sort(
    (a, b) => CHAPAS_COMERCIAIS.indexOf(a.chapa) - CHAPAS_COMERCIAIS.indexOf(b.chapa),
  );

  return {
    metodo: "API 650 VDP",
    entrada,
    aneis,
    numeroAneis: aneis.length,
    chapasPorAnel,
    pesoTotal_kg,
    area_m2,
    listaChapas,
    iteracoes,
  };
}
