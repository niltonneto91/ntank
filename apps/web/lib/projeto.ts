/**
 * Modelo de dados do Projeto NTANK persistido localmente (IndexedDB).
 *
 * O projeto guarda só o que foi escolhido pelo usuário. Toda a memória
 * de cálculo é recomputada a cada execução (cálculo é determinístico e
 * rápido — < 200 ms para um tanque completo).
 */

export type ModoEntrada = "A" | "B" | "C";

export interface GeometriaProjeto {
  /** "A" = D+H, "B" = volume → sugestões, "C" = volume + restrição. */
  readonly modo: ModoEntrada;
  /** Diâmetro escolhido (m). Pode vir do modo A ou de uma sugestão B/C. */
  D_m: number;
  /** Altura escolhida (m). */
  H_m: number;
  /** Volume desejado (m³) — preenchido nos modos B e C. */
  volumeDesejado_m3?: number;
  /** Restrição usada no modo C: tipo + valor. */
  restricao?: {
    tipo: "H_max_m" | "D_max_m";
    valor: number;
  };
}

export interface ParametrosProjeto {
  /** Densidade relativa do produto (G). */
  G: number;
  /** Sobrespessura de corrosão do COSTADO (mm). */
  CA_mm: number;
  /** Aplicar CA também no fundo? Default false (fundo geralmente fica
   *  preservado pela inundação no costado). */
  aplicarCAFundo?: boolean;
  /** Sobrespessura de corrosão do fundo (mm). Usado se aplicarCAFundo. */
  CA_fundo_mm?: number;
  /** Aplicar CA também no teto? Default false. */
  aplicarCATeto?: boolean;
  /** Sobrespessura de corrosão do teto (mm). */
  CA_teto_mm?: number;
  /** ID do material (ver MATERIAIS em @ntank/calc-core). */
  materialId: string;
  /** Largura da chapa (mm) — 1500 / 1800 / 2000 / 2440 / 2550. */
  larguraChapa_mm: number;
  /** Comprimento da chapa (mm) — 6000 / 12000. */
  comprimentoChapa_mm: number;
  /** Eficiência de junta E. */
  E: number;
  /** Custo do aço (R$/kg) para comparativo. */
  custoAcoPorKg_R$: number;
  /** Custo de mão de obra (R$/kg) — estimativa paramétrica. Default R$ 18/kg. */
  custoMaoDeObraPorKg_R$: number;
  /** Produto armazenado (texto livre — "Etanol", "Diesel S10"…). */
  produto: string;
}

// ===== Bloco 2 — Fundo e teto (Fase 3) =====

export type TipoFundoUI =
  | "plano-com-anel-anular"
  | "conico-centro"
  | "conico-periferia";

export type TipoTetoUI =
  | "conico-autoportante"
  | "conico-suportado"
  | "dome-autoportante";

export interface FundoProjeto {
  tipo: TipoFundoUI;
  /** Largura do anel anular em mm (default 700). */
  larguraAnelAnular_mm?: number;
}

export interface TetoProjeto {
  tipo: TipoTetoUI;
  /** Ângulo do cone com a horizontal (graus) — para tipos cônicos. */
  anguloCone_graus?: number;
  /** Raio do dome (m) — só para dome autoportante. */
  R_dome_m?: number;
  /** Peso da estrutura por m² — só para cônico suportado. */
  pesoEstruturaPorM2_kg?: number;
}

export const FUNDO_DEFAULT: FundoProjeto = {
  tipo: "plano-com-anel-anular",
};

/**
 * Regra NTN: anel anular obrigatório a partir de D ≥ 12 m.
 * Para D < 12 m, o cônico para periferia é mais econômico.
 */
export const D_LIMITE_ANEL_ANULAR_M = 12;

export function fundoDefaultPorD(D_m: number): FundoProjeto {
  return D_m >= D_LIMITE_ANEL_ANULAR_M
    ? { tipo: "plano-com-anel-anular" }
    : { tipo: "conico-periferia" };
}

export const TETO_DEFAULT: TetoProjeto = {
  tipo: "conico-autoportante",
  anguloCone_graus: 15,
};

// ===== Bloco 3 — Bocais (Fase 4) =====

export type ClassePressaoUI = "150#" | "300#";
export type TipoFlangeUI = "WN" | "SO" | "SW" | "BL";
export type FaceFlangeUI = "RF" | "FF" | "RTJ";
export type PosicaoBocalUI = "costado" | "teto";
export type FuncaoBocalUI =
  | "entrada-produto"
  | "saida-produto"
  | "dreno"
  | "vent"
  | "manhole"
  | "instrumentacao"
  | "outro";

export interface BocalProjeto {
  /** ID local (não persistido pela API) — para react keys. */
  id: string;
  tag: string;
  funcao: FuncaoBocalUI;
  posicao: PosicaoBocalUI;
  DN_pol: number;
  classe: ClassePressaoUI;
  tipoFlange: TipoFlangeUI;
  face: FaceFlangeUI;
  /** Para bocais de costado. */
  elevacao_m?: number;
}

export function novoBocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ===== Bloco 4 — Escada, plataformas e guarda-corpos (Fase 5) =====

export type TipoEscadaUI =
  | "helicoidal-externa"
  | "marinheiro-vertical"
  | "nenhuma";

export interface EscadaProjeto {
  tipo: TipoEscadaUI;
  largura_mm?: number;
  anguloHelicoidal_graus?: number;
  /** Passo do pé (mm) — profundidade horizontal do degrau (tread). */
  passoPe_mm?: number;
  comGaiola?: boolean;
}

export interface PlataformaProjeto {
  /** ID local para react keys. */
  id: string;
  /** Identificador (ex.: "PLT-TOPO"). */
  nome: string;
  /** Cota de instalação (m). */
  cota_m: number;
  /** Largura (m). */
  largura_m: number;
  /** Comprimento (m). Vazio = perímetro do tanque. */
  comprimento_m?: number;
  comGuardaCorpo: boolean;
}

export interface AcessoriosProjeto {
  escada: EscadaProjeto;
  plataformas: PlataformaProjeto[];
  guardaCorpoEscada: boolean;
}

export const ACESSORIOS_DEFAULT: AcessoriosProjeto = {
  escada: {
    tipo: "helicoidal-externa",
    largura_mm: 750,
    anguloHelicoidal_graus: 38,
    passoPe_mm: 250,
  },
  plataformas: [],
  guardaCorpoEscada: true,
};

export function novaPlataformaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface ProjetoNTANK {
  readonly id: string;
  /** Nome amigável: "Base BR-Sombrio T-101". */
  nome: string;
  /** Cliente / responsável (opcional). */
  cliente?: string;
  /** Localidade da obra (opcional). */
  local?: string;
  /** Pasta / agrupador (ex.: "Tescan", "Base Sombrio"). */
  pasta?: string;
  /** Responsável técnico (assinatura no PDF). */
  responsavelTecnico?: string;
  /** ISO datetime da criação. */
  readonly criadoEm: string;
  /** ISO datetime da última edição. */
  atualizadoEm: string;
  geometria: GeometriaProjeto;
  parametros: ParametrosProjeto;
  fundo: FundoProjeto;
  teto: TetoProjeto;
  bocais: BocalProjeto[];
  acessorios: AcessoriosProjeto;
  /** Variante escolhida pelo usuário (sobrescreve a recomendação). */
  variantePreferida?: "NBR 7821 Simplificada" | "API 650 1-Foot" | "API 650 VDP";
}

export const PARAMETROS_DEFAULT: ParametrosProjeto = {
  G: 1.0,
  CA_mm: 1.5,
  materialId: "A516-Gr60",
  larguraChapa_mm: 2000,
  comprimentoChapa_mm: 6000,
  E: 0.85,
  custoAcoPorKg_R$: 6.5,
  custoMaoDeObraPorKg_R$: 18.0,
  produto: "",
};

export function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `prj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function criarProjeto(parcial?: Partial<ProjetoNTANK>): ProjetoNTANK {
  const agora = new Date().toISOString();
  return {
    id: novoId(),
    nome: parcial?.nome?.trim() || "Projeto sem nome",
    cliente: parcial?.cliente,
    local: parcial?.local,
    pasta: parcial?.pasta,
    criadoEm: agora,
    atualizadoEm: agora,
    geometria: parcial?.geometria ?? {
      modo: "A",
      D_m: 7.64,
      H_m: 12,
    },
    parametros: { ...PARAMETROS_DEFAULT, ...parcial?.parametros },
    fundo:
      parcial?.fundo ??
      fundoDefaultPorD(parcial?.geometria?.D_m ?? 7.64),
    teto: { ...TETO_DEFAULT, ...parcial?.teto },
    bocais: parcial?.bocais ?? [],
    acessorios: parcial?.acessorios ?? {
      ...ACESSORIOS_DEFAULT,
      escada: { ...ACESSORIOS_DEFAULT.escada },
      plataformas: [...ACESSORIOS_DEFAULT.plataformas],
    },
    variantePreferida: parcial?.variantePreferida,
  };
}

/**
 * Migração: preenche campos novos para projetos persistidos em fases
 * anteriores. Usado pelo loader de IndexedDB para compatibilidade.
 */
export function migrarProjeto(p: ProjetoNTANK): ProjetoNTANK {
  // Renomear passo_mm legado para passoPe_mm
  const escadaLegada = p.acessorios?.escada as
    | (EscadaProjeto & { passo_mm?: number })
    | undefined;
  const escadaMigrada: EscadaProjeto | undefined = escadaLegada
    ? {
        tipo: escadaLegada.tipo,
        largura_mm: escadaLegada.largura_mm,
        anguloHelicoidal_graus: escadaLegada.anguloHelicoidal_graus,
        passoPe_mm:
          escadaLegada.passoPe_mm ??
          escadaLegada.passo_mm ??
          ACESSORIOS_DEFAULT.escada.passoPe_mm,
        comGaiola: escadaLegada.comGaiola,
      }
    : undefined;

  return {
    ...p,
    fundo: p.fundo ?? { ...FUNDO_DEFAULT },
    teto: p.teto ?? { ...TETO_DEFAULT },
    bocais: p.bocais ?? [],
    parametros: {
      ...PARAMETROS_DEFAULT,
      ...p.parametros,
    },
    acessorios: p.acessorios
      ? {
          ...p.acessorios,
          escada: escadaMigrada ?? { ...ACESSORIOS_DEFAULT.escada },
        }
      : {
          ...ACESSORIOS_DEFAULT,
          escada: { ...ACESSORIOS_DEFAULT.escada },
          plataformas: [],
        },
  };
}
