/**
 * Tipos compartilhados pelo núcleo de cálculo do NTANK.
 *
 * Convenções de unidade:
 * - SI internamente — comprimento em metros (m), massa em kg, tensão em MPa.
 * - Espessuras: armazenadas em mm porque é a unidade de trabalho do projetista.
 * - Conversões só acontecem na fronteira da UI ou da CLI.
 */

export type ReferenciaNorma =
  | "API 650"
  | "NBR 7821"
  | "ASME B16.5"
  | "ASME Sec. II Part D"
  | "NR-12"
  | "NR-35";

export interface Material {
  /** Identificador interno (e.g., "A516-Gr70"). */
  readonly id: string;
  /** Especificação ASTM ou equivalente. */
  readonly designacao: string;
  /** Tensão admissível em condição de projeto (MPa). */
  readonly Sd: number;
  /** Tensão admissível em condição de teste hidrostático (MPa). */
  readonly St: number;
  /** Densidade do material (kg/m³). */
  readonly densidade: number;
}

export interface ChapaComercial {
  /** Identificador em polegadas (e.g., "1/2"). */
  readonly polegada: string;
  /** Espessura nominal em mm. */
  readonly espessura: number;
  /** Peso por metro quadrado (kgf/m²) — usado pela planilha NTN. */
  readonly pesoPorM2: number;
}

/**
 * Resultado de cálculo de um item normativo. Esse formato alimenta a memória
 * de cálculo do PDF e a UI — toda função pública do calc-core retorna algo
 * com este shape (ou um wrapper que contém isso).
 */
export interface ResultadoCalculo {
  readonly componente: string;
  readonly metodo: string;
  readonly itemNorma: string;
  readonly formula: string;
  readonly parametros: Record<string, number | string>;
  readonly substituicao: string;
  readonly resultado: { valor: number; unidade: string };
  readonly espessuraAdotada?: { valor: number; unidade: string; justificativa: string };
}

export interface EntradaCostado {
  /** Diâmetro nominal do tanque em mm. */
  readonly D_mm: number;
  /** Altura nominal do tanque em mm. */
  readonly H_mm: number;
  /** Densidade relativa do produto (adimensional, 1,0 = água). */
  readonly G: number;
  /** Sobrespessura de corrosão em mm. */
  readonly CA_mm: number;
  /** Largura da chapa em mm (1500 / 2000 / 2440). */
  readonly larguraChapa_mm: number;
  /** Comprimento da chapa em mm (6000 / 12000). */
  readonly comprimentoChapa_mm: number;
  /** Material das chapas (apenas para 1-Foot e VDP). Default A283-C. */
  readonly material?: Material;
  /** Eficiência de junta E (apenas para 1-Foot e VDP). Default 0,85. */
  readonly E?: number;
}

export interface AnelCostado {
  /** 1-indexed: 1 = anel da base, N = anel do topo. */
  readonly indice: number;
  /** Altura física do anel em mm. */
  readonly altura_mm: number;
  /** Coluna líquida acima da base do anel (em metros), usada na fórmula. */
  readonly H_efetiva_m: number;
  /** Espessura calculada pela fórmula (mm), antes de adoção comercial. */
  readonly e_calc_mm: number;
  /** Chapa comercial selecionada. */
  readonly chapaComercial: ChapaComercial;
  /** Peso do anel (kg). */
  readonly peso_kg: number;
  /** Memória de cálculo da espessura. */
  readonly memoriaCalculo: ResultadoCalculo;
}

export interface ResultadoCostado {
  readonly metodo: "NBR 7821 Simplificada" | "API 650 1-Foot" | "API 650 VDP";
  readonly entrada: EntradaCostado;
  readonly aneis: ReadonlyArray<AnelCostado>;
  readonly numeroAneis: number;
  readonly chapasPorAnel: number;
  readonly pesoTotal_kg: number;
  readonly area_m2: number;
  /** Lista de corte: chapa comercial → quantidade total no costado. */
  readonly listaChapas: ReadonlyArray<{ chapa: ChapaComercial; quantidade: number }>;
}

// =============================================================================
// FUNDO
// =============================================================================

export type TipoFundo =
  | "plano-com-anel-anular"
  | "conico-centro"
  | "conico-periferia";

export interface EntradaFundo {
  /** Diâmetro nominal do tanque em mm. */
  readonly D_mm: number;
  /** Sobrespessura de corrosão em mm. */
  readonly CA_mm: number;
  /** Tipo construtivo do fundo. */
  readonly tipo: TipoFundo;
  /**
   * Espessura adotada da primeira camada do costado (mm), usada para
   * dimensionar o anel anular. Opcional — se ausente, usa-se uma estimativa.
   */
  readonly e_costado_base_mm?: number;
  /** Densidade relativa do produto (G), opcional, default 1,0. */
  readonly G?: number;
  /** Largura desejada do anel anular em mm (default 700). */
  readonly larguraAnelAnular_mm?: number;
}

export interface AnelAnular {
  /** Largura projetada radialmente (mm). */
  readonly largura_mm: number;
  /** Espessura adotada (mm). */
  readonly espessura_mm: number;
  /** Massa do anel anular (kg). */
  readonly peso_kg: number;
  /** Memória de cálculo. */
  readonly memoriaCalculo: ResultadoCalculo;
}

export interface ResultadoFundo {
  readonly tipo: TipoFundo;
  readonly entrada: EntradaFundo;
  /** Espessura calculada do corpo do fundo (sem CA), mm. */
  readonly e_calc_mm: number;
  /** Espessura adotada (chapa comercial >= e_calc + CA), mm. */
  readonly e_adotada_mm: number;
  /** Chapa comercial usada no corpo do fundo. */
  readonly chapaComercial: ChapaComercial;
  /** Área projetada do fundo (m²) — π·D²/4. */
  readonly area_m2: number;
  /** Massa do corpo do fundo (kg). */
  readonly peso_corpo_kg: number;
  /** Anel anular, se aplicável. */
  readonly anelAnular?: AnelAnular;
  /** Massa total (corpo + anel anular). */
  readonly pesoTotal_kg: number;
  /** Memória de cálculo da espessura do corpo. */
  readonly memoriaCalculo: ResultadoCalculo;
}

// =============================================================================
// TETO
// =============================================================================

export type TipoTeto =
  | "conico-autoportante"
  | "conico-suportado"
  | "dome-autoportante";

export interface EntradaTeto {
  /** Diâmetro nominal do tanque em mm. */
  readonly D_mm: number;
  /** Sobrespessura de corrosão em mm. */
  readonly CA_mm: number;
  /** Tipo construtivo do teto. */
  readonly tipo: TipoTeto;
  /** Ângulo do cone com a horizontal (graus) — usado em cônico autoportante. */
  readonly anguloCone_graus?: number;
  /** Raio do dome (m) — usado em dome autoportante. */
  readonly R_dome_m?: number;
  /**
   * Peso estimado da estrutura por m² (kg/m²) — só para cônico suportado.
   * Default 30 kg/m² (vigas radiais + anel central + colunas leves).
   */
  readonly pesoEstruturaPorM2_kg?: number;
  /**
   * Espessura adotada da primeira camada do costado (mm), usada para
   * calcular o diâmetro externo do teto (D_teto = D + 2 × e_costado).
   * Opcional — se ausente, usa-se D nominal.
   */
  readonly e_costado_base_mm?: number;
}

export interface DetalheEstruturaTeto {
  /** Vigas radiais (rafters): número, comprimento, perfil, massa. */
  readonly vigas: {
    readonly quantidade: number;
    readonly comprimento_m: number;
    readonly perfil: string;
    readonly kg_por_m: number;
    readonly massa_kg: number;
  };
  /** Anel central de compressão. */
  readonly anelCentral: {
    readonly diametro_m: number;
    readonly perfil: string;
    readonly kg_por_m: number;
    readonly massa_kg: number;
  };
  /** Colunas internas (vazio se não exigidas). */
  readonly colunas: {
    readonly quantidade: number;
    readonly comprimento_m: number;
    readonly perfil: string;
    readonly kg_por_m: number;
    readonly massa_kg: number;
  };
  /** Massa de conexões e contraventamentos (estimativa percentual). */
  readonly massa_conexoes_kg: number;
}

export interface ResultadoTeto {
  readonly tipo: TipoTeto;
  readonly entrada: EntradaTeto;
  /** Espessura calculada da chapa do teto (mm). */
  readonly e_calc_mm: number;
  /** Espessura adotada (chapa comercial), mm. */
  readonly e_adotada_mm: number;
  /** Chapa comercial usada na cobertura. */
  readonly chapaComercial: ChapaComercial;
  /** Área da superfície do teto (m²). */
  readonly area_m2: number;
  /** Massa da chapa de cobertura (kg). */
  readonly peso_chapa_kg: number;
  /** Massa da estrutura de sustentação (kg) — 0 se autoportante. */
  readonly peso_estrutura_kg: number;
  /** Detalhes da estrutura quando suportado (vigas, anel, colunas, conexões). */
  readonly detalheEstrutura?: DetalheEstruturaTeto;
  /** Massa total (chapa + estrutura). */
  readonly pesoTotal_kg: number;
  /** Memória de cálculo. */
  readonly memoriaCalculo: ResultadoCalculo;
}

// =============================================================================
// ESCADAS, PLATAFORMAS E GUARDA-CORPOS (Fase 5)
// =============================================================================

export type TipoEscada = "helicoidal-externa" | "marinheiro-vertical" | "nenhuma";

export interface EntradaEscada {
  readonly tipo: TipoEscada;
  /** Diâmetro do tanque (mm) — define o raio de instalação. */
  readonly D_mm: number;
  /** Altura total a vencer (mm) — geralmente H do tanque. */
  readonly H_mm: number;
  /** Largura útil do degrau / largura da escada (mm). Default 750. */
  readonly largura_mm?: number;
  /** Ângulo da escada com a horizontal (graus). Só helicoidal. Default 20°. */
  readonly anguloHelicoidal_graus?: number;
  /**
   * Passo do pé (tread) — profundidade horizontal onde o pé apoia, em mm.
   * Default 250 mm.
   *
   * Relaciona-se com a altura entre degraus (riser) e o ângulo θ por:
   *   riser_mm = passoPe_mm × tan(θ)
   *
   * No tipo 'marinheiro-vertical', representa a distância vertical entre
   * travessões (não há ângulo).
   */
  readonly passoPe_mm?: number;
  /** Para marinheiro: instalar gaiola de proteção (NR-35 ≥ 6 m). */
  readonly comGaiola?: boolean;
}

export interface ResultadoEscada {
  readonly tipo: TipoEscada;
  readonly entrada: EntradaEscada;
  /** Comprimento da escada (m) — diagonal para helicoidal, vertical para marinheiro. */
  readonly comprimento_m: number;
  /** Número de degraus. */
  readonly numeroDegraus: number;
  /** Passo do pé adotado (mm) — profundidade horizontal do degrau. */
  readonly passoPe_mm: number;
  /** Altura entre degraus adotada (mm) — derivada do ângulo + passo do pé. */
  readonly alturaDegrau_mm: number;
  /** Massa estimada das longarinas (kg). */
  readonly peso_longarinas_kg: number;
  /** Massa estimada dos degraus (kg). */
  readonly peso_degraus_kg: number;
  /** Massa estimada da gaiola, se aplicável (kg). */
  readonly peso_gaiola_kg: number;
  /** Massa total da escada. */
  readonly pesoTotal_kg: number;
  /** Avisos de não-conformidade NR-12 / NR-35. */
  readonly avisos: ReadonlyArray<string>;
  readonly memoriaCalculo: ResultadoCalculo;
}

export interface EntradaPlataforma {
  /** Identificador (e.g., "PLT-TOPO", "PLT-INT-1"). */
  readonly id: string;
  /** Cota de instalação (m). */
  readonly cota_m: number;
  /** Largura da plataforma (m). Default 1,0. */
  readonly largura_m?: number;
  /** Comprimento útil (m) — default = perímetro do tanque. */
  readonly comprimento_m?: number;
  /** Diâmetro do tanque (mm). */
  readonly D_mm: number;
  /** Massa do piso por m² (kg/m²). Default 37,35 (chapa xadrez 3/16″). */
  readonly pisoKgM2?: number;
  /** Massa da estrutura por m² (kg/m²). Default 35. */
  readonly estruturaKgM2?: number;
  /** Inclui guarda-corpo perimetral? Default true. */
  readonly comGuardaCorpo?: boolean;
}

export interface ResultadoPlataforma {
  readonly entrada: EntradaPlataforma;
  /** Área da plataforma (m²). */
  readonly area_m2: number;
  /** Comprimento útil de guarda-corpo (m). */
  readonly comprimentoGuardaCorpo_m: number;
  /** Massa do piso (kg). */
  readonly peso_piso_kg: number;
  /** Massa da estrutura (kg). */
  readonly peso_estrutura_kg: number;
  /** Massa do guarda-corpo (kg). */
  readonly peso_guardaCorpo_kg: number;
  /** Massa total. */
  readonly pesoTotal_kg: number;
  readonly memoriaCalculo: ResultadoCalculo;
}

export interface ResultadoGuardaCorpo {
  readonly origem: "escada" | "plataforma";
  readonly comprimento_m: number;
  readonly altura_mm: number;
  readonly peso_kg: number;
  readonly memoriaCalculo: ResultadoCalculo;
}

export interface EntradaAcessorios {
  readonly D_mm: number;
  readonly H_mm: number;
  readonly escada: Omit<EntradaEscada, "D_mm" | "H_mm">;
  readonly plataformas: ReadonlyArray<Omit<EntradaPlataforma, "D_mm">>;
  /** Adicionar guarda-corpo ao longo da escada? Default true. */
  readonly guardaCorpoEscada?: boolean;
}

export interface ResultadoAcessorios {
  readonly escada: ResultadoEscada;
  readonly plataformas: ReadonlyArray<ResultadoPlataforma>;
  readonly guardaCorpoEscada?: ResultadoGuardaCorpo;
  readonly pesoTotal_kg: number;
}

// =============================================================================
// TANQUE COMPLETO (agregador)
// =============================================================================

export interface ResultadoTanqueCompleto {
  readonly costado: ResultadoCostado;
  readonly fundo: ResultadoFundo;
  readonly teto: ResultadoTeto;
  /** Bocais calculados (vazio se nenhum bocal foi informado). */
  readonly bocais: ReadonlyArray<import("./bocais.js").ResultadoBocal>;
  /** Massa de todos os bocais (kg) — pescoços + reforços + flanges. */
  readonly pesoBocais_kg: number;
  /** Acessórios (escada + plataformas + guarda-corpos), opcional. */
  readonly acessorios?: ResultadoAcessorios;
  /** Massa total de acessórios (kg). */
  readonly pesoAcessorios_kg: number;
  /** Massa de aço total (costado + fundo + teto + bocais + acessórios). */
  readonly pesoTotal_kg: number;
  /** Custo de aço total a R$/kg parametrizável. */
  readonly custo_R$: number;
}

export interface AvaliacaoChapa {
  readonly D_m: number;
  readonly comprimentoChapa_m: number;
  readonly circunferencia_m: number;
  readonly chapasInteiras: number;
  readonly resto_m: number;
  readonly chapasNecessarias: number;
  /** Aproveitamento: 'otimo' (resto = 0), 'bom' (resto entre 2-4), 'ruim' (caso contrário). */
  readonly classificacao: "otimo" | "bom" | "ruim";
  readonly desperdicio_pct: number;
  /**
   * Descrição construtiva legível:
   *   - "4 × 6 m"           (resto desprezível)
   *   - "3 × 6 m + 1 × 2,5 m" (resto comercializável)
   *   - "3,18 × 6 m"        (resto não-comercial; valor decimal)
   */
  readonly descricao: string;
  /** Comprimento da chapa adicional (m) quando resto é comercializável. 0 caso contrário. */
  readonly chapaAdicional_m: number;
}
