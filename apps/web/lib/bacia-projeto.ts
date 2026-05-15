/**
 * Modelo de dados do Projeto Bacia de Contenção — NBR 17505-2:2024.
 *
 * Armazenado na store "calc-bacia" do IndexedDB.
 */

import type { TanqueBacia } from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Modo de cálculo da calculadora
// ---------------------------------------------------------------------------

export type ModoBaciaCalculo = "verificar" | "dimensionar";

// ---------------------------------------------------------------------------
// Muretas intermediárias (sub-diques internos)
// ---------------------------------------------------------------------------

/**
 * Mureta intermediária (dique secundário interno à bacia de contenção).
 * O volume que ocupa é descontado da capacidade líquida da bacia.
 */
export interface MuretaIntermediaria {
  id: string;
  /** Descrição livre, ex.: "Entre TQ-01 e TQ-02" */
  descricao?: string;
  /** Comprimento da mureta [m] */
  comprimento_m: number;
  /** Altura da mureta acima do piso da bacia [m] */
  altura_m: number;
  /** Espessura da mureta [m]. Default: 0,15 m (bloco de concreto típico) */
  espessura_m: number;
}

/** Calcula o volume deslocado por uma mureta: comprimento × altura × espessura [m³] */
export function volumeMureta(m: MuretaIntermediaria): number {
  return m.comprimento_m * m.altura_m * m.espessura_m;
}

/** Soma o volume deslocado por todas as muretas de uma lista [m³] */
export function totalVolumeMuretas(muretas: MuretaIntermediaria[]): number {
  return muretas.reduce((acc, m) => acc + volumeMureta(m), 0);
}

// ---------------------------------------------------------------------------
// Dimensões de bacia existente (modo verificar)
// ---------------------------------------------------------------------------

export interface DimensoesBaciaExistente {
  /** Comprimento interno da bacia [m] */
  comprimento_m: number;
  /** Largura interna da bacia [m] */
  largura_m: number;
  /** Altura total do dique, medida internamente [m] */
  alturaTotal_m: number;
}

// ---------------------------------------------------------------------------
// Projeto
// ---------------------------------------------------------------------------

export interface ProjetoBacia {
  readonly id: string;
  /** Discriminador fixo — sempre "BACIA". */
  readonly tipo: "BACIA";

  // Metadados
  nome: string;
  cliente?: string;
  local?: string;
  pasta: string;
  readonly criadoEm: string;
  atualizadoEm: string;

  // Configuração geral da bacia
  /** Modo de cálculo: "verificar" (bacia existente) ou "dimensionar" (nova bacia) */
  modo: ModoBaciaCalculo;
  /**
   * Sobrealtura (freeboard) [m]. Mínimo: 0,20 m.
   * NBR 17505-2 §5.9.2.2.1: acrescentada à altura calculada da parede do dique.
   */
  freeboard_m: number;
  /**
   * Altura máxima admitida para o dique [m]. Limite normativo: 3,0 m.
   * NBR 17505-2 §5.9.2.2.
   */
  alturaMaxMuro_m: number;
  /** Relação comprimento/largura desejada para nova bacia (default: 1,5) — usado como referência visual */
  relacaoLC: number;
  /** Volume adicional de deslocamentos internos (diques externos, tubulações) [m³] */
  V_deslocamentos_outros_m3: number;
  /** Muretas intermediárias (sub-diques internos) */
  muretasIntermediarias: MuretaIntermediaria[];

  // Tanques
  tanques: TanqueBacia[];

  // Dimensões existentes (modo verificar)
  baciaDims?: DimensoesBaciaExistente;

  observacoes?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function novoBaciaId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `bacia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function criarProjetoBacia(
  parcial?: Partial<Omit<ProjetoBacia, "id" | "tipo" | "criadoEm" | "atualizadoEm">>,
): ProjetoBacia {
  const agora = new Date().toISOString();
  return {
    id: novoBaciaId(),
    tipo: "BACIA",
    nome: parcial?.nome ?? "Nova Bacia de Contenção",
    cliente: parcial?.cliente,
    local: parcial?.local,
    pasta: parcial?.pasta ?? "",
    criadoEm: agora,
    atualizadoEm: agora,
    modo: parcial?.modo ?? "dimensionar",
    freeboard_m: parcial?.freeboard_m ?? 0.2,
    alturaMaxMuro_m: parcial?.alturaMaxMuro_m ?? 3.0,
    relacaoLC: parcial?.relacaoLC ?? 1.5,
    V_deslocamentos_outros_m3: parcial?.V_deslocamentos_outros_m3 ?? 0,
    muretasIntermediarias: parcial?.muretasIntermediarias ?? [],
    tanques: parcial?.tanques ?? [],
    baciaDims: parcial?.baciaDims,
    observacoes: parcial?.observacoes,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cria um novo TanqueBacia com valores default. */
export function criarTanqueBacia(
  parcial?: Partial<Omit<TanqueBacia, "id">>,
): TanqueBacia {
  let id: string;
  try {
    id = crypto.randomUUID();
  } catch {
    id = `tq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const D = parcial?.D_m ?? 10;
  const H = parcial?.H_m ?? 10;
  return {
    id,
    tag: parcial?.tag ?? "TQ-01",
    orientacao: parcial?.orientacao ?? "vertical",
    D_m: D,
    H_m: H,
    volume_m3: parcial?.volume_m3 ?? ((Math.PI / 4) * D * D * H),
    alturaAnel_m: parcial?.alturaAnel_m ?? 0,
  };
}

/** Cria uma nova MuretaIntermediaria com valores default. */
export function criarMuretaIntermediaria(
  parcial?: Partial<Omit<MuretaIntermediaria, "id">>,
): MuretaIntermediaria {
  let id: string;
  try {
    id = crypto.randomUUID();
  } catch {
    id = `mureta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return {
    id,
    descricao: parcial?.descricao ?? "",
    comprimento_m: parcial?.comprimento_m ?? 5,
    altura_m: parcial?.altura_m ?? 1.0,
    espessura_m: parcial?.espessura_m ?? 0.15,
  };
}

/** Recalcula o volume de um tanque vertical: V = π/4 × D² × H */
export function recalcularVolume(tanque: TanqueBacia): number {
  return (Math.PI / 4) * tanque.D_m * tanque.D_m * tanque.H_m;
}
