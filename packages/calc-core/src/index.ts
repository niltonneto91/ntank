/**
 * Núcleo de cálculo do NTANK.
 *
 * Pacote 100% TypeScript puro — sem dependências de DOM, sem efeito colateral.
 * Pode rodar no Node, no navegador ou em React Native.
 *
 * Filosofia: cada função pública recebe um objeto de entrada validado e
 * retorna um objeto com o resultado E a memória de cálculo (fórmula,
 * substituição, item normativo). Isso alimenta tanto a UI quanto o PDF.
 */

export type {
  AnelAnular,
  AnelCostado,
  AvaliacaoChapa,
  ChapaComercial,
  EntradaCostado,
  EntradaFundo,
  EntradaTeto,
  Material,
  ResultadoCalculo,
  ResultadoCostado,
  ResultadoFundo,
  ResultadoTanqueCompleto,
  ResultadoTeto,
  TipoFundo,
  TipoTeto,
} from "./types.js";

export {
  CHAPAS_COMERCIAIS,
  CHAPA_MAIS_FINA,
  CHAPA_MAIS_GROSSA,
  selecionarChapaComercial,
  avaliarAproveitamentoChapa,
  sugerirGeometriasPorVolume,
} from "./chapas.js";

export type { SugestaoGeometria } from "./chapas.js";

export {
  MATERIAIS,
  MATERIAL_DEFAULT,
  DENSIDADE_ACO_CARBONO,
  getMaterial,
} from "./materiais.js";

export {
  FAIXAS_ESPESSURA_MINIMA,
  espessuraMinimaNominal,
} from "./espessura-minima.js";

export {
  calcularCostadoNBR7821,
  calcularCostadoOneFoot,
  calcularCostadoVDP,
  compararCostado,
  particionarAneis,
} from "./costado/index.js";

export type {
  ComparativoCostado,
  VarianteCostado,
} from "./costado/index.js";

export type { ResultadoCostadoOneFoot } from "./costado/one-foot.js";
export type { ResultadoCostadoVDP } from "./costado/vdp.js";

// === Fase 3 ===
export { calcularFundo } from "./fundo.js";

export {
  calcularTeto,
  calcularTetoConicoAutoportante,
  calcularTetoConicoSuportado,
  calcularTetoDomeAutoportante,
} from "./teto/index.js";

export {
  calcularTanqueCompleto,
} from "./tanque.js";
export type {
  EntradaTanqueCompleto,
  MetodoCostado,
} from "./tanque.js";

// === Fase 4 — Bocais e flanges ===
export {
  calcularFlange,
  FATOR_MASSA_FACE,
  FATOR_MASSA_TIPO,
  FLANGES_B16_5,
  listarDNsDisponiveis,
} from "./flanges.js";

export type {
  ClassePressao,
  DimensaoFlange,
  FaceFlange,
  FlangeSelecao,
  ResultadoFlange,
  TipoFlange,
} from "./flanges.js";

export {
  calcularBocal,
  sugerirBocaisMinimos,
} from "./bocais.js";

export type {
  BocalSugerido,
  EntradaBocal,
  FuncaoBocal,
  MetodoReforco,
  OpcoesBocal,
  PosicaoBocal,
  ResultadoBocal,
  ResultadoReforco,
} from "./bocais.js";

// === Soldagem, Pintura e Lista de Materiais ===
export { calcularSoldagem, PROCESSOS_SOLDAGEM } from "./soldagem.js";
export type {
  ComponenteSoldagem,
  ConsumivelSoldagem,
  EntradaSoldagem,
  JuntaSoldagem,
  ProcessoSoldagem,
  ResultadoSoldagem,
} from "./soldagem.js";

export { calcularPintura, CONFIG_PINTURA_DEFAULT } from "./pintura.js";
export type {
  ConfigDemao,
  ConfigPintura,
  EntradaPintura,
  ResultadoDemao,
  ResultadoPintura,
} from "./pintura.js";

export { calcularListaMateriais } from "./lista-materiais.js";
export type {
  EntradaListaMateriais,
  ItemListaMateriais,
  ListaMateriais,
} from "./lista-materiais.js";

// === API 2000 — Ventilação de Tanques ===
export {
  calcularRespiroNormal,
  calcularTermico,
  calcularEmergenciaFogo,
  verificarDispositivo,
  calcularAreaMolhadaVertical,
  nm3hParaScfh,
  scfhParaNm3h,
  fatorCorrecaoTemperatura,
  kPaParaMbar,
  kPaParaMmca,
  kPaParaOzIn2,
  FATOR_NM3H_PARA_SCFH,
} from "./api2000/index.js";

export type {
  AlertaVentilacao,
  ClasseLiquidoAPI2000,
  DispositivoAlivioAPI2000,
  EntradaAreaMolhada,
  EntradaEmergenciaFogo,
  EntradaRespiroNormal,
  EntradaTermico,
  ModoEntradaEmergencia,
  NivelAlerta,
  ResultadoAreaMolhada,
  ResultadoEmergenciaFogo,
  ResultadoRespiroNormal,
  ResultadoTermico,
  StatusDispositivo,
  TipoDispositivo,
  TipoTanqueAPI2000,
  VerificacaoDispositivo,
} from "./api2000/index.js";

// === API 2350 — Prevenção de Transbordamento ===
export {
  // Cálculos
  verificarEscopoAPI2350,
  calcularTaxaSubidaNivel,
  calcularAlturaFisicaMaxima,
  calcularNiveisOPS,
  calcularTempoRespostaAPI2350,
  calcularVolumeRespostaAPI2350,
  verificarNiveisAPI2350,
  classificarCategoriaOPS,
  // Conversões API 2350
  IN_PARA_MM,
  M_PARA_IN,
  M3_PARA_BBL,
  M3_PARA_L,
  L_para_m3,
  m3_para_L,
  m3_para_bbl,
  m_para_mm,
  mm_para_m,
  m_para_in,
  mm_para_in,
  mmMin_para_inH,
  mmMin_para_mmH,
  m3h_para_gpm,
  min_para_h,
  round1,
  round2,
  round3,
} from "./api2350/index.js";

export type {
  AlertaAPI2350,
  CategoriaOPS,
  ComponentesTempoAPI2350,
  EntradaCategoriaAPI2350,
  EntradaEscopoAPI2350,
  EntradaNiveisAPI2350,
  EntradaTaxaSubidaAPI2350,
  EntradaVolumeRespostaAPI2350,
  NivelAlertaAPI2350,
  ResultadoCategoriaAPI2350,
  ResultadoEscopoAPI2350,
  ResultadoNiveisAPI2350,
  ResultadoTaxaSubidaAPI2350,
  ResultadoTempoRespostaAPI2350,
  ResultadoVolumeRespostaAPI2350,
  ResultadoEscopo,
  StatusVerificacao,
  TipoOPS,
  EntradaGeometriaFisicaAPI2350,
  ResultadoGeometriaFisicaAPI2350,
  EntradaCalculoNiveisOPS,
  ResultadoCalculoNiveisOPS,
} from "./api2350/index.js";

// === API 653 — Inspeção e Vida Útil de Tanques ===
export {
  calcularMASTCurso,
  calcularMASTTodosCursos,
  calcularTaxaCorrosao,
  calcularTaxasCursos,
  calcularCRMultiHistorico,
  avaliarCostado,
  calcularMAOLL,
  avaliarFundo,
  T_MIN_FUNDO_MM,
  T_MIN_ANELAR_MM,
  avaliarTeto,
  T_MIN_TETO_MM,
  calcularProximaInspecao,
} from "./api653/index.js";

export type {
  StatusCurso,
  MetodologiaInspecao,
  TipoCorrosao,
  NivelAlertaAPI653,
  AlertaAPI653,
  MedicaoHistorica,
  CursoMedido,
  EntradaMASTCurso,
  ResultadoMASTCurso,
  EntradaVerificacaoCurso,
  ResultadoVerificacaoCurso,
  EntradaAvaliacaoCostado,
  ResultadoAvaliacaoCostado,
  ResultadoMAOLL,
  FundoMedido,
  ResultadoAvaliacaoFundo,
  TetoMedido,
  ResultadoAvaliacaoTeto,
  ResultadoProximaInspecao,
  ResultadoTaxaCorrosao,
} from "./api653/index.js";

// === Fase 5 — Escadas, plataformas e guarda-corpos ===
export {
  calcularAcessorios,
  calcularEscada,
  calcularGuardaCorpoEscada,
  calcularPlataforma,
} from "./acessorios.js";

export type {
  EntradaAcessorios,
  EntradaEscada,
  EntradaPlataforma,
  ResultadoAcessorios,
  ResultadoEscada,
  ResultadoGuardaCorpo,
  ResultadoPlataforma,
  TipoEscada,
} from "./types.js";
