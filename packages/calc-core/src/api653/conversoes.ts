/**
 * Conversões e arredondamentos — módulo API 653.
 */

/** Arredonda para 1 casa decimal */
export const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Arredonda para 2 casas decimais */
export const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Arredonda para 3 casas decimais */
export const round3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Converte MPa → kPa */
export const MPa_para_kPa = (v: number): number => v * 1000;

/** Converte psi → MPa */
export const psi_para_MPa = (v: number): number => v * 0.006894757;

/** mm → m */
export const mm_para_m = (v: number): number => v / 1000;

/** m → mm */
export const m_para_mm = (v: number): number => v * 1000;

/**
 * Calcula a diferença em anos entre duas datas ISO 8601.
 * Retorna null se alguma das datas for inválida.
 */
export function anosEntreDataas(dataAnterior: string, dataAtual: string): number | null {
  const d1 = Date.parse(dataAnterior);
  const d2 = Date.parse(dataAtual);
  if (Number.isNaN(d1) || Number.isNaN(d2)) return null;
  if (d2 <= d1) return null;
  const diffMs = d2 - d1;
  return round2(diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Adiciona N anos a uma data ISO 8601 e retorna a nova data ISO.
 * Retorna null se a data base for inválida.
 */
export function adicionarAnos(dataBase: string, anos: number): string | null {
  const d = Date.parse(dataBase);
  if (Number.isNaN(d) || anos <= 0) return null;
  const resultado = new Date(d + anos * 365.25 * 24 * 60 * 60 * 1000);
  return resultado.toISOString().slice(0, 10);
}
