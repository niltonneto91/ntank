/**
 * Tabela de flanges ASME B16.5 (compilação própria a partir de catálogos
 * de fornecedor — NÃO reproduz texto, tabelas ou figuras da norma).
 *
 * Cobertura MVP: DN 1" a 24", classes 150# e 300#, tipos WN / SO / SW / BL.
 * Faces: RF (default), FF, RTJ.
 *
 * Os pesos a seguir são valores típicos arredondados em catálogo
 * (em kg, aço carbono A105). Sirvem de estimativa para cálculo de
 * massa total — o engenheiro deve confirmar contra o catálogo do
 * fornecedor real ao especificar o bocal.
 */

import type { ResultadoCalculo } from "./types.js";

export type ClassePressao = "150#" | "300#";
export type TipoFlange = "WN" | "SO" | "SW" | "BL";
export type FaceFlange = "RF" | "FF" | "RTJ";

export interface DimensaoFlange {
  /** DN nominal em polegadas (1, 1.5, 2, 3, ...). */
  readonly DN_pol: number;
  /** OD interno do pescoço (Bore B, mm) — para WN/SO. */
  readonly bore_mm: number;
  /** OD externo do flange (mm). */
  readonly OD_mm: number;
  /** Espessura do anel do flange (mm). */
  readonly espessura_mm: number;
}

interface RegistroFlange extends DimensaoFlange {
  readonly classe: ClassePressao;
  /** Massa de referência do flange WN em kg (catálogo). */
  readonly massa_WN_kg: number;
}

/**
 * Tabela de massa do flange WN (Welding Neck) por DN e classe.
 * Valores compilados de catálogos comerciais (Tupy / ITA / Forjasul) —
 * AÇO CARBONO A105, face RF padrão, aço carbono.
 */
export const FLANGES_B16_5: ReadonlyArray<RegistroFlange> = [
  // ===== Classe 150# =====
  { DN_pol: 1, classe: "150#", bore_mm: 27, OD_mm: 108, espessura_mm: 14, massa_WN_kg: 0.9 },
  { DN_pol: 1.5, classe: "150#", bore_mm: 41, OD_mm: 127, espessura_mm: 17, massa_WN_kg: 1.5 },
  { DN_pol: 2, classe: "150#", bore_mm: 53, OD_mm: 152, espessura_mm: 19, massa_WN_kg: 2.4 },
  { DN_pol: 3, classe: "150#", bore_mm: 78, OD_mm: 191, espessura_mm: 24, massa_WN_kg: 4.1 },
  { DN_pol: 4, classe: "150#", bore_mm: 102, OD_mm: 229, espessura_mm: 24, massa_WN_kg: 5.6 },
  { DN_pol: 6, classe: "150#", bore_mm: 154, OD_mm: 279, espessura_mm: 25, massa_WN_kg: 9.2 },
  { DN_pol: 8, classe: "150#", bore_mm: 203, OD_mm: 343, espessura_mm: 28, massa_WN_kg: 13.8 },
  { DN_pol: 10, classe: "150#", bore_mm: 254, OD_mm: 406, espessura_mm: 30, massa_WN_kg: 19.6 },
  { DN_pol: 12, classe: "150#", bore_mm: 305, OD_mm: 483, espessura_mm: 32, massa_WN_kg: 28.0 },
  { DN_pol: 14, classe: "150#", bore_mm: 337, OD_mm: 533, espessura_mm: 35, massa_WN_kg: 36.0 },
  { DN_pol: 16, classe: "150#", bore_mm: 387, OD_mm: 597, espessura_mm: 37, massa_WN_kg: 47.0 },
  { DN_pol: 18, classe: "150#", bore_mm: 438, OD_mm: 635, espessura_mm: 40, massa_WN_kg: 56.0 },
  { DN_pol: 20, classe: "150#", bore_mm: 489, OD_mm: 700, espessura_mm: 43, massa_WN_kg: 71.0 },
  { DN_pol: 24, classe: "150#", bore_mm: 591, OD_mm: 813, espessura_mm: 48, massa_WN_kg: 100.0 },
  // ===== Classe 300# =====
  { DN_pol: 1, classe: "300#", bore_mm: 27, OD_mm: 124, espessura_mm: 17, massa_WN_kg: 1.4 },
  { DN_pol: 1.5, classe: "300#", bore_mm: 41, OD_mm: 156, espessura_mm: 21, massa_WN_kg: 2.5 },
  { DN_pol: 2, classe: "300#", bore_mm: 53, OD_mm: 165, espessura_mm: 22, massa_WN_kg: 3.4 },
  { DN_pol: 3, classe: "300#", bore_mm: 78, OD_mm: 210, espessura_mm: 29, massa_WN_kg: 6.2 },
  { DN_pol: 4, classe: "300#", bore_mm: 102, OD_mm: 254, espessura_mm: 32, massa_WN_kg: 9.2 },
  { DN_pol: 6, classe: "300#", bore_mm: 154, OD_mm: 318, espessura_mm: 37, massa_WN_kg: 15.4 },
  { DN_pol: 8, classe: "300#", bore_mm: 203, OD_mm: 381, espessura_mm: 41, massa_WN_kg: 22.5 },
  { DN_pol: 10, classe: "300#", bore_mm: 254, OD_mm: 444, espessura_mm: 48, massa_WN_kg: 33.0 },
  { DN_pol: 12, classe: "300#", bore_mm: 305, OD_mm: 521, espessura_mm: 51, massa_WN_kg: 47.0 },
  { DN_pol: 14, classe: "300#", bore_mm: 337, OD_mm: 584, espessura_mm: 54, massa_WN_kg: 60.0 },
  { DN_pol: 16, classe: "300#", bore_mm: 387, OD_mm: 648, espessura_mm: 57, massa_WN_kg: 78.0 },
  { DN_pol: 18, classe: "300#", bore_mm: 438, OD_mm: 711, espessura_mm: 60, massa_WN_kg: 95.0 },
  { DN_pol: 20, classe: "300#", bore_mm: 489, OD_mm: 775, espessura_mm: 64, massa_WN_kg: 119.0 },
  { DN_pol: 24, classe: "300#", bore_mm: 591, OD_mm: 914, espessura_mm: 70, massa_WN_kg: 175.0 },
];

/** Fatores de massa por tipo (relativo ao WN tabelado). */
export const FATOR_MASSA_TIPO: Readonly<Record<TipoFlange, number>> = {
  WN: 1.0,
  SO: 0.95, // Slip-on tem pescoço mais curto
  SW: 0.85, // Socket weld só até DN 4", mais curto ainda
  BL: 1.15, // Blind: maciço, sem furo passante
};

/** Fator de massa adicional pela face (RTJ tem ranhura usinada, ~+3%). */
export const FATOR_MASSA_FACE: Readonly<Record<FaceFlange, number>> = {
  RF: 1.0,
  FF: 0.98,
  RTJ: 1.03,
};

export interface FlangeSelecao {
  readonly DN_pol: number;
  readonly classe: ClassePressao;
  readonly tipo: TipoFlange;
  readonly face: FaceFlange;
}

export interface ResultadoFlange {
  readonly selecao: FlangeSelecao;
  readonly dimensao: DimensaoFlange;
  readonly massa_kg: number;
  readonly memoriaCalculo: ResultadoCalculo;
}

const DNS_VALIDOS = [1, 1.5, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24];

/**
 * Lista os DNs disponíveis no MVP (úteis para popular um dropdown).
 */
export function listarDNsDisponiveis(): ReadonlyArray<number> {
  return DNS_VALIDOS;
}

/**
 * Seleciona o flange e calcula a massa adotando os fatores de tipo e face.
 *
 * @throws Error se DN ou classe não estiverem na tabela.
 * @throws Error se tipo SW for solicitado para DN > 4" (não disponível).
 */
export function calcularFlange(selecao: FlangeSelecao): ResultadoFlange {
  if (selecao.tipo === "SW" && selecao.DN_pol > 4) {
    throw new Error(
      `Flange Socket Weld só disponível até DN 4". Solicitado DN ${selecao.DN_pol}".`,
    );
  }
  const registro = FLANGES_B16_5.find(
    (f) => f.DN_pol === selecao.DN_pol && f.classe === selecao.classe,
  );
  if (!registro) {
    throw new Error(
      `Flange não tabelado: DN ${selecao.DN_pol}", ${selecao.classe}. ` +
        `Disponíveis: ${DNS_VALIDOS.join('", ')}".`,
    );
  }
  const fatorTipo = FATOR_MASSA_TIPO[selecao.tipo];
  const fatorFace = FATOR_MASSA_FACE[selecao.face];
  const massa = registro.massa_WN_kg * fatorTipo * fatorFace;

  return {
    selecao,
    dimensao: {
      DN_pol: registro.DN_pol,
      bore_mm: registro.bore_mm,
      OD_mm: registro.OD_mm,
      espessura_mm: registro.espessura_mm,
    },
    massa_kg: massa,
    memoriaCalculo: {
      componente: `Flange DN ${selecao.DN_pol}" ${selecao.classe} ${selecao.tipo}/${selecao.face}`,
      metodo: "ASME B16.5 (catálogo de fornecedor — A105)",
      itemNorma: "ASME B16.5",
      formula: "massa = massa_WN_tabelada × fator_tipo × fator_face",
      parametros: {
        DN_pol: selecao.DN_pol,
        classe: selecao.classe,
        tipo: selecao.tipo,
        face: selecao.face,
        massa_WN_kg: registro.massa_WN_kg,
        fator_tipo: fatorTipo,
        fator_face: fatorFace,
      },
      substituicao: `massa = ${registro.massa_WN_kg.toFixed(2)} × ${fatorTipo} × ${fatorFace} = ${massa.toFixed(2)} kg`,
      resultado: { valor: massa, unidade: "kg" },
    },
  };
}
