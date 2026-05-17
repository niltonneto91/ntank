/**
 * Cálculos de volume para bacia de contenção — NBR 17505-2:2024 §5.9.2.2.
 *
 * §5.9.2.2.1 (tanques verticais):
 *   Capacidade líquida volumétrica da bacia ≥ volume do maior tanque cheio.
 *   "Capacidade líquida" = volume interno da bacia menos os volumes deslocados
 *   pelas bases dos tanques, diques intermediários e outras estruturas.
 *   A sobrealtura de 0,20 m é acrescida à altura calculada da parede do dique.
 *
 * §5.9.2.2.2 (tanques horizontais):
 *   Capacidade líquida ≥ volume total de TODOS os tanques horizontais na bacia.
 *
 * NÃO reproduz texto integral da norma.
 */

import type { TanqueBacia } from "./types.js";

/** Freeboard mínimo exigido pela norma [m] (NBR 17505-2 §5.9.2.2.1) */
export const FREEBOARD_MINIMO_M = 0.20;

/** Altura máxima do dique medida internamente [m] (NBR 17505-2 §5.9.2.2) */
export const ALTURA_MAX_DIQUE_M = 3.0;

/**
 * Área da base circular de um tanque [m²].
 *
 * Usa o diâmetro do anel de fundação (base de concreto) quando informado e > D_m,
 * pois a fundação desloca mais área que o costado do tanque.
 * Caso contrário usa D_m (diâmetro do costado).
 */
export function areaBaseTanque(D_m: number, diametroAnel_m?: number): number {
  const D = diametroAnel_m && diametroAnel_m > D_m ? diametroAnel_m : D_m;
  return (Math.PI / 4) * D * D;
}

/**
 * Calcula o volume operacional de um tanque cilíndrico vertical:
 *   V = π/4 × D² × H [m³]
 *
 * Para tanques com volume informado diretamente, use esse valor.
 */
export function calcularVolumeTanque(D_m: number, H_m: number): number {
  return (Math.PI / 4) * D_m * D_m * H_m;
}

/**
 * Calcula o volume mínimo requerido para a bacia (NBR 17505-2 §5.9.2.2.1–2.2.2).
 *
 * @param tanques  Lista de tanques na bacia
 * @returns Volume requerido [m³]
 *
 * Lógica:
 * - Tanques verticais: V_req = volume do maior tanque vertical cheio
 * - Tanques horizontais: V_req = soma dos volumes de todos os tanques horizontais
 * - Se há ambos os tipos: V_req = max(V_maior_vertical, V_total_horizontal)
 *   (interpretação conservadora — cada grupo tem sua exigência independente).
 */
export function calcularVolumeRequerido(tanques: TanqueBacia[]): number {
  if (tanques.length === 0) return 0;

  const verticais = tanques.filter((t) => t.orientacao === "vertical");
  const horizontais = tanques.filter((t) => t.orientacao === "horizontal");

  // Exigência para tanques verticais: maior tanque
  const V_maior_vertical =
    verticais.length > 0
      ? Math.max(...verticais.map((t) => t.volume_m3))
      : 0;

  // Exigência para tanques horizontais: soma de todos
  const V_total_horizontal = horizontais.reduce(
    (acc, t) => acc + t.volume_m3,
    0,
  );

  return Math.max(V_maior_vertical, V_total_horizontal);
}

/**
 * Calcula a soma das áreas de base de todos os tanques [m²].
 * Mantido para compatibilidade; use `calcularDeslocamentos` para cálculos precisos.
 */
export function calcularAreaBasesTanques(tanques: TanqueBacia[]): number {
  return tanques.reduce((acc, t) => acc + areaBaseTanque(t.D_m, t.diametroAnel_m), 0);
}

// ---------------------------------------------------------------------------
// Deslocamentos internos (modelo físico correto — NBR 17505-2 §5.9.2.2.1)
// ---------------------------------------------------------------------------

/**
 * Resultado detalhado do cálculo de volumes deslocados dentro da bacia.
 * Retornado por `calcularDeslocamentos`.
 */
export interface InternalDeslocamentos {
  /** Volume deslocado pelos anéis de fundação (base de concreto/areia) de TODOS os tanques [m³] */
  V_desl_bases_m3: number;
  /**
   * Volume deslocado pelo corpo dos tanques NÃO-MAIORES acima dos anéis de fundação [m³].
   * O tanque maior é excluído porque, ao falhar, seu interior torna-se acessível ao líquido.
   */
  V_desl_corpos_m3: number;
  /** Soma bases + corpos [m³] (sem muretas/outros) */
  V_desl_total_m3: number;
  /** ID do tanque considerado "maior" (critério: volume_m3 máximo) */
  idTanqueMaior: string;
}

/**
 * Calcula os volumes deslocados pelos tanques e fundações dentro da bacia.
 *
 * Modelo físico (NBR 17505-2 §5.9.2.2.1):
 *   - Ao falhar, o maior tanque libera V_maior no interior da bacia.
 *   - A casca do maior tanque permanece, mas seu interior fica **acessível** ao líquido —
 *     portanto NÃO é descontado como deslocamento.
 *   - Os tanques menores estão intactos (cheios) → seus corpos deslocam volume.
 *   - Todos os anéis de fundação (concreto/areia) são obstáculos sólidos.
 *
 *   V_desl_bases  = Σ_todos  (A_base_i  × min(h_anel_i, h_efetiva))
 *   V_desl_corpos = Σ_{j≠maior} (A_tanque_j × max(0, h_efetiva − h_anel_j))
 *
 * @param tanques     Tanques na bacia
 * @param h_efetiva   Altura efetiva de contenção (alturaTotal − freeboard) [m]
 */
export function calcularDeslocamentos(
  tanques: TanqueBacia[],
  h_efetiva: number,
): InternalDeslocamentos {
  const vazio: InternalDeslocamentos = {
    V_desl_bases_m3: 0, V_desl_corpos_m3: 0, V_desl_total_m3: 0, idTanqueMaior: "",
  };
  if (tanques.length === 0 || h_efetiva <= 0) return vazio;

  // Tanque maior por volume_m3 (desempate pelo índice — determinístico)
  const tanqueMaior = tanques.reduce((m, t) => t.volume_m3 > m.volume_m3 ? t : m);

  // Anéis de fundação — TODOS os tanques (usam diametroAnel_m se > D_m)
  const V_desl_bases = tanques.reduce((acc, t) => {
    const D = (t.diametroAnel_m && t.diametroAnel_m > t.D_m) ? t.diametroAnel_m : t.D_m;
    const hA = Math.min(t.alturaAnel_m ?? 0, h_efetiva);
    return acc + (Math.PI / 4) * D * D * hA;
  }, 0);

  // Corpo acima do anel — apenas tanques NÃO-MAIORES
  const V_desl_corpos = tanques
    .filter(t => t.id !== tanqueMaior.id)
    .reduce((acc, t) => {
      const hA = Math.min(t.alturaAnel_m ?? 0, h_efetiva);
      const hC = Math.max(0, h_efetiva - hA);
      return acc + (Math.PI / 4) * t.D_m * t.D_m * hC;
    }, 0);

  return {
    V_desl_bases_m3: V_desl_bases,
    V_desl_corpos_m3: V_desl_corpos,
    V_desl_total_m3: V_desl_bases + V_desl_corpos,
    idTanqueMaior: tanqueMaior.id,
  };
}

/**
 * Calcula o volume líquido disponível na bacia (NBR 17505-2 §5.9.2.2.1).
 *
 *   V_liq = L × W × h_efetiva
 *           − Σ_todos(A_base_i × h_anel_i)               ← anéis: todos
 *           − Σ_{j≠maior}(A_tanque_j × (h_ef − h_anel_j)) ← corpos: não-maiores
 *           − V_deslocamentos_outros
 *
 * Onde h_efetiva = alturaTotal − freeboard (mín. 0,20 m).
 *
 * @param L_m                     Comprimento interno da bacia [m]
 * @param W_m                     Largura interna da bacia [m]
 * @param tanques                 Tanques na bacia
 * @param alturaTotal_m           Altura total do dique [m] (inclui freeboard)
 * @param freeboard_m             Sobrealtura [m] (mín. 0,20 m)
 * @param V_deslocamentos_outros_m3  Volume de diques intermediários, tubulações, etc. [m³]
 */
export function calcularVolumeDisponivel(
  L_m: number,
  W_m: number,
  tanques: TanqueBacia[],
  alturaTotal_m: number,
  freeboard_m: number,
  V_deslocamentos_outros_m3 = 0,
): number {
  const fb = Math.max(freeboard_m, FREEBOARD_MINIMO_M);
  const h_efetiva = Math.max(alturaTotal_m - fb, 0);
  const { V_desl_total_m3 } = calcularDeslocamentos(tanques, h_efetiva);
  const V_bruto = L_m * W_m * h_efetiva;
  return Math.max(V_bruto - V_desl_total_m3 - V_deslocamentos_outros_m3, 0);
}

/**
 * Calcula a altura mínima do dique para conter o volume requerido.
 *
 * Fórmula (equação linear em h_efetiva, válida quando h_efetiva > todos os h_anel):
 *
 *   h_efetiva × [L×W − Σ_{j≠maior} A_tanque_j]
 *     = V_req + V_outros + Σ_todos(A_base_i×h_anel_i) − Σ_{j≠maior}(A_tanque_j×h_anel_j)
 *
 *   h_parede = h_efetiva + freeboard
 *
 * Retorna h_parede [m]. Se exceder ALTURA_MAX_DIQUE_M, é necessário ampliar a área.
 *
 * @param V_requerido_m3              Volume mínimo requerido [m³]
 * @param L_m                         Comprimento interno da bacia [m]
 * @param W_m                         Largura interna da bacia [m]
 * @param tanques                     Tanques na bacia
 * @param freeboard_m                 Sobrealtura [m]
 * @param V_deslocamentos_outros_m3   Muretas e outros deslocamentos [m³]
 */
export function calcularAlturaDiqueMinimo(
  V_requerido_m3: number,
  L_m: number,
  W_m: number,
  tanques: TanqueBacia[],
  freeboard_m: number,
  V_deslocamentos_outros_m3 = 0,
): number {
  const fb = Math.max(freeboard_m, FREEBOARD_MINIMO_M);

  if (tanques.length === 0) {
    const A = L_m * W_m;
    return A > 0 ? (V_requerido_m3 + V_deslocamentos_outros_m3) / A + fb : Infinity;
  }

  const tanqueMaior = tanques.reduce((m, t) => t.volume_m3 > m.volume_m3 ? t : m);
  const naoMaiores = tanques.filter(t => t.id !== tanqueMaior.id);

  // Área dos corpos dos não-maiores (reduz a "largura livre" da bacia)
  const A_corpos = naoMaiores.reduce((acc, t) => acc + (Math.PI / 4) * t.D_m * t.D_m, 0);
  const A_ef = L_m * W_m - A_corpos;
  if (A_ef <= 0) return Infinity;

  // Termos constantes (independem de h): anéis de todos os tanques, menos crédito h_anel dos não-maiores
  const V_bases_flat = tanques.reduce((acc, t) => {
    const D = (t.diametroAnel_m && t.diametroAnel_m > t.D_m) ? t.diametroAnel_m : t.D_m;
    return acc + (Math.PI / 4) * D * D * (t.alturaAnel_m ?? 0);
  }, 0);
  const V_corpos_flat = naoMaiores.reduce((acc, t) =>
    acc + (Math.PI / 4) * t.D_m * t.D_m * (t.alturaAnel_m ?? 0), 0);

  const h_efetiva = (V_requerido_m3 + V_deslocamentos_outros_m3 + V_bases_flat - V_corpos_flat) / A_ef;
  return h_efetiva + fb;
}
