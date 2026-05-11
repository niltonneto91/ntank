/**
 * Costado pelo método 1-Foot da API 650 (item 5.6.3).
 *
 * A fórmula é a forma geral da NBR 7821 simplificada, mas com Sd e E
 * explícitos como parâmetros do material e da junta soldada:
 *
 *   t_d = (4,9 · D · (H_ef − 0,3) · G) / (Sd · E)        + CA
 *   t_t = (4,9 · D · (H_ef − 0,3))     / (St · E)        — sem CA (teste hidrostático)
 *
 * Espessura adotada por anel = max(t_d, t_t, t_min_nominal).
 *
 * Restrição de aplicabilidade pela API 650 5.6.3.1:
 *   - D ≤ 60 m
 *   - t ≤ 12,5 mm (1/2")
 * Quando essa faixa é violada, calculamos mesmo assim e marcamos no flag
 * `foraDaFaixaUsoAPI650`. A decisão de adotar VDP fica para o dispatcher.
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

/**
 * Espessura de projeto pela 1-Foot (mm).
 */
export function espessura1FootProjeto(
  D_m: number,
  H_efetiva_m: number,
  G: number,
  Sd_MPa: number,
  E: number,
  CA_mm: number,
): number {
  return (4.9 * D_m * (H_efetiva_m - 0.3) * G) / (Sd_MPa * E) + CA_mm;
}

/**
 * Espessura de teste hidrostático pela 1-Foot (mm). Sem CA — densidade = 1,0.
 */
export function espessura1FootTeste(
  D_m: number,
  H_efetiva_m: number,
  St_MPa: number,
  E: number,
): number {
  return (4.9 * D_m * (H_efetiva_m - 0.3) * 1.0) / (St_MPa * E);
}

export interface ResultadoCostadoOneFoot extends ResultadoCostado {
  readonly metodo: "API 650 1-Foot";
  readonly foraDaFaixaUsoAPI650: boolean;
  readonly motivoForaFaixa?: string;
}

export function calcularCostadoOneFoot(
  entrada: EntradaCostado,
): ResultadoCostadoOneFoot {
  const material = entrada.material ?? MATERIAL_DEFAULT;
  const E = entrada.E ?? 0.85;

  if (entrada.D_mm <= 0) throw new Error(`D inválido: ${entrada.D_mm} mm`);
  if (entrada.H_mm <= 0) throw new Error(`H inválido: ${entrada.H_mm} mm`);
  if (entrada.G <= 0) throw new Error(`G inválido: ${entrada.G}`);
  if (entrada.CA_mm < 0) throw new Error(`CA inválido: ${entrada.CA_mm} mm`);
  if (E <= 0 || E > 1) throw new Error(`E fora da faixa (0..1]: ${E}`);

  const D_m = entrada.D_mm / 1000;
  const larguraChapa_m = entrada.larguraChapa_mm / 1000;
  const comprimentoChapa_m = entrada.comprimentoChapa_mm / 1000;
  const e_min_nominal = espessuraMinimaNominal(D_m);

  const alturasAneis_mm = particionarAneis(entrada.H_mm, entrada.larguraChapa_mm);
  const alturasAneis_m = alturasAneis_mm.map((h) => h / 1000);

  const chapasPorAnel = (D_m * Math.PI) / comprimentoChapa_m;

  const aneis: AnelCostado[] = [];
  let espessuraMaxAdotada = 0;

  for (let i = 0; i < alturasAneis_m.length; i++) {
    const H_ef = alturasAneis_m.slice(i).reduce((a, h) => a + h, 0);
    const t_d = espessura1FootProjeto(D_m, H_ef, entrada.G, material.Sd, E, entrada.CA_mm);
    const t_t = espessura1FootTeste(D_m, H_ef, material.St, E);
    const e_calc = Math.max(t_d, t_t);
    const e_aplicada = Math.max(e_calc, e_min_nominal);
    // Quando o piso normativo de 5 mm governa (cálculo < 5 mm), a prática do
    // setor aceita chapa 3/16" (4,75 mm) — não existe chapa comercial de 5 mm.
    // Se o próprio cálculo estrutural exigir ≥ 5 mm, segue-se para 1/4" (6,35 mm).
    const e_para_comercial =
      e_min_nominal <= 5 && e_aplicada <= 5.0 ? 4.75 : e_aplicada;
    const chapa = selecionarChapaComercial(e_para_comercial, entrada.larguraChapa_mm);
    espessuraMaxAdotada = Math.max(espessuraMaxAdotada, chapa.espessura);

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
        metodo: "API 650 1-Foot",
        itemNorma: "API 650, 5.6.3.2",
        formula: "t_d = 4,9·D·(H_ef−0,3)·G/(Sd·E) + CA  ;  t_t = 4,9·D·(H_ef−0,3)/(St·E)",
        parametros: {
          D_m,
          H_efetiva_m: Number(H_ef.toFixed(4)),
          G: entrada.G,
          Sd_MPa: material.Sd,
          St_MPa: material.St,
          E,
          CA_mm: entrada.CA_mm,
          material: material.designacao,
        },
        substituicao:
          `t_d = 4,9·${D_m.toFixed(3)}·(${H_ef.toFixed(2)}−0,3)·${entrada.G}` +
          `/(${material.Sd}·${E}) + ${entrada.CA_mm} = ${t_d.toFixed(4)} mm  ;  ` +
          `t_t = 4,9·${D_m.toFixed(3)}·(${H_ef.toFixed(2)}−0,3)/(${material.St}·${E}) = ${t_t.toFixed(4)} mm` +
          (e_aplicada !== e_calc ? `  →  aplica mín. nominal ${e_min_nominal} mm` : ""),
        resultado: { valor: e_calc, unidade: "mm" },
        espessuraAdotada: {
          valor: chapa.espessura,
          unidade: "mm",
          justificativa: (() => {
            const t_struct = e_calc - entrada.CA_mm; // espessura estrutural líquida (sem CA)
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

  // Faixa de uso da API 650 5.6.3.1: D ≤ 60 m e t ≤ 12,5 mm (1/2").
  let foraDaFaixaUsoAPI650 = false;
  let motivoForaFaixa: string | undefined;
  if (D_m > 60) {
    foraDaFaixaUsoAPI650 = true;
    motivoForaFaixa = `D = ${D_m.toFixed(2)} m > 60 m`;
  } else if (espessuraMaxAdotada > 12.5) {
    foraDaFaixaUsoAPI650 = true;
    motivoForaFaixa = `espessura adotada ${espessuraMaxAdotada} mm > 12,5 mm`;
  }

  return {
    metodo: "API 650 1-Foot",
    entrada,
    aneis,
    numeroAneis: aneis.length,
    chapasPorAnel,
    pesoTotal_kg,
    area_m2,
    listaChapas,
    foraDaFaixaUsoAPI650,
    motivoForaFaixa,
  };
}
