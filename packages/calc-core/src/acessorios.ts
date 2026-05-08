/**
 * Cálculo de escadas, plataformas e guarda-corpos.
 *
 * Estimativas paramétricas baseadas em perfis comerciais usuais
 * (defaults conforme ADR 0001 §9):
 *
 *   - Longarinas: UDC 200×75×8 (≈ 23 kg/m)
 *   - Piso de plataforma: chapa xadrez 3/16″ (37,35 kg/m²)
 *   - Estrutura de plataforma: ~35 kg/m² (vigas + apoios)
 *   - Guarda-corpo: tubo Sch 40 1.1/4″, 3 barras (≈ 9 kg/m linear)
 *   - Degraus: chapa xadrez (passo 210 mm, largura 750 mm default)
 *
 * Todas as fórmulas são geometria + densidade — refinar com Nilton
 * contra peso real de projetos NTN executados.
 *
 * Verificações dimensionais NR-12 / NR-35 retornam AVISOS amarelos
 * (não bloqueantes) — o usuário é informado mas pode prosseguir.
 */

import type {
  EntradaAcessorios,
  EntradaEscada,
  EntradaPlataforma,
  ResultadoAcessorios,
  ResultadoEscada,
  ResultadoGuardaCorpo,
  ResultadoPlataforma,
} from "./types.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const PESO_LONGARINA_UDC_200x75_KGM = 23.0; // UDC 200×75×8
const PESO_LONGARINA_MARINHEIRO_KGM = 6.0; // Cantoneira ou FE 75×50×6 (par = 12 kg/m)
const PESO_DEGRAU_CHAPAXADREZ_KGM2 = 37.35;
const PESO_TRAVESSAO_KGM = 4.0; // φ 25 mm aço
const PESO_GAIOLA_KGM = 10.0; // gaiola NR-35
const PESO_GUARDACORPO_KGM = 9.0; // 3 barras Sch 40 1.1/4″
const PISO_KGM2_DEFAULT = 37.35; // chapa xadrez 3/16″
const ESTRUTURA_KGM2_DEFAULT = 35.0;
const ALTURA_GUARDACORPO_MM_DEFAULT = 1100;

const ANGULO_HELICOIDAL_DEFAULT = 20;
const ANGULO_HELICOIDAL_MAX = 50;
const PASSO_PE_DEFAULT_MM = 250; // profundidade horizontal do degrau (tread)
const LARGURA_DEFAULT_MM = 750;
const ALTURA_OBRIGA_GAIOLA_MM = 6000;
const NR12_GUARDACORPO_MIN_MM = 1050;
const NR12_LARGURA_MIN_MM = 600;
const PASSO_PE_MIN_MM = 200;
const PASSO_PE_MAX_MM = 350;
const ALTURA_DEGRAU_MIN_MM = 150;
const ALTURA_DEGRAU_MAX_MM = 300;

// ===========================================================================
// ESCADA
// ===========================================================================

export function calcularEscada(entrada: EntradaEscada): ResultadoEscada {
  if (entrada.tipo === "nenhuma") {
    return resultadoVazio(entrada);
  }
  if (entrada.D_mm <= 0 || entrada.H_mm <= 0) {
    throw new Error(`D e H devem ser positivos. D=${entrada.D_mm}, H=${entrada.H_mm}`);
  }

  const largura_mm = entrada.largura_mm ?? LARGURA_DEFAULT_MM;
  const passoPe_mm = entrada.passoPe_mm ?? PASSO_PE_DEFAULT_MM;
  const H_m = entrada.H_mm / 1000;
  const D_m = entrada.D_mm / 1000;
  const avisos: string[] = [];

  if (largura_mm < NR12_LARGURA_MIN_MM) {
    avisos.push(
      `Largura ${largura_mm} mm < NR-12 mínimo (${NR12_LARGURA_MIN_MM} mm).`,
    );
  }
  if (passoPe_mm < PASSO_PE_MIN_MM || passoPe_mm > PASSO_PE_MAX_MM) {
    avisos.push(
      `Passo do pé ${passoPe_mm} mm fora da faixa ergonômica ` +
        `(${PASSO_PE_MIN_MM}–${PASSO_PE_MAX_MM} mm).`,
    );
  }

  if (entrada.tipo === "helicoidal-externa") {
    const angulo_graus =
      entrada.anguloHelicoidal_graus ?? ANGULO_HELICOIDAL_DEFAULT;
    const angulo_rad = (angulo_graus * Math.PI) / 180;

    if (angulo_graus > ANGULO_HELICOIDAL_MAX) {
      avisos.push(
        `Ângulo ${angulo_graus}° > máximo prático (${ANGULO_HELICOIDAL_MAX}°).`,
      );
    }

    const senTheta = Math.sin(angulo_rad);
    const tanTheta = Math.tan(angulo_rad);
    if (senTheta < 1e-3) {
      throw new Error(`Ângulo da escada inválido: ${angulo_graus}°`);
    }
    // Relação geométrica do degrau na hélice:
    //   altura entre degraus (riser) = passo do pé × tan(θ)
    const alturaDegrau_mm = passoPe_mm * tanTheta;
    if (
      alturaDegrau_mm < ALTURA_DEGRAU_MIN_MM ||
      alturaDegrau_mm > ALTURA_DEGRAU_MAX_MM
    ) {
      avisos.push(
        `Altura entre degraus ${alturaDegrau_mm.toFixed(0)} mm fora da faixa ergonômica ` +
          `(${ALTURA_DEGRAU_MIN_MM}–${ALTURA_DEGRAU_MAX_MM} mm). Ajuste ângulo ou passo do pé.`,
      );
    }
    const comprimento_m = H_m / senTheta;
    const numeroDegraus = Math.ceil(entrada.H_mm / alturaDegrau_mm);

    // 2 longarinas helicoidais.
    const peso_longarinas_kg =
      2 * comprimento_m * PESO_LONGARINA_UDC_200x75_KGM;

    // Cada degrau: largura × passo do pé (área do tread)
    const area_degrau_m2 = (largura_mm / 1000) * (passoPe_mm / 1000);
    const peso_por_degrau_kg = area_degrau_m2 * PESO_DEGRAU_CHAPAXADREZ_KGM2;
    const peso_degraus_kg = numeroDegraus * peso_por_degrau_kg;

    const pesoTotal_kg = peso_longarinas_kg + peso_degraus_kg;

    return {
      tipo: "helicoidal-externa",
      entrada,
      comprimento_m,
      numeroDegraus,
      passoPe_mm,
      alturaDegrau_mm,
      peso_longarinas_kg,
      peso_degraus_kg,
      peso_gaiola_kg: 0,
      pesoTotal_kg,
      avisos,
      memoriaCalculo: {
        componente: "Escada helicoidal externa",
        metodo: "Geometria + perfis comerciais (UDC 200×75 + chapa xadrez)",
        itemNorma: "NR-12",
        formula:
          "altura = passo_pé · tan θ;  L = H / sin θ;  n_deg = H / altura;  M = 2·L·m_long + n_deg·A_deg·ρ_chapa",
        parametros: {
          D_m,
          H_m,
          angulo_graus,
          largura_mm,
          passoPe_mm,
          alturaDegrau_mm: Number(alturaDegrau_mm.toFixed(2)),
          numeroDegraus,
          comprimento_m: Number(comprimento_m.toFixed(3)),
        },
        substituicao:
          `altura = ${passoPe_mm} · tan(${angulo_graus}°) = ${alturaDegrau_mm.toFixed(1)} mm; ` +
          `L = ${H_m.toFixed(2)} / sin(${angulo_graus}°) = ${comprimento_m.toFixed(2)} m; ` +
          `M_long = 2 · ${comprimento_m.toFixed(2)} · ${PESO_LONGARINA_UDC_200x75_KGM} = ${peso_longarinas_kg.toFixed(1)} kg; ` +
          `M_deg = ${numeroDegraus} · ${area_degrau_m2.toFixed(3)} · ${PESO_DEGRAU_CHAPAXADREZ_KGM2} = ${peso_degraus_kg.toFixed(1)} kg`,
        resultado: { valor: pesoTotal_kg, unidade: "kg" },
      },
    };
  }

  // marinheiro-vertical: passoPe representa espaçamento vertical entre travessões
  const comGaiola = entrada.comGaiola ?? entrada.H_mm >= ALTURA_OBRIGA_GAIOLA_MM;
  if (entrada.H_mm >= ALTURA_OBRIGA_GAIOLA_MM && !comGaiola) {
    avisos.push(
      `H ≥ ${ALTURA_OBRIGA_GAIOLA_MM / 1000} m: NR-35 exige gaiola de proteção.`,
    );
  }

  const folga_topo_m = 1.0;
  const comprimento_m = H_m + folga_topo_m;
  const numeroDegraus = Math.ceil(entrada.H_mm / passoPe_mm);

  // 2 longarinas verticais.
  const peso_longarinas_kg = 2 * comprimento_m * PESO_LONGARINA_MARINHEIRO_KGM;
  // Travessões = pequenos cilindros φ 25 mm de comprimento = largura.
  const peso_degraus_kg =
    numeroDegraus * (largura_mm / 1000) * PESO_TRAVESSAO_KGM;
  const peso_gaiola_kg = comGaiola ? comprimento_m * PESO_GAIOLA_KGM : 0;
  const pesoTotal_kg = peso_longarinas_kg + peso_degraus_kg + peso_gaiola_kg;

  return {
    tipo: "marinheiro-vertical",
    entrada,
    comprimento_m,
    numeroDegraus,
    passoPe_mm,
    alturaDegrau_mm: passoPe_mm, // marinheiro: espaçamento vertical = passo
    peso_longarinas_kg,
    peso_degraus_kg,
    peso_gaiola_kg,
    pesoTotal_kg,
    avisos,
    memoriaCalculo: {
      componente: "Escada marinheiro vertical",
      metodo: "Geometria + perfis comerciais",
      itemNorma: "NR-35",
      formula:
        "L = H + 1 m;  M = 2·L·m_long + n_deg·w·m_trav + L·m_gaiola (se aplicável)",
      parametros: {
        D_m,
        H_m,
        largura_mm,
        passoVertical_mm: passoPe_mm,
        comGaiola: comGaiola ? 1 : 0,
        numeroDegraus,
        comprimento_m: Number(comprimento_m.toFixed(3)),
      },
      substituicao:
        `L = ${H_m.toFixed(2)} + 1 = ${comprimento_m.toFixed(2)} m; ` +
        `M_long = 2 · ${comprimento_m.toFixed(2)} · ${PESO_LONGARINA_MARINHEIRO_KGM} = ${peso_longarinas_kg.toFixed(1)} kg; ` +
        `M_trav = ${numeroDegraus} · ${(largura_mm / 1000).toFixed(2)} · ${PESO_TRAVESSAO_KGM} = ${peso_degraus_kg.toFixed(1)} kg; ` +
        `M_gaiola = ${peso_gaiola_kg.toFixed(1)} kg`,
      resultado: { valor: pesoTotal_kg, unidade: "kg" },
    },
  };
}

function resultadoVazio(entrada: EntradaEscada): ResultadoEscada {
  return {
    tipo: "nenhuma",
    entrada,
    comprimento_m: 0,
    numeroDegraus: 0,
    passoPe_mm: 0,
    alturaDegrau_mm: 0,
    peso_longarinas_kg: 0,
    peso_degraus_kg: 0,
    peso_gaiola_kg: 0,
    pesoTotal_kg: 0,
    avisos: [],
    memoriaCalculo: {
      componente: "Escada (nenhuma)",
      metodo: "Sem escada cadastrada",
      itemNorma: "—",
      formula: "—",
      parametros: {},
      substituicao: "—",
      resultado: { valor: 0, unidade: "kg" },
    },
  };
}

// ===========================================================================
// PLATAFORMA
// ===========================================================================

export function calcularPlataforma(
  entrada: EntradaPlataforma,
): ResultadoPlataforma {
  const D_m = entrada.D_mm / 1000;
  const largura_m = entrada.largura_m ?? 1.0;
  const comprimento_m = entrada.comprimento_m ?? Math.PI * D_m;
  const pisoKgM2 = entrada.pisoKgM2 ?? PISO_KGM2_DEFAULT;
  const estruturaKgM2 = entrada.estruturaKgM2 ?? ESTRUTURA_KGM2_DEFAULT;
  const comGuardaCorpo = entrada.comGuardaCorpo ?? true;

  const area_m2 = largura_m * comprimento_m;
  const peso_piso_kg = area_m2 * pisoKgM2;
  const peso_estrutura_kg = area_m2 * estruturaKgM2;

  // Guarda-corpo no perímetro externo (lado afastado do tanque).
  // Aproximação: comprimento + 2 retornos laterais (1 m cada).
  const comprimentoGuardaCorpo_m = comGuardaCorpo
    ? comprimento_m + 2 * largura_m
    : 0;
  const peso_guardaCorpo_kg = comprimentoGuardaCorpo_m * PESO_GUARDACORPO_KGM;

  const pesoTotal_kg = peso_piso_kg + peso_estrutura_kg + peso_guardaCorpo_kg;

  return {
    entrada,
    area_m2,
    comprimentoGuardaCorpo_m,
    peso_piso_kg,
    peso_estrutura_kg,
    peso_guardaCorpo_kg,
    pesoTotal_kg,
    memoriaCalculo: {
      componente: `Plataforma ${entrada.id}`,
      metodo: "Área × kg/m² (piso + estrutura) + guarda-corpo perimetral",
      itemNorma: "NR-12",
      formula: "M = A·(p_piso + p_estrutura) + L_gc·m_gc",
      parametros: {
        cota_m: entrada.cota_m,
        largura_m,
        comprimento_m: Number(comprimento_m.toFixed(3)),
        area_m2: Number(area_m2.toFixed(3)),
        pisoKgM2,
        estruturaKgM2,
        comGuardaCorpo: comGuardaCorpo ? 1 : 0,
      },
      substituicao:
        `A = ${largura_m} · ${comprimento_m.toFixed(2)} = ${area_m2.toFixed(2)} m²; ` +
        `M_piso = ${area_m2.toFixed(2)} · ${pisoKgM2} = ${peso_piso_kg.toFixed(1)} kg; ` +
        `M_estr = ${area_m2.toFixed(2)} · ${estruturaKgM2} = ${peso_estrutura_kg.toFixed(1)} kg; ` +
        `M_gc = ${comprimentoGuardaCorpo_m.toFixed(2)} · ${PESO_GUARDACORPO_KGM} = ${peso_guardaCorpo_kg.toFixed(1)} kg`,
      resultado: { valor: pesoTotal_kg, unidade: "kg" },
    },
  };
}

// ===========================================================================
// GUARDA-CORPO LINEAR (sobre escada ou trecho avulso)
// ===========================================================================

export function calcularGuardaCorpoEscada(
  comprimento_m: number,
  altura_mm: number = ALTURA_GUARDACORPO_MM_DEFAULT,
): ResultadoGuardaCorpo {
  const peso_kg = comprimento_m * PESO_GUARDACORPO_KGM;
  const avisoNR12 =
    altura_mm < NR12_GUARDACORPO_MIN_MM
      ? ` (⚠ NR-12: altura ≥ ${NR12_GUARDACORPO_MIN_MM} mm)`
      : "";
  return {
    origem: "escada",
    comprimento_m,
    altura_mm,
    peso_kg,
    memoriaCalculo: {
      componente: "Guarda-corpo da escada",
      metodo: "Tubo Sch 40 1.1/4″ × 3 barras (NR-12)",
      itemNorma: "NR-12",
      formula: "M = L · m_gc",
      parametros: { comprimento_m, altura_mm, m_gc_kgm: PESO_GUARDACORPO_KGM },
      substituicao: `M = ${comprimento_m.toFixed(2)} · ${PESO_GUARDACORPO_KGM} = ${peso_kg.toFixed(1)} kg${avisoNR12}`,
      resultado: { valor: peso_kg, unidade: "kg" },
    },
  };
}

// ===========================================================================
// AGREGADOR
// ===========================================================================

export function calcularAcessorios(
  entrada: EntradaAcessorios,
): ResultadoAcessorios {
  const escada = calcularEscada({
    ...entrada.escada,
    D_mm: entrada.D_mm,
    H_mm: entrada.H_mm,
  });

  const plataformas = entrada.plataformas.map((p) =>
    calcularPlataforma({ ...p, D_mm: entrada.D_mm }),
  );

  let guardaCorpoEscada: ResultadoGuardaCorpo | undefined;
  if (
    (entrada.guardaCorpoEscada ?? true) &&
    escada.tipo !== "nenhuma" &&
    escada.comprimento_m > 0
  ) {
    guardaCorpoEscada = calcularGuardaCorpoEscada(escada.comprimento_m);
  }

  const pesoTotal_kg =
    escada.pesoTotal_kg +
    plataformas.reduce((s, p) => s + p.pesoTotal_kg, 0) +
    (guardaCorpoEscada?.peso_kg ?? 0);

  return {
    escada,
    plataformas,
    guardaCorpoEscada,
    pesoTotal_kg,
  };
}
