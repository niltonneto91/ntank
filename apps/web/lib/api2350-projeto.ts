/**
 * Modelo de dados do projeto API 2350 (Prevenção de Transbordamento).
 *
 * Persistido em IndexedDB store "calc-api2350" — separado dos stores
 * "projetos" (API 650) e "calc-api2000".
 *
 * Este módulo NÃO calcula respiros — escopo exclusivo do módulo API 2000.
 */

import type {
  ComponentesTempoAPI2350,
  EntradaEscopoAPI2350,
} from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Re-exportar tipos do calc-core usados nos componentes
// ---------------------------------------------------------------------------
export type {
  CategoriaOPS,
  TipoOPS,
  ComponentesTempoAPI2350,
} from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------

export type NormaContrucao = "API650" | "API620" | "NBR7821" | "UL142" | "outro";

export type TipoInstalacao =
  | "refinaria"
  | "terminal"
  | "base-distribuicao"
  | "terminal-pipeline"
  | "terminal-marketing"
  | "outro";

export type TipoTanqueAPI2350 =
  | "vertical-teto-fixo"
  | "vertical-teto-flutuante-interno"
  | "vertical-teto-flutuante-externo"
  | "horizontal"
  | "outro";

export type ClasseNFPA = "I" | "II" | "IIIA" | "IIIB" | "nao-inflamavel";

export type FonteRecebimento =
  | "duto"
  | "navio"
  | "barcaca"
  | "caminhao"
  | "vagao"
  | "tanque-tanque"
  | "processo"
  | "outro";

export type PresencaOperacional = "plena" | "semi" | "nao-assistida";

// ---------------------------------------------------------------------------
// Sub-estruturas
// ---------------------------------------------------------------------------

export interface EscopoAPI2350 extends EntradaEscopoAPI2350 {
  tipoInstalacao: TipoInstalacao;
}

export interface GeometriaAPI2350 {
  tipoTanque: TipoTanqueAPI2350;
  D_m: number;
  H_total_m: number;
  /** Altura calibrada (útil) do tanque [m] */
  H_util_m: number;
  /** Usar volume/mm manual em vez de fórmula geométrica */
  usarVPorMm: boolean;
  /** Volume por milímetro na zona superior [m³/mm] */
  vPorMm_m3_mm: number | null;

  // --- Limitadores do nível físico máximo ---
  /** Possui câmara de espuma no topo do tanque? */
  temCamaraEspuma: boolean;
  /**
   * Distância da borda inferior da câmara de espuma ao teto interno [m].
   * Esse espaço é descontado de H_total para determinar o nível físico máximo.
   */
  distCamaraEspuma_m: number | null;
  /** Possui selo flutuante interno (IFR)? */
  temSeloFlutuanteInterno: boolean;
  /**
   * Diâmetro da boia do selo flutuante [m].
   * O produto não pode ultrapassar H_total − dist_câmara − diâmetro_boia.
   */
  diametroBoia_m: number | null;
}

// ---------------------------------------------------------------------------
// Configuração para cálculo automático de níveis OPS
// ---------------------------------------------------------------------------

export interface ConfigNiveisAutomaticos {
  /** Modo de definição dos níveis */
  modo: "manual" | "automatico";
  /** Espaço entre H_fisico_max e CH [mm]. Mínimo normativo: 76 mm (3 in). */
  margemCH_mm: number;
  /** Espaço entre HH e MW [mm]. Valor operacional. */
  margemMW_mm: number;
  /**
   * Posição do AOPS acima de HH [mm].
   * null → ponto médio entre HH e CH (padrão).
   */
  margemAOPS_acimadeHH_mm: number | null;
}

export interface ProdutoAPI2350 {
  nome: string;
  classeNFPA: ClasseNFPA;
  densidade_kg_m3: number | null;
  T_operacao_C: number | null;
  inflamavel: boolean;
  toxico: boolean;
  ambientalmenteCritico: boolean;
  tendenciaEspuma: boolean;
  riscoEletroestatica: boolean;
  observacoes: string;
}

export interface OperacaoAPI2350 {
  vazaoMax_m3h: number;
  multiplas_fontes: boolean;
  /** Vazão total simultânea quando há múltiplas fontes [m³/h] */
  vazaoTotal_simultanea_m3h: number | null;
  fontes: FonteRecebimento[];
  /** Existe saída simultânea durante recebimento? (informativo) */
  saidaSimultanea: boolean;
  vazaoSaida_m3h: number | null;
}

export interface TempoRespostaAPI2350 extends ComponentesTempoAPI2350 {
  /** Tempo adotado pelo responsável (deve ser ≥ calculado) [min] */
  tempoAdotado_min: number | null;
  /**
   * Tempo mínimo de resposta exigido para a categoria (API 2350 Annex G).
   * null = não preenchido → usuário deve consultar exemplar licenciado da norma.
   */
  tempoMinimoCategoria_min: number | null;
}

export interface NiveisAPI2350 {
  /** Nível físico máximo (transbordamento real) [m] */
  H_fisico_max_m: number;
  /** Critical High Level [m] */
  CH_m: number;
  /** Nível de atuação do AOPS [m] (se existir) */
  AOPS_m: number | null;
  /** High-High Level (LAHH) [m] */
  HH_m: number;
  /** High Level (alerta opcional) [m] */
  H_m: number | null;
  /** Maximum Working Level [m] */
  MW_m: number;
  /** Nível normal de operação [m] */
  nivelNormal_m: number | null;
  /** Nível inicial antes do recebimento [m] */
  nivelInicial_m: number | null;
}

export interface OpsAPI2350 {
  temAOPS: boolean;
  /** O AOPS encerra efetivamente o recebimento? */
  aopaEncerraRecebimento: boolean;
  /** O AOPS é independente dos instrumentos do MOPS? */
  aopaIndependenteMOPS: boolean;
  elementoFinalAOPS:
    | "valvula-motorizada"
    | "valvula-pneumatica"
    | "bomba"
    | "intertravamento"
    | "desvio"
    | "outro"
    | null;
}

export interface MonitoramentoAPI2350 {
  presencaOperacional: PresencaOperacional;
  temATG: boolean;
  nivelTransmitidoRemoto: boolean;
  temAlarmeH: boolean;
  temAlarmeHH: boolean;
  alarmeHHIndependente: boolean;
  alarmeEnviadoLocalOcupado: boolean;
  temLAHHIndependente: boolean;
  capacidadeEncerrarLocal: boolean;
  capacidadeEncerrarRemoto: boolean;
}

// ---------------------------------------------------------------------------
// Estrutura principal
// ---------------------------------------------------------------------------

export interface ProjetoAPI2350 {
  id: string;
  tipo: "API2350";
  nome: string;
  cliente: string;
  local: string;
  pasta: string;
  criadoEm: string;
  atualizadoEm: string;

  tagTanque: string;
  servico: string;
  responsavelAnalise: string;
  normaContrucao: NormaContrucao;
  observacoes: string;

  escopo: EscopoAPI2350;
  geometria: GeometriaAPI2350;
  produto: ProdutoAPI2350;
  operacao: OperacaoAPI2350;
  tempoResposta: TempoRespostaAPI2350;
  /** Configuração do modo de cálculo de níveis (manual vs automático) */
  configNiveis: ConfigNiveisAutomaticos;
  niveis: NiveisAPI2350;
  ops: OpsAPI2350;
  monitoramento: MonitoramentoAPI2350;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const TEMPO_RESPOSTA_DEFAULT: TempoRespostaAPI2350 = {
  detecao_min: 1,
  validacao_min: 1,
  comunicacao_min: 3,
  decisao_min: 2,
  acaoOperacional_min: 3,
  fechamentoValvula_min: 2,
  paradaBomba_min: 1,
  drenagemLinha_min: 2,
  margemSeguranca_min: 5,
  tempoAdotado_min: null,
  tempoMinimoCategoria_min: null,
};

// ---------------------------------------------------------------------------
// Fábrica
// ---------------------------------------------------------------------------

export function criarProjetoAPI2350(
  parcial?: Partial<
    Pick<ProjetoAPI2350, "nome" | "cliente" | "local" | "pasta" | "tagTanque" | "servico">
  >,
): ProjetoAPI2350 {
  const agora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    tipo: "API2350",
    nome: parcial?.nome ?? "Análise API 2350",
    cliente: parcial?.cliente ?? "",
    local: parcial?.local ?? "",
    pasta: parcial?.pasta ?? "",
    criadoEm: agora,
    atualizadoEm: agora,

    tagTanque: parcial?.tagTanque ?? "TQ-001",
    servico: parcial?.servico ?? "",
    responsavelAnalise: "",
    normaContrucao: "API650",
    observacoes: "",

    escopo: {
      tipoInstalacao: "base-distribuicao",
      produtoClasseI_NFPA: false,
      produtoClasseII_NFPA: true,
      produtoLPG: false,
      produtoLNG: false,
      volumeMaior5000L: true,
      conectadoRecebimento: true,
      exclusivamenteCaminhaoVagao: false,
      tanqueDedicadoAlivio: false,
      cobertoPorOutraPratica: false,
    },

    geometria: {
      tipoTanque: "vertical-teto-fixo",
      D_m: 7.64,
      H_total_m: 12,
      H_util_m: 11.5,
      usarVPorMm: false,
      vPorMm_m3_mm: null,
      temCamaraEspuma: false,
      distCamaraEspuma_m: null,
      temSeloFlutuanteInterno: false,
      diametroBoia_m: null,
    },

    produto: {
      nome: "",
      classeNFPA: "II",
      densidade_kg_m3: null,
      T_operacao_C: 30,
      inflamavel: true,
      toxico: false,
      ambientalmenteCritico: true,
      tendenciaEspuma: false,
      riscoEletroestatica: false,
      observacoes: "",
    },

    operacao: {
      vazaoMax_m3h: 100,
      multiplas_fontes: false,
      vazaoTotal_simultanea_m3h: null,
      fontes: ["duto"],
      saidaSimultanea: false,
      vazaoSaida_m3h: null,
    },

    tempoResposta: { ...TEMPO_RESPOSTA_DEFAULT },

    configNiveis: {
      modo: "automatico",
      margemCH_mm: 200,   // 200 mm entre H_fisico_max e CH (≥76 mm normativo)
      margemMW_mm: 500,   // 500 mm entre HH e MW (operacional)
      margemAOPS_acimadeHH_mm: null, // padrão: ponto médio HH–CH
    },

    niveis: {
      H_fisico_max_m: 11.8,
      CH_m: 11.2,
      AOPS_m: null,
      HH_m: 10.8,
      H_m: null,
      MW_m: 10.0,
      nivelNormal_m: null,
      nivelInicial_m: null,
    },

    ops: {
      temAOPS: false,
      aopaEncerraRecebimento: false,
      aopaIndependenteMOPS: false,
      elementoFinalAOPS: null,
    },

    monitoramento: {
      presencaOperacional: "plena",
      temATG: true,
      nivelTransmitidoRemoto: false,
      temAlarmeH: false,
      temAlarmeHH: true,
      alarmeHHIndependente: false,
      alarmeEnviadoLocalOcupado: false,
      temLAHHIndependente: false,
      capacidadeEncerrarLocal: true,
      capacidadeEncerrarRemoto: false,
    },
  };
}
