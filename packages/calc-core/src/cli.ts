#!/usr/bin/env node
/**
 * CLI do calc-core. Aceita JSON em stdin OU como argumento, executa o
 * comparativo do costado nos três métodos, e imprime resultado JSON em stdout.
 *
 * Uso:
 *   echo '{ "D_mm": 11460, "H_mm": 19000, "G": 1, "CA_mm": 1.5,
 *           "larguraChapa_mm": 1500, "comprimentoChapa_mm": 6000 }' \
 *     | node dist/cli.js
 *
 *   ou:
 *   node dist/cli.js entrada.json
 */

import { readFileSync } from "node:fs";
import { compararCostado } from "./costado/index.js";
import { getMaterial } from "./materiais.js";
import type { EntradaCostado } from "./types.js";

interface EntradaCLI {
  D_mm: number;
  H_mm: number;
  G: number;
  CA_mm: number;
  larguraChapa_mm: number;
  comprimentoChapa_mm: number;
  materialId?: string;
  E?: number;
  custoAcoPorKg_R$?: number;
}

function lerEntrada(): EntradaCLI {
  const arg = process.argv[2];
  if (arg) {
    return JSON.parse(readFileSync(arg, "utf8"));
  }
  // stdin
  const chunks: Buffer[] = [];
  const stdinData = readFileSync(0);
  chunks.push(stdinData);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function main(): void {
  const cli = lerEntrada();

  const entrada: EntradaCostado = {
    D_mm: cli.D_mm,
    H_mm: cli.H_mm,
    G: cli.G,
    CA_mm: cli.CA_mm,
    larguraChapa_mm: cli.larguraChapa_mm,
    comprimentoChapa_mm: cli.comprimentoChapa_mm,
    material: cli.materialId ? getMaterial(cli.materialId) : undefined,
    E: cli.E,
  };

  const comparativo = compararCostado(entrada, cli.custoAcoPorKg_R$ ?? 6.5);

  // Resumo enxuto: cada variante exibe peso, custo, espessura por anel e a
  // memória de cálculo do primeiro anel (suficiente para inspeção rápida).
  const resumo = comparativo.variantes.map((v) => ({
    metodo: v.resultado.metodo,
    pesoTotal_kg: Number(v.resultado.pesoTotal_kg.toFixed(2)),
    custo_R$: Number(v.custo_R$.toFixed(2)),
    numeroAneis: v.resultado.numeroAneis,
    chapasPorAnel: Number(v.resultado.chapasPorAnel.toFixed(4)),
    aneis: v.resultado.aneis.map((a) => ({
      n: a.indice,
      H_ef_m: Number(a.H_efetiva_m.toFixed(4)),
      e_calc_mm: Number(a.e_calc_mm.toFixed(5)),
      chapa: a.chapaComercial.polegada,
      e_adot_mm: a.chapaComercial.espessura,
      peso_kg: Number(a.peso_kg.toFixed(2)),
    })),
    listaCorte: v.resultado.listaChapas.map((c) => ({
      chapa: c.chapa.polegada,
      espessura_mm: c.chapa.espessura,
      quantidade: Number(c.quantidade.toFixed(2)),
    })),
  }));

  const saida = {
    entrada: {
      ...entrada,
      material: entrada.material?.designacao,
    },
    custoAcoPorKg_R$: cli.custoAcoPorKg_R$ ?? 6.5,
    variantes: resumo,
    recomendada: {
      metodo: comparativo.recomendada.resultado.metodo,
      pesoTotal_kg: Number(comparativo.recomendada.resultado.pesoTotal_kg.toFixed(2)),
      custo_R$: Number(comparativo.recomendada.custo_R$.toFixed(2)),
    },
    criterio: comparativo.criterioRecomendacao,
  };

  process.stdout.write(JSON.stringify(saida, null, 2) + "\n");
}

main();
