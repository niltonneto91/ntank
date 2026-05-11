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
