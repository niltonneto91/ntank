/**
 * Teto cônico suportado (chapa de cobertura + estrutura interna).
 *
 * Conforme API 650 item 5.10.4: a chapa de cobertura tem espessura
 * mínima nominal — toda a carga é absorvida por:
 *   1. Vigas radiais (rafters) que apoiam a chapa
 *   2. Anel central de compressão (compression ring)
 *   3. Colunas internas (apenas para D > 12 m, conforme prática NTN)
 *   4. Conexões e contraventamentos (~8% adicional)
 *
 * Os perfis são escolhidos por catálogo comercial conforme o vão da viga
 * (UPN ou IPN/IPE):
 *
 *   Vão (m)   Perfil          kg/m
 *   ≤ 4       UPN 100         10,6
 *   ≤ 6       UPN 140         16,0
 *   ≤ 8       UPN 200         25,3
 *   ≤ 10      UPN 240         33,2
 *   > 10      UPN 300         46,2
 *
 * O usuário pode override-ar a estimativa fornecendo
 * `pesoEstruturaPorM2_kg` na entrada (regra antiga).
 */

import { selecionarChapaComercial } from "../chapas.js";
import { DENSIDADE_ACO_CARBONO } from "../materiais.js";
import type {
  DetalheEstruturaTeto,
  EntradaTeto,
  ResultadoTeto,
} from "../types.js";

const E_CHAPA_MIN_NOMINAL_MM = 5;

/** Espaçamento perimetral entre vigas radiais (m) — prática NTN. */
const ESPACAMENTO_VIGAS_M = 1.5;

/** Número mínimo de vigas radiais (mesmo para tanques pequenos). */
const N_VIGAS_MIN = 8;

/** Diâmetro do anel central como fração de D (mínimo 0,5 m). */
const FATOR_DIAMETRO_ANEL = 0.10;
const DIAMETRO_ANEL_MIN_M = 0.5;

/** kg/m do anel central (perfil tubular pesado). */
const KG_POR_M_ANEL_CENTRAL = 25;

/** kg/m das colunas internas (IPE 200 padrão). */
const KG_POR_M_COLUNA = 22;

/** Diâmetro a partir do qual colunas internas se tornam necessárias (m). */
const D_LIMITE_COLUNA_M = 12;

/** Folga adicional (m) acima do H do tanque para a coluna ancorar. */
const FOLGA_COLUNA_M = 0.5;

/** Percentual adicional de massa para conexões e contraventamentos. */
const FATOR_CONEXOES = 0.08;

interface SelecaoPerfil {
  readonly perfil: string;
  readonly kg_por_m: number;
}

/** Seleciona perfil UPN da viga radial em função do vão (D/2). */
function selecionarPerfilViga(vao_m: number): SelecaoPerfil {
  if (vao_m <= 4) return { perfil: "UPN 100", kg_por_m: 10.6 };
  if (vao_m <= 6) return { perfil: "UPN 140", kg_por_m: 16.0 };
  if (vao_m <= 8) return { perfil: "UPN 200", kg_por_m: 25.3 };
  if (vao_m <= 10) return { perfil: "UPN 240", kg_por_m: 33.2 };
  return { perfil: "UPN 300", kg_por_m: 46.2 };
}

/** Determina quantas colunas internas são necessárias em função de D.
 *  Regra NTN: sempre usar pelo menos 1 tubo central (coluna de apoio).
 *  Para D ≥ 18 m: 1 central + 1 a cada 6 m adicionais.
 */
function quantidadeColunas(D_m: number): number {
  if (D_m < D_LIMITE_COLUNA_M) return 1; // 1 tubo central sempre
  if (D_m < 18) return 1;
  // Acima de 18 m: 1 central + 1 a cada 6 m adicionais
  return 1 + Math.ceil((D_m - 18) / 6);
}

export function calcularTetoConicoSuportado(
  entrada: EntradaTeto,
): ResultadoTeto {
  if (entrada.tipo !== "conico-suportado") {
    throw new Error(`Tipo incompatível: ${entrada.tipo}`);
  }
  const angulo_graus = entrada.anguloCone_graus ?? 9.5;
  if (angulo_graus < 4.76 || angulo_graus > 30) {
    throw new Error(
      `Ângulo do cone inválido (${angulo_graus}°). Faixa típica: 4,76° (1:12) a 30°.`,
    );
  }

  const D_m = entrada.D_mm / 1000;
  // D_teto = diâmetro externo do teto (assenta na face externa do costado)
  const D_teto_m = D_m + 2 * ((entrada.e_costado_base_mm ?? 0) / 1000);
  const angulo_rad = (angulo_graus * Math.PI) / 180;
  const cosTheta = Math.cos(angulo_rad);

  // Teto suportado: a chapa NÃO é estrutural (vigas radiais absorvem a carga).
  // Espessura mínima normativa = 5 mm, mas não existe comercialmente.
  // Adotar sempre 3/16" (4,75 mm) como chapa de fechamento.
  const e_calc = E_CHAPA_MIN_NOMINAL_MM + entrada.CA_mm;
  const e_para_comercial = 4.75 + entrada.CA_mm;
  const chapa = selecionarChapaComercial(e_para_comercial);

  // Área usa D_teto (diâmetro externo) para massa correta
  const area_m2 = (Math.PI * D_teto_m * D_teto_m) / (4 * cosTheta);
  const peso_chapa = area_m2 * (chapa.espessura / 1000) * DENSIDADE_ACO_CARBONO;

  // ============================================================
  // ESTRUTURA — modo paramétrico (default) ou override por kg/m²
  // ============================================================
  let peso_estrutura: number;
  let detalheEstrutura: DetalheEstruturaTeto | undefined;
  let estruturaSubstituicao: string;

  if (entrada.pesoEstruturaPorM2_kg !== undefined) {
    // Modo legado: usuário forneceu kg/m² — não detalhamos
    peso_estrutura = area_m2 * entrada.pesoEstruturaPorM2_kg;
    estruturaSubstituicao =
      `M_estrutura = ${area_m2.toFixed(2)} m² × ${entrada.pesoEstruturaPorM2_kg} kg/m² = ${peso_estrutura.toFixed(1)} kg`;
  } else {
    // Modo paramétrico: dimensiona vigas + anel + colunas + conexões
    // 1) Vigas radiais
    const n_vigas = Math.max(
      N_VIGAS_MIN,
      Math.ceil((Math.PI * D_m) / ESPACAMENTO_VIGAS_M),
    );
    const vao_viga_m = D_m / 2;
    // Comprimento real da viga inclinada: vão / cos θ + folga
    const L_viga_m = vao_viga_m / cosTheta + 0.3;
    const perfilViga = selecionarPerfilViga(vao_viga_m);
    const massa_vigas = n_vigas * L_viga_m * perfilViga.kg_por_m;

    // 2) Anel central
    const D_anel_m = Math.max(DIAMETRO_ANEL_MIN_M, FATOR_DIAMETRO_ANEL * D_m);
    const massa_anel = Math.PI * D_anel_m * KG_POR_M_ANEL_CENTRAL;

    // 3) Colunas (apenas D ≥ 12 m)
    const n_colunas = quantidadeColunas(D_m);
    const H_efetiva_m = entrada.D_mm / 1000; // estimativa: comprimento da coluna ≈ H, default usa D como aproximação
    // Sem H disponível na entrada do teto, usamos H = altura típica (D × 1) como aproximação;
    // o caller pode passar via opcoes em futuras versões.
    const L_coluna_m = H_efetiva_m + FOLGA_COLUNA_M;
    const massa_colunas = n_colunas * L_coluna_m * KG_POR_M_COLUNA;

    // 4) Conexões / contraventamentos: 8% do subtotal
    const subtotal = massa_vigas + massa_anel + massa_colunas;
    const massa_conexoes = subtotal * FATOR_CONEXOES;

    peso_estrutura = subtotal + massa_conexoes;

    detalheEstrutura = {
      vigas: {
        quantidade: n_vigas,
        comprimento_m: Number(L_viga_m.toFixed(2)),
        perfil: perfilViga.perfil,
        kg_por_m: perfilViga.kg_por_m,
        massa_kg: Number(massa_vigas.toFixed(1)),
      },
      anelCentral: {
        diametro_m: Number(D_anel_m.toFixed(2)),
        perfil: "Tubular ø150 mm",
        kg_por_m: KG_POR_M_ANEL_CENTRAL,
        massa_kg: Number(massa_anel.toFixed(1)),
      },
      colunas: {
        quantidade: n_colunas,
        comprimento_m: Number(L_coluna_m.toFixed(2)),
        perfil: n_colunas > 0 ? "IPE 200" : "—",
        kg_por_m: n_colunas > 0 ? KG_POR_M_COLUNA : 0,
        massa_kg: Number(massa_colunas.toFixed(1)),
      },
      massa_conexoes_kg: Number(massa_conexoes.toFixed(1)),
    };

    estruturaSubstituicao =
      `Vigas: ${n_vigas} × ${L_viga_m.toFixed(2)} m × ${perfilViga.perfil} (${perfilViga.kg_por_m} kg/m) = ${massa_vigas.toFixed(1)} kg; ` +
      `Anel: π × ${D_anel_m.toFixed(2)} × ${KG_POR_M_ANEL_CENTRAL} = ${massa_anel.toFixed(1)} kg; ` +
      `Colunas: ${n_colunas} × ${L_coluna_m.toFixed(2)} × ${n_colunas > 0 ? KG_POR_M_COLUNA : 0} = ${massa_colunas.toFixed(1)} kg; ` +
      `Conexões (8%): ${massa_conexoes.toFixed(1)} kg → total = ${peso_estrutura.toFixed(1)} kg`;
  }

  return {
    tipo: "conico-suportado",
    entrada,
    e_calc_mm: e_calc,
    e_adotada_mm: chapa.espessura,
    chapaComercial: chapa,
    area_m2,
    peso_chapa_kg: peso_chapa,
    peso_estrutura_kg: peso_estrutura,
    detalheEstrutura,
    pesoTotal_kg: peso_chapa + peso_estrutura,
    memoriaCalculo: {
      componente: "Teto - Cônico suportado",
      metodo: "API 650 5.10.4 (chapa) + dimensionamento paramétrico da estrutura",
      itemNorma: "API 650, 5.10.4",
      formula:
        entrada.pesoEstruturaPorM2_kg !== undefined
          ? "t_chapa = 5 + CA;  M_estrutura = A · p_estrutura"
          : "t_chapa = 5 + CA;  M_estrutura = vigas + anel + colunas + 8% conexões",
      parametros: {
        D_m,
        D_teto_m: Number(D_teto_m.toFixed(4)),
        angulo_graus,
        CA_mm: entrada.CA_mm,
        area_m2: Number(area_m2.toFixed(3)),
        ...(entrada.pesoEstruturaPorM2_kg !== undefined
          ? { pesoEstruturaPorM2_kg: entrada.pesoEstruturaPorM2_kg }
          : {}),
      },
      substituicao:
        `t_chapa = ${E_CHAPA_MIN_NOMINAL_MM} + ${entrada.CA_mm} = ${e_calc.toFixed(2)} mm; ` +
        `M_chapa = ${area_m2.toFixed(2)} · ${(chapa.espessura / 1000).toFixed(5)} · 7850 = ${peso_chapa.toFixed(1)} kg; ` +
        estruturaSubstituicao,
      resultado: { valor: e_calc, unidade: "mm" },
      espessuraAdotada: {
        valor: chapa.espessura,
        unidade: "mm",
        justificativa: `Chapa comercial (${chapa.polegada}").`,
      },
    },
  };
}
