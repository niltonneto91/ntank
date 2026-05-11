/**
 * Tipos do módulo API 2350 — Overfill Prevention for Storage Tanks.
 *
 * API Standard 2350, 5th Edition, 2020.
 *
 * Este módulo NÃO calcula respiros (escopo do módulo API 2000).
 * Calcula níveis de prevenção de transbordamento, tempos de resposta,
 * volume de resposta, categoria OPS e conformidade normativa.
 */

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type ResultadoEscopo = "dentro" | "fora" | "requer-avaliacao";
export type NivelAlertaAPI2350 = "CRITICO" | "ALERTA" | "INFO" | "AVISO_LEGAL";
export type StatusVerificacao = "APROVADO" | "REPROVADO" | "INDETERMINADO";
export type CategoriaOPS = 0 | 1 | 2 | 3;
export type TipoOPS = "MOPS" | "AOPS" | "MOPS+AOPS";

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export interface AlertaAPI2350 {
  code: string;
  nivel: NivelAlertaAPI2350;
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Escopo
// ---------------------------------------------------------------------------

export interface EntradaEscopoAPI2350 {
  produtoClasseI_NFPA: boolean;
  produtoClasseII_NFPA: boolean;
  produtoLPG: boolean;
  produtoLNG: boolean;
  volumeMaior5000L: boolean;
  conectadoRecebimento: boolean;
  exclusivamenteCaminhaoVagao: boolean;
  tanqueDedicadoAlivio: boolean;
  cobertoPorOutraPratica: boolean;
}

export interface ResultadoEscopoAPI2350 {
  resultado: ResultadoEscopo;
  motivos: string[];
  alertas: AlertaAPI2350[];
}

// ---------------------------------------------------------------------------
// Geometria / taxa de subida
// ---------------------------------------------------------------------------

export interface EntradaTaxaSubidaAPI2350 {
  D_m: number;
  H_util_m: number;
  vazaoMax_m3h: number;
  /** Volume por milímetro na zona superior [m³/mm] — substitui o geométrico */
  vPorMm_m3_mm?: number | null;
}

export interface ResultadoTaxaSubidaAPI2350 {
  A_m2: number;
  taxaSubida_mm_min: number;
  taxaSubida_mm_h: number;
  taxaSubida_in_h: number;
  metodo: "geometrico" | "manual-v-por-mm";
  formula: string;
  referenciaNormativa: string;
}

// ---------------------------------------------------------------------------
// Tempo de resposta
// ---------------------------------------------------------------------------

export interface ComponentesTempoAPI2350 {
  /** Tempo para detectar condição de nível alto [min] */
  detecao_min: number;
  /** Tempo para validar o alarme [min] */
  validacao_min: number;
  /** Tempo para comunicar transportador/CCO [min] */
  comunicacao_min: number;
  /** Tempo para decidir e iniciar ação de parada [min] */
  decisao_min: number;
  /** Tempo para o operador alcançar o controle / ação operacional [min] */
  acaoOperacional_min: number;
  /** Tempo de fechamento de válvula [min] */
  fechamentoValvula_min: number;
  /** Tempo de parada de bomba [min] */
  paradaBomba_min: number;
  /** Drenagem/retorno de linha após parada [min] */
  drenagemLinha_min: number;
  /** Margem de segurança adicional [min] */
  margemSeguranca_min: number;
}

export interface ResultadoTempoRespostaAPI2350 {
  total_calculado_min: number;
  total_adotado_min: number;
  componentes: ComponentesTempoAPI2350;
  alertas: AlertaAPI2350[];
}

// ---------------------------------------------------------------------------
// Volume de resposta
// ---------------------------------------------------------------------------

export interface EntradaVolumeRespostaAPI2350 {
  Q_efetiva_m3h: number;
  tempo_adotado_min: number;
}

export interface ResultadoVolumeRespostaAPI2350 {
  volume_m3: number;
  volume_L: number;
  volume_bbl: number;
  formula: string;
}

// ---------------------------------------------------------------------------
// Verificação de níveis
// ---------------------------------------------------------------------------

export interface EntradaNiveisAPI2350 {
  /** Nível físico máximo (ponto de transbordamento real) [m] */
  H_fisico_max_m: number;
  /** Critical High Level [m] */
  CH_m: number;
  /** Nível de atuação do AOPS [m] — pode ser igual ao HH ou acima */
  AOPS_m?: number | null;
  /** High-High Level (LAHH) [m] */
  HH_m: number;
  /** High Level (opcional) [m] */
  H_m?: number | null;
  /** Maximum Working Level [m] */
  MW_m: number;
  /** Área transversal da seção do tanque [m²] */
  A_m2: number;
  /** Volume de resposta requerido [m³] */
  volume_resposta_m3: number;
  /** Tanque possui AOPS? */
  temAOPS: boolean;
}

export interface ResultadoNiveisAPI2350 {
  // Distâncias disponíveis
  distancia_CH_HH_mm: number;
  distancia_HH_MW_mm: number;
  distancia_CH_fisico_mm: number;

  // Distâncias requeridas
  distancia_requerida_mm: number;
  distancia_minima_normativa_mm: 76;
  distancia_efetiva_minima_mm: number;   // max(76, requerida)

  // Tempo disponível entre HH e CH
  tempo_disponivel_HH_CH_min: number;

  // Status individuais
  status_distancia_HH_CH: StatusVerificacao;
  status_MW_abaixo_HH: StatusVerificacao;
  status_AOPS: StatusVerificacao | null;
  status_CH_abaixo_fisico: StatusVerificacao;

  alertas: AlertaAPI2350[];
}

// ---------------------------------------------------------------------------
// Categoria e OPS
// ---------------------------------------------------------------------------

export interface EntradaCategoriaAPI2350 {
  temATG: boolean;
  nivelTransmitidoRemoto: boolean;
  alarmeHHTransmitidoLocalOcupado: boolean;
  temLAHHIndependente: boolean;
  presencaOperacional: "plena" | "semi" | "nao-assistida";
  capacidadeEncerrarRemoto: boolean;
  temAOPS: boolean;
}

export interface ResultadoCategoriaAPI2350 {
  categoria: CategoriaOPS;
  tipoOPS: TipoOPS;
  justificativa: string;
  requisitosAtendidos: string[];
  requisitosNaoAtendidos: string[];
  alertas: AlertaAPI2350[];
}
