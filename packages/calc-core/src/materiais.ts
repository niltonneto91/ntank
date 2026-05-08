/**
 * Tabela inicial de materiais para o NTANK.
 *
 * Valores Sd (tensão admissível em projeto) e St (tensão admissível em
 * teste hidrostático) são típicos da literatura técnica para uso em
 * equivalentes nacionais — confirmar com Nilton na Fase 2.
 *
 * Densidade do aço carbono = 7.850 kg/m³ (valor consagrado).
 */

import type { Material } from "./types.js";

export const DENSIDADE_ACO_CARBONO = 7850; // kg/m³

export const MATERIAIS: Readonly<Record<string, Material>> = {
  "A283-C": {
    id: "A283-C",
    designacao: "ASTM A283 Grade C",
    Sd: 137,
    St: 154,
    densidade: DENSIDADE_ACO_CARBONO,
  },
  A36: {
    id: "A36",
    designacao: "ASTM A36",
    Sd: 160,
    St: 171,
    densidade: DENSIDADE_ACO_CARBONO,
  },
  "A516-Gr60": {
    id: "A516-Gr60",
    designacao: "ASTM A516 Grade 60",
    Sd: 160,
    St: 171,
    densidade: DENSIDADE_ACO_CARBONO,
  },
  "A516-Gr65": {
    id: "A516-Gr65",
    designacao: "ASTM A516 Grade 65",
    Sd: 173,
    St: 195,
    densidade: DENSIDADE_ACO_CARBONO,
  },
  "A516-Gr70": {
    id: "A516-Gr70",
    designacao: "ASTM A516 Grade 70",
    Sd: 188,
    St: 208,
    densidade: DENSIDADE_ACO_CARBONO,
  },
};

export const MATERIAL_DEFAULT: Material = MATERIAIS["A283-C"]!;

export function getMaterial(id: string): Material {
  const m = MATERIAIS[id];
  if (!m) {
    throw new Error(
      `Material desconhecido: "${id}". Disponíveis: ${Object.keys(MATERIAIS).join(", ")}`,
    );
  }
  return m;
}
