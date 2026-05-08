/**
 * Costado pela NBR 7821 (versão simplificada da planilha NTN).
 *
 * Fórmula:    e = 0,04 · D · (H_ef − 0,3) · G + CA
 *   D em metros, H_ef em metros, G adimensional, e/CA em mm.
 *
 * H_ef = soma das alturas DOS ANÉIS A PARTIR DA BASE DO ANEL ATUAL ATÉ O TOPO,
 *        ou seja, a coluna líquida acima da base do anel.
 *
 * A constante 0,04 corresponde ≈ 4,9 / (Sd · E) com Sd = 137 MPa e E = 0,85
 * (caso típico do A283-C com radiografia parcial).
 */

import { CHAPAS_COMERCIAIS, selecionarChapaComercial } from "../chapas.js";
import type {
  AnelCostado,
  ChapaComercial,
  EntradaCostado,
  ResultadoCostado,
} from "../types.js";

/**
 * Particiona a altura total em anéis de altura fixa igual à largura da chapa,
 * exceto o último anel (topo), que pode ser menor — replicando a regra da
 * planilha (linha A30 da aba "Cálculo do Costado").
 */
/** Altura mínima para o último anel (evita faixas muito curtas). */
const ALTURA_MIN_ANEL_MM = 500;

export function particionarAneis(H_mm: number, larguraChapa_mm: number): number[] {
  if (H_mm <= 0 || larguraChapa_mm <= 0) {
    throw new Error("H e larguraChapa devem ser positivos.");
  }
  const aneis: number[] = [];
  let restante = H_mm;
  while (restante > 0.5) {
    if (restante < larguraChapa_mm) {
      // Último anel parcial: garante mínimo de ALTURA_MIN_ANEL_MM.
      const h = restante < ALTURA_MIN_ANEL_MM ? ALTURA_MIN_ANEL_MM : restante;
      aneis.push(h);
      break;
    }
    aneis.push(larguraChapa_mm);
    restante -= larguraChapa_mm;
  }
  return aneis;
}

/**
 * Espessura calculada (sem aplicar mínima nem comercial).
 * Fórmula bruta NBR 7821 simplificada.
 */
export function espessuraCalculadaNBR7821(
  D_m: number,
  H_efetiva_m: number,
  G: number,
  CA_mm: number,
): number {
  return 0.04 * D_m * (H_efetiva_m - 0.3) * G + CA_mm;
}

/**
 * Calcula todo o costado pelo método NBR 7821 simplificado da planilha.
 *
 * Para reproduzir a planilha NTN, o peso é calculado como:
 *   peso_anel = pesoPorM2 · larguraChapa · comprimentoChapa · n_chapas_anel
 * com larguraChapa fixa (não considera altura real do anel quando menor que a largura).
 * Esta é a simplificação consciente da planilha — vide doc 01.
 */
export function calcularCostadoNBR7821(
  entrada: EntradaCostado,
): ResultadoCostado {
  validarEntradaCostado(entrada);

  const D_m = entrada.D_mm / 1000;
  const larguraChapa_m = entrada.larguraChapa_mm / 1000;
  const comprimentoChapa_m = entrada.comprimentoChapa_mm / 1000;

  const alturasAneis_mm = particionarAneis(entrada.H_mm, entrada.larguraChapa_mm);
  const alturasAneis_m = alturasAneis_mm.map((h) => h / 1000);

  const chapasPorAnel = (D_m * Math.PI) / comprimentoChapa_m;

  const aneis: AnelCostado[] = [];
  for (let i = 0; i < alturasAneis_m.length; i++) {
    // H_efetiva = soma das alturas DESTE anel até o topo (inclusive).
    const H_efetiva_m = alturasAneis_m
      .slice(i)
      .reduce((acc, h) => acc + h, 0);

    const e_calc = espessuraCalculadaNBR7821(D_m, H_efetiva_m, entrada.G, entrada.CA_mm);
    // NBR 7821 simplificada (regra da planilha NTN): seleciona apenas pela
    // chapa comercial superior, sem aplicar mínima nominal. A regra de
    // espessura mínima nominal é da API 650 e fica no método 1-Foot/VDP.
    const chapa = selecionarChapaComercial(e_calc, entrada.larguraChapa_mm);

    // Replicando a planilha: peso usa larguraChapa fixa, não a altura real.
    const peso_kg =
      chapa.pesoPorM2 * larguraChapa_m * comprimentoChapa_m * chapasPorAnel;

    aneis.push({
      indice: i + 1,
      altura_mm: alturasAneis_mm[i]!,
      H_efetiva_m,
      e_calc_mm: e_calc,
      chapaComercial: chapa,
      peso_kg,
      memoriaCalculo: {
        componente: `Costado - Anel ${i + 1}`,
        metodo: "NBR 7821 Simplificada",
        itemNorma: "NBR 7821, item 5.4.1 (versão simplificada)",
        formula: "e = 0,04 · D · (H_ef − 0,3) · G + CA",
        parametros: {
          D_m,
          H_efetiva_m: Number(H_efetiva_m.toFixed(4)),
          G: entrada.G,
          CA_mm: entrada.CA_mm,
        },
        substituicao:
          `e = 0,04 · ${D_m.toFixed(3)} · (${H_efetiva_m.toFixed(2)} − 0,3) · ` +
          `${entrada.G} + ${entrada.CA_mm} = ${e_calc.toFixed(4)} mm`,
        resultado: { valor: e_calc, unidade: "mm" },
        espessuraAdotada: {
          valor: chapa.espessura,
          unidade: "mm",
          justificativa: `Chapa comercial superior à espessura calculada (${chapa.polegada}")`,
        },
      },
    });
  }

  const pesoTotal_kg = aneis.reduce((acc, a) => acc + a.peso_kg, 0);
  const area_m2 = D_m * Math.PI * (entrada.H_mm / 1000);

  // Lista de corte: agrupa por chapa comercial.
  const mapaChapas = new Map<string, { chapa: ChapaComercial; quantidade: number }>();
  for (const anel of aneis) {
    const key = anel.chapaComercial.polegada;
    const existente = mapaChapas.get(key);
    if (existente) {
      existente.quantidade += chapasPorAnel;
    } else {
      mapaChapas.set(key, { chapa: anel.chapaComercial, quantidade: chapasPorAnel });
    }
  }
  const listaChapas = Array.from(mapaChapas.values()).sort(
    (a, b) => CHAPAS_COMERCIAIS.indexOf(a.chapa) - CHAPAS_COMERCIAIS.indexOf(b.chapa),
  );

  return {
    metodo: "NBR 7821 Simplificada",
    entrada,
    aneis,
    numeroAneis: aneis.length,
    chapasPorAnel,
    pesoTotal_kg,
    area_m2,
    listaChapas,
  };
}

function validarEntradaCostado(e: EntradaCostado): void {
  if (e.D_mm <= 0) throw new Error(`D inválido: ${e.D_mm} mm`);
  if (e.H_mm <= 0) throw new Error(`H inválido: ${e.H_mm} mm`);
  if (e.G <= 0) throw new Error(`G inválido: ${e.G}`);
  if (e.CA_mm < 0) throw new Error(`CA inválido: ${e.CA_mm} mm`);
  if (![1500, 1800, 2000, 2440, 2550].includes(e.larguraChapa_mm)) {
    throw new Error(
      `Largura de chapa não suportada: ${e.larguraChapa_mm} mm ` +
        `(use 1500, 1800, 2000, 2440 ou 2550)`,
    );
  }
  if (![6000, 12000].includes(e.comprimentoChapa_mm)) {
    throw new Error(
      `Comprimento de chapa não suportado: ${e.comprimentoChapa_mm} mm (use 6000 ou 12000)`,
    );
  }
}
