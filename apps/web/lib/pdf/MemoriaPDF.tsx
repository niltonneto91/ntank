/**
 * Memória de cálculo NTANK em PDF.
 *
 * Layout segue identidade NTN/NTANK:
 *   - Capa preta com verde NTN (#ADD91C) e logo
 *   - Cabeçalho/rodapé verde em todas as páginas
 *   - Tipografia Helvetica (built-in do PDF) — substitui Exo 2
 *   - Cores tabulares e enxutas para garantir leitura em A4
 *
 * IMPORTANTE: o documento NÃO reproduz texto, tabelas nem figuras
 * das normas (API 650, NBR 7821, ASME B16.5, NR-12, NR-35).
 * Apenas cita item/seção e implementa fórmulas matemáticas
 * (que não têm copyright).
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  calcularListaMateriais,
  calcularSoldagem,
  calcularPintura,
  PROCESSOS_SOLDAGEM,
} from "@ntank/calc-core";
import type {
  ResultadoCalculo,
  ResultadoTanqueCompleto,
} from "@ntank/calc-core";
import type { ProjetoNTANK } from "@/lib/projeto";
import { SOLDAGEM_DEFAULT, PINTURA_DEFAULT } from "@/lib/projeto";

const VERDE = "#ADD91C";
const PRETO = "#0A0A0A";
const CARBONO_700 = "#262626";
const CARBONO_500 = "#525252";
const CARBONO_300 = "#A3A3A3";
const CARBONO_100 = "#E5E5E5";
const CREME = "#ECECE3";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: PRETO,
    lineHeight: 1.45,
  },
  pageCapa: {
    backgroundColor: PRETO,
    color: "#FFFFFF",
    padding: 0,
    fontFamily: "Helvetica",
  },
  capaTopo: {
    backgroundColor: VERDE,
    height: 8,
  },
  capaCorpo: {
    flex: 1,
    paddingHorizontal: 50,
    paddingTop: 80,
    paddingBottom: 60,
    color: "#FFFFFF",
  },
  capaLogoLinha: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  capaLogo: {
    width: 60,
    height: 60,
    marginRight: 14,
  },
  capaMarca: {
    fontFamily: "Helvetica-Bold",
    fontSize: 36,
    letterSpacing: -1,
  },
  capaMarcaVerde: {
    color: VERDE,
  },
  capaTituloDoc: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    marginTop: 100,
    color: "#FFFFFF",
    lineHeight: 1.2,
  },
  capaSub: {
    fontSize: 13,
    marginTop: 8,
    color: CARBONO_300,
  },
  capaProjeto: {
    marginTop: 60,
    paddingTop: 18,
    borderTopColor: VERDE,
    borderTopWidth: 1,
  },
  capaProjLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: VERDE,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  capaProjNome: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    marginBottom: 18,
  },
  capaProjLinha: {
    flexDirection: "row",
    marginBottom: 6,
  },
  capaProjChave: {
    width: 90,
    fontSize: 9,
    color: CARBONO_300,
  },
  capaProjValor: {
    flex: 1,
    fontSize: 10,
  },
  capaRodape: {
    backgroundColor: VERDE,
    color: PRETO,
    paddingVertical: 10,
    paddingHorizontal: 50,
    fontSize: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Demais páginas
  cabecalho: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomColor: VERDE,
    borderBottomWidth: 2,
  },
  cabecalhoMarca: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: PRETO,
  },
  cabecalhoMarcaVerde: { color: VERDE },
  cabecalhoProjeto: {
    fontSize: 8,
    color: CARBONO_500,
    textAlign: "right",
  },
  rodape: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: CARBONO_500,
    paddingTop: 6,
    borderTopColor: CARBONO_100,
    borderTopWidth: 1,
  },
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: PRETO,
    marginBottom: 4,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: PRETO,
    marginTop: 14,
    marginBottom: 6,
    borderBottomColor: VERDE,
    borderBottomWidth: 1,
    paddingBottom: 3,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: CARBONO_700,
    marginTop: 8,
    marginBottom: 4,
  },
  paragrafo: { marginBottom: 6 },
  destaque: { fontFamily: "Helvetica-Bold" },

  // Sumário
  sumarioLinha: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomColor: CARBONO_100,
    borderBottomWidth: 1,
  },
  sumarioNum: {
    width: 30,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
  },
  sumarioTitulo: {
    flex: 1,
  },

  // KV (key-value lista)
  kvBox: {
    backgroundColor: CREME,
    padding: 8,
    marginBottom: 6,
    borderRadius: 2,
  },
  kvLinha: {
    flexDirection: "row",
    paddingVertical: 1.5,
  },
  kvChave: {
    width: 130,
    color: CARBONO_500,
  },
  kvValor: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },

  // Tabela
  tabela: {
    borderTopColor: PRETO,
    borderTopWidth: 1,
    borderBottomColor: PRETO,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tabelaHeader: {
    flexDirection: "row",
    backgroundColor: PRETO,
    color: VERDE,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tabelaLinha: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomColor: CARBONO_100,
    borderBottomWidth: 0.5,
  },
  tabelaLinhaAlt: { backgroundColor: CREME },
  td: { fontSize: 8 },
  tdNum: { fontSize: 8, textAlign: "right" },

  // Memória de cálculo (caixa código-like)
  memoriaBox: {
    backgroundColor: CREME,
    padding: 8,
    marginVertical: 6,
    fontSize: 8,
    fontFamily: "Courier",
    color: CARBONO_700,
    borderLeftColor: VERDE,
    borderLeftWidth: 3,
  },
  itemNorma: {
    backgroundColor: PRETO,
    color: VERDE,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    alignSelf: "flex-start",
    marginBottom: 4,
  },

  // Resumo final destacado
  destaqueBox: {
    backgroundColor: VERDE,
    padding: 14,
    marginTop: 10,
  },
  destaqueLabel: {
    fontSize: 8,
    color: PRETO,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  destaqueValor: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: PRETO,
    marginTop: 2,
  },

  // Avisos
  avisoBox: {
    backgroundColor: "#FFFBEB",
    borderLeftColor: "#F59E0B",
    borderLeftWidth: 3,
    padding: 6,
    marginVertical: 4,
    fontSize: 8,
  },
});

// Formatadores PT-BR (compatíveis com a UI)
const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});
const fmtNum = (v: number, c = 2) =>
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: c,
    maximumFractionDigits: c,
  });
const fmtDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

interface MemoriaPDFProps {
  projeto: ProjetoNTANK;
  resultado: ResultadoTanqueCompleto;
  variante: string;
  responsavel?: string;
  /** URL absoluta ou data URL do logo NTANK. Opcional. */
  logoUrl?: string;
}

const Cabecalho = ({ projeto }: { projeto: ProjetoNTANK }) => (
  <View style={styles.cabecalho} fixed>
    <Text style={styles.cabecalhoMarca}>
      <Text style={styles.cabecalhoMarcaVerde}>N</Text>TANK
    </Text>
    <Text style={styles.cabecalhoProjeto}>
      {projeto.nome}
      {projeto.cliente ? `  ·  ${projeto.cliente}` : ""}
    </Text>
  </View>
);

const Rodape = () => (
  <View style={styles.rodape} fixed>
    <Text>Powered by NTN ENGENHARIA · NTANK · Memória de Cálculo</Text>
    <Text
      render={({ pageNumber, totalPages }) =>
        `Página ${pageNumber} / ${totalPages}`
      }
    />
  </View>
);

const KV = ({ kv }: { kv: ReadonlyArray<readonly [string, string]> }) => (
  <View style={styles.kvBox}>
    {kv.map(([k, v]) => (
      <View key={k} style={styles.kvLinha}>
        <Text style={styles.kvChave}>{k}</Text>
        <Text style={styles.kvValor}>{v}</Text>
      </View>
    ))}
  </View>
);

const Memoria = ({ memoria }: { memoria: ResultadoCalculo }) => (
  <View>
    <Text style={styles.itemNorma}>{memoria.itemNorma}</Text>
    <View style={styles.memoriaBox}>
      <Text>
        <Text style={styles.destaque}>Método: </Text>
        {memoria.metodo}
      </Text>
      <Text>
        <Text style={styles.destaque}>Fórmula: </Text>
        {memoria.formula}
      </Text>
      <Text>
        <Text style={styles.destaque}>Substituição: </Text>
        {memoria.substituicao}
      </Text>
      <Text>
        <Text style={styles.destaque}>Resultado: </Text>
        {fmtNum(memoria.resultado.valor, 3)} {memoria.resultado.unidade}
      </Text>
      {memoria.espessuraAdotada && (
        <Text>
          <Text style={styles.destaque}>Espessura adotada: </Text>
          {fmtNum(memoria.espessuraAdotada.valor, 2)}{" "}
          {memoria.espessuraAdotada.unidade} —{" "}
          {memoria.espessuraAdotada.justificativa}
        </Text>
      )}
    </View>
  </View>
);

export function MemoriaPDF({
  projeto,
  resultado,
  variante,
  responsavel,
  logoUrl,
}: MemoriaPDFProps) {
  const D_m = projeto.geometria.D_m;
  const H_m = projeto.geometria.H_m;
  const volume_m3 = (Math.PI * D_m * D_m * H_m) / 4;

  // ── Dados para os Anexos ────────────────────────────────────────────────────
  const _p  = projeto.parametros;
  const _fd = projeto.fundoDuplo;
  const _s  = projeto.soldagem  ?? SOLDAGEM_DEFAULT;
  const _pin = projeto.pintura  ?? PINTURA_DEFAULT;

  const listaMateriais = calcularListaMateriais({
    resultado,
    larguraChapaFundo_mm:           _p.larguraChapaFundo_mm,
    comprimentoChapaFundo_mm:       _p.comprimentoChapaFundo_mm,
    larguraChapaTeto_mm:            _p.larguraChapaTeto_mm,
    comprimentoChapaTeto_mm:        _p.comprimentoChapaTeto_mm,
    fundoDuploAtivo:                _fd?.ativo ?? false,
    larguraChapaFundoDuplo_mm:      _fd?.larguraChapa_mm,
    comprimentoChapaFundoDuplo_mm:  _fd?.comprimentoChapa_mm,
    CA_fundoDuplo_mm:               _fd?.CA_mm,
  });

  const resultadoSoldagem = calcularSoldagem({
    resultado,
    larguraChapaFundo_mm:     _p.larguraChapaFundo_mm,
    comprimentoChapaFundo_mm: _p.comprimentoChapaFundo_mm,
    larguraChapaTeto_mm:      _p.larguraChapaTeto_mm,
    comprimentoChapaTeto_mm:  _p.comprimentoChapaTeto_mm,
    processos: {
      costado:    _s.processoCostado,
      fundo:      _s.processoFundo,
      teto:       _s.processoTeto,
      acessorios: _s.processoAcessorios,
    },
  });

  const resultadoPintura = calcularPintura({
    resultado,
    config: {
      plano:         _pin.plano,
      primer:        _pin.primer,
      intermediario: _pin.intermediario,
      acabamento:    _pin.acabamento,
    },
  });

  return (
    <Document
      title={`NTANK · ${projeto.nome}`}
      author="NTN Engenharia"
      subject="Memória de cálculo de tanque vertical cilíndrico"
      keywords="API 650, NBR 7821, NTN, tanque, calculadora"
    >
      {/* ============================== CAPA ============================== */}
      <Page size="A4" style={styles.pageCapa}>
        <View style={styles.capaTopo} />
        <View style={styles.capaCorpo}>
          <View style={styles.capaLogoLinha}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.capaLogo} />
            ) : null}
            <Text style={styles.capaMarca}>
              <Text style={styles.capaMarcaVerde}>N</Text>TANK
            </Text>
          </View>

          <Text style={styles.capaTituloDoc}>Memória de Cálculo</Text>
          <Text style={styles.capaSub}>
            Tanque vertical cilíndrico · API 650 / NBR 7821
          </Text>

          <View style={styles.capaProjeto}>
            <Text style={styles.capaProjLabel}>Projeto</Text>
            <Text style={styles.capaProjNome}>{projeto.nome}</Text>

            {projeto.cliente && (
              <View style={styles.capaProjLinha}>
                <Text style={styles.capaProjChave}>Cliente</Text>
                <Text style={styles.capaProjValor}>{projeto.cliente}</Text>
              </View>
            )}
            {projeto.local && (
              <View style={styles.capaProjLinha}>
                <Text style={styles.capaProjChave}>Local</Text>
                <Text style={styles.capaProjValor}>{projeto.local}</Text>
              </View>
            )}
            <View style={styles.capaProjLinha}>
              <Text style={styles.capaProjChave}>Geometria</Text>
              <Text style={styles.capaProjValor}>
                D = {fmtNum(D_m)} m   ·   H = {fmtNum(H_m)} m   ·   V ={" "}
                {fmtNum(volume_m3, 1)} m³
              </Text>
            </View>
            <View style={styles.capaProjLinha}>
              <Text style={styles.capaProjChave}>Variante</Text>
              <Text style={styles.capaProjValor}>{variante}</Text>
            </View>
            <View style={styles.capaProjLinha}>
              <Text style={styles.capaProjChave}>Massa total</Text>
              <Text style={styles.capaProjValor}>
                {fmtNum(resultado.pesoTotal_kg, 0)} kg ·{" "}
                {fmtBRL.format(resultado.custo_R$)}
              </Text>
            </View>
            <View style={styles.capaProjLinha}>
              <Text style={styles.capaProjChave}>Emitido em</Text>
              <Text style={styles.capaProjValor}>
                {fmtDataHora(new Date().toISOString())}
              </Text>
            </View>
            {responsavel && (
              <View style={styles.capaProjLinha}>
                <Text style={styles.capaProjChave}>Responsável</Text>
                <Text style={styles.capaProjValor}>{responsavel}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.capaRodape}>
          <Text>Powered by NTN ENGENHARIA</Text>
          <Text>www.ntnengenharia.com.br</Text>
        </View>
      </Page>

      {/* ============================ SUMÁRIO ============================ */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />
        <Text style={styles.h1}>Sumário</Text>

        <View style={{ marginTop: 12 }}>
          {[
            "Dados de entrada",
            "Costado",
            "Fundo",
            "Teto",
            ...(resultado.bocais.length > 0 ? ["Bocais e flanges"] : []),
            ...(resultado.acessorios ? ["Escadas, plataformas e guarda-corpos"] : []),
            "Resumo geral",
            "Referências normativas",
            "Anexo 1 — Quantitativo de Chapas",
            "Anexo 2 — Quantitativo de Soldagem",
            "Anexo 3 — Quantitativo de Pintura",
          ].map((titulo, i) => (
            <View key={titulo} style={styles.sumarioLinha}>
              <Text style={styles.sumarioNum}>{i + 1}.</Text>
              <Text style={styles.sumarioTitulo}>{titulo}</Text>
            </View>
          ))}
        </View>

        <Rodape />
      </Page>

      {/* ====================== 1. DADOS DE ENTRADA ====================== */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />
        <Text style={styles.h1}>1. Dados de entrada</Text>

        <Text style={styles.h2}>Geometria</Text>
        <KV
          kv={[
            ["Diâmetro D", `${fmtNum(D_m)} m`],
            ["Altura H", `${fmtNum(H_m)} m`],
            ["Volume nominal", `${fmtNum(volume_m3, 1)} m³`],
            [
              "Modo de entrada",
              projeto.geometria.modo === "A"
                ? "A (D + H conhecidos)"
                : projeto.geometria.modo === "B"
                  ? `B (volume desejado: ${fmtNum(projeto.geometria.volumeDesejado_m3 ?? 0, 1)} m³)`
                  : `C (volume + restrição)`,
            ],
          ]}
        />

        <Text style={styles.h2}>Produto e materiais</Text>
        <KV
          kv={[
            ["Produto", projeto.parametros.produto || "(não informado)"],
            ["Densidade relativa G", fmtNum(projeto.parametros.G, 3)],
            ["Sobrespessura corrosão CA", `${fmtNum(projeto.parametros.CA_mm, 2)} mm`],
            ["Material das chapas", projeto.parametros.materialId],
            ["Eficiência de junta E", fmtNum(projeto.parametros.E, 2)],
          ]}
        />

        <Text style={styles.h2}>Chapas comerciais e custo</Text>
        <KV
          kv={[
            ["Largura da chapa", `${projeto.parametros.larguraChapa_mm} mm`],
            ["Comprimento da chapa", `${projeto.parametros.comprimentoChapa_mm} mm`],
            [
              "Custo do aço",
              `${fmtBRL.format(projeto.parametros.custoAcoPorKg_R$)} / kg`,
            ],
          ]}
        />

        <Text style={styles.h2}>Tipos construtivos</Text>
        <KV
          kv={[
            ["Tipo de fundo", rotuloFundo(projeto.fundo.tipo)],
            ["Tipo de teto", rotuloTeto(projeto.teto.tipo)],
            ...(projeto.teto.anguloCone_graus !== undefined
              ? ([
                  ["Ângulo do teto cônico", `${projeto.teto.anguloCone_graus}°`],
                ] as const)
              : []),
            ...(projeto.teto.R_dome_m !== undefined
              ? ([["Raio do dome", `${projeto.teto.R_dome_m} m`]] as const)
              : []),
          ]}
        />

        <Rodape />
      </Page>

      {/* ============================ 2. COSTADO ========================== */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />
        <Text style={styles.h1}>2. Costado</Text>
        <Text style={styles.paragrafo}>
          Variante adotada: <Text style={styles.destaque}>{variante}</Text>.
          Foram executados os 3 métodos aplicáveis (NBR 7821, API 650 1-Foot e
          API 650 VDP) — esta é a de menor custo total. Anéis numerados da
          base (1) ao topo (N).
        </Text>

        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={{ width: 30 }}>Anel</Text>
            <Text style={{ width: 60 }}>Altura</Text>
            <Text style={{ width: 60 }}>H ef.</Text>
            <Text style={{ width: 60 }}>e calc.</Text>
            <Text style={{ width: 50 }}>Chapa</Text>
            <Text style={{ width: 60 }}>e adotada</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Peso</Text>
          </View>
          {resultado.costado.aneis.map((a, idx) => (
            <View
              key={a.indice}
              style={[
                styles.tabelaLinha,
                idx % 2 === 1 ? styles.tabelaLinhaAlt : {},
              ]}
            >
              <Text style={[styles.td, { width: 30 }]}>#{a.indice}</Text>
              <Text style={[styles.td, { width: 60 }]}>
                {fmtNum(a.altura_mm, 0)} mm
              </Text>
              <Text style={[styles.td, { width: 60 }]}>
                {fmtNum(a.H_efetiva_m)} m
              </Text>
              <Text style={[styles.td, { width: 60 }]}>
                {fmtNum(a.e_calc_mm)} mm
              </Text>
              <Text style={[styles.td, { width: 50 }]}>
                {a.chapaComercial.polegada}"
              </Text>
              <Text
                style={[styles.td, { width: 60, fontFamily: "Helvetica-Bold" }]}
              >
                {fmtNum(a.chapaComercial.espessura)} mm
              </Text>
              <Text style={[styles.tdNum, { flex: 1 }]}>
                {fmtNum(a.peso_kg, 0)} kg
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.h3}>Memória de cálculo — por anel</Text>
        {resultado.costado.aneis.map((a) => (
          <View key={a.indice} wrap={false}>
            <Text style={[styles.h3, { marginTop: 6 }]}>
              Anel {a.indice} —{" "}
              {a.indice === 1 ? "mais carregado (base)" : `H ef. = ${fmtNum(a.H_efetiva_m)} m`}
            </Text>
            <Memoria memoria={a.memoriaCalculo} />
          </View>
        ))}

        <Text style={styles.h3}>Resumo do costado</Text>
        <KV
          kv={[
            ["Número de anéis", String(resultado.costado.numeroAneis)],
            [
              "Chapas por anel",
              fmtNum(resultado.costado.chapasPorAnel, 2),
            ],
            ["Área de superfície", `${fmtNum(resultado.costado.area_m2)} m²`],
            [
              "Massa total",
              `${fmtNum(resultado.costado.pesoTotal_kg, 0)} kg`,
            ],
          ]}
        />

        <Rodape />
      </Page>

      {/* ============================== 3. FUNDO ============================ */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />
        <Text style={styles.h1}>3. Fundo</Text>
        <Text style={styles.paragrafo}>
          Tipo construtivo:{" "}
          <Text style={styles.destaque}>
            {rotuloFundo(resultado.fundo.tipo)}
          </Text>
          .
        </Text>

        <Text style={styles.h2}>Corpo do fundo</Text>
        <KV
          kv={[
            ["Espessura calculada", `${fmtNum(resultado.fundo.e_calc_mm)} mm`],
            [
              "Espessura adotada",
              `${fmtNum(resultado.fundo.e_adotada_mm)} mm (${resultado.fundo.chapaComercial.polegada}")`,
            ],
            ["Área projetada", `${fmtNum(resultado.fundo.area_m2)} m²`],
            ["Massa do corpo", `${fmtNum(resultado.fundo.peso_corpo_kg, 0)} kg`],
          ]}
        />
        <Memoria memoria={resultado.fundo.memoriaCalculo} />

        {resultado.fundo.anelAnular && (
          <>
            <Text style={styles.h2}>Anel anular</Text>
            <KV
              kv={[
                [
                  "Largura projetada",
                  `${resultado.fundo.anelAnular.largura_mm} mm`,
                ],
                [
                  "Espessura",
                  `${fmtNum(resultado.fundo.anelAnular.espessura_mm)} mm`,
                ],
                [
                  "Massa do anel",
                  `${fmtNum(resultado.fundo.anelAnular.peso_kg, 0)} kg`,
                ],
              ]}
            />
            <Memoria memoria={resultado.fundo.anelAnular.memoriaCalculo} />
          </>
        )}

        <View style={styles.destaqueBox}>
          <Text style={styles.destaqueLabel}>Massa total do fundo</Text>
          <Text style={styles.destaqueValor}>
            {fmtNum(resultado.fundo.pesoTotal_kg, 0)} kg
          </Text>
        </View>

        <Rodape />
      </Page>

      {/* ============================== 4. TETO ============================ */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />
        <Text style={styles.h1}>4. Teto</Text>
        <Text style={styles.paragrafo}>
          Tipo construtivo:{" "}
          <Text style={styles.destaque}>
            {rotuloTeto(resultado.teto.tipo)}
          </Text>
          .
        </Text>

        <KV
          kv={[
            ["Espessura calculada", `${fmtNum(resultado.teto.e_calc_mm)} mm`],
            [
              "Espessura adotada",
              `${fmtNum(resultado.teto.e_adotada_mm)} mm (${resultado.teto.chapaComercial.polegada}")`,
            ],
            ["Área de superfície", `${fmtNum(resultado.teto.area_m2)} m²`],
            ["Massa da chapa", `${fmtNum(resultado.teto.peso_chapa_kg, 0)} kg`],
            ...(resultado.teto.peso_estrutura_kg > 0
              ? ([
                  [
                    "Massa da estrutura",
                    `${fmtNum(resultado.teto.peso_estrutura_kg, 0)} kg`,
                  ],
                ] as const)
              : []),
          ]}
        />
        <Memoria memoria={resultado.teto.memoriaCalculo} />

        <View style={styles.destaqueBox}>
          <Text style={styles.destaqueLabel}>Massa total do teto</Text>
          <Text style={styles.destaqueValor}>
            {fmtNum(resultado.teto.pesoTotal_kg, 0)} kg
          </Text>
        </View>

        <Rodape />
      </Page>

      {/* ===================== 5. BOCAIS E FLANGES ======================= */}
      {resultado.bocais.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Cabecalho projeto={projeto} />
          <Text style={styles.h1}>5. Bocais e flanges</Text>
          <Text style={styles.paragrafo}>
            Cada bocal foi dimensionado com pescoço (Sch 40), reforço por dois
            métodos em paralelo (anel externo / pescoço espessado — adotado o
            mais econômico que atende API 650 5.7) e flange ASME B16.5.
          </Text>

          <View style={styles.tabela}>
            <View style={styles.tabelaHeader}>
              <Text style={{ width: 50 }}>TAG</Text>
              <Text style={{ width: 32 }}>Pos.</Text>
              <Text style={{ width: 32 }}>DN</Text>
              <Text style={{ width: 35 }}>Cl.</Text>
              <Text style={{ width: 50 }}>Tipo/Face</Text>
              <Text style={{ width: 60 }}>Reforço</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>Pesc.</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>Ref.</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>Flg.</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>Total</Text>
            </View>
            {resultado.bocais.map((b, idx) => (
              <View
                key={b.entrada.tag}
                style={[
                  styles.tabelaLinha,
                  idx % 2 === 1 ? styles.tabelaLinhaAlt : {},
                ]}
              >
                <Text style={[styles.td, { width: 50, fontFamily: "Helvetica-Bold" }]}>
                  {b.entrada.tag}
                </Text>
                <Text style={[styles.td, { width: 32 }]}>
                  {b.entrada.posicao === "teto" ? "Teto" : "Cost."}
                </Text>
                <Text style={[styles.td, { width: 32 }]}>
                  {b.entrada.DN_pol}"
                </Text>
                <Text style={[styles.td, { width: 35 }]}>
                  {b.entrada.classe}
                </Text>
                <Text style={[styles.td, { width: 50 }]}>
                  {b.entrada.tipoFlange}/{b.entrada.face}
                </Text>
                <Text style={[styles.td, { width: 60 }]}>
                  {b.reforcoAdotado.metodo === "anel-externo"
                    ? "Anel ext."
                    : "Pesc. esp."}
                </Text>
                <Text style={[styles.tdNum, { flex: 1 }]}>
                  {fmtNum(b.massa_pescoco_kg, 1)}
                </Text>
                <Text style={[styles.tdNum, { flex: 1 }]}>
                  {fmtNum(b.reforcoAdotado.massa_kg, 1)}
                </Text>
                <Text style={[styles.tdNum, { flex: 1 }]}>
                  {fmtNum(b.flange.massa_kg, 1)}
                </Text>
                <Text
                  style={[
                    styles.tdNum,
                    { flex: 1, fontFamily: "Helvetica-Bold" },
                  ]}
                >
                  {fmtNum(b.pesoTotal_kg, 1)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.h3}>
            Memória de cálculo — Primeiro bocal ({resultado.bocais[0]!.entrada.tag})
          </Text>
          <Memoria memoria={resultado.bocais[0]!.memoriaCalculo} />

          <View style={styles.destaqueBox}>
            <Text style={styles.destaqueLabel}>
              Massa total dos bocais ({resultado.bocais.length} bocais)
            </Text>
            <Text style={styles.destaqueValor}>
              {fmtNum(resultado.pesoBocais_kg, 0)} kg
            </Text>
          </View>

          <Rodape />
        </Page>
      )}

      {/* ===================== 6. ACESSÓRIOS ============================= */}
      {resultado.acessorios && (
        <Page size="A4" style={styles.page}>
          <Cabecalho projeto={projeto} />
          <Text style={styles.h1}>
            {resultado.bocais.length > 0 ? "6" : "5"}. Escada, plataformas e guarda-corpos
          </Text>

          {resultado.acessorios.escada.tipo !== "nenhuma" && (
            <>
              <Text style={styles.h2}>
                {resultado.acessorios.escada.tipo === "helicoidal-externa"
                  ? "Escada helicoidal externa"
                  : "Escada marinheiro vertical"}
              </Text>
              <KV
                kv={[
                  [
                    "Comprimento",
                    `${fmtNum(resultado.acessorios.escada.comprimento_m)} m`,
                  ],
                  [
                    "Número de degraus",
                    String(resultado.acessorios.escada.numeroDegraus),
                  ],
                  [
                    "Massa longarinas",
                    `${fmtNum(resultado.acessorios.escada.peso_longarinas_kg, 0)} kg`,
                  ],
                  [
                    resultado.acessorios.escada.tipo === "marinheiro-vertical"
                      ? "Massa travessões"
                      : "Massa degraus",
                    `${fmtNum(resultado.acessorios.escada.peso_degraus_kg, 0)} kg`,
                  ],
                  ...(resultado.acessorios.escada.peso_gaiola_kg > 0
                    ? ([
                        [
                          "Massa gaiola",
                          `${fmtNum(resultado.acessorios.escada.peso_gaiola_kg, 0)} kg`,
                        ],
                      ] as const)
                    : []),
                  [
                    "Total escada",
                    `${fmtNum(resultado.acessorios.escada.pesoTotal_kg, 0)} kg`,
                  ],
                ]}
              />
              <Memoria memoria={resultado.acessorios.escada.memoriaCalculo} />

              {resultado.acessorios.escada.avisos.length > 0 && (
                <View style={styles.avisoBox}>
                  <Text style={styles.destaque}>Avisos NR-12 / NR-35:</Text>
                  {resultado.acessorios.escada.avisos.map((a, i) => (
                    <Text key={i}>· {a}</Text>
                  ))}
                </View>
              )}

              {resultado.acessorios.guardaCorpoEscada && (
                <>
                  <Text style={styles.h3}>Guarda-corpo da escada</Text>
                  <KV
                    kv={[
                      [
                        "Comprimento",
                        `${fmtNum(resultado.acessorios.guardaCorpoEscada.comprimento_m)} m`,
                      ],
                      [
                        "Altura",
                        `${resultado.acessorios.guardaCorpoEscada.altura_mm} mm`,
                      ],
                      [
                        "Massa",
                        `${fmtNum(resultado.acessorios.guardaCorpoEscada.peso_kg, 0)} kg`,
                      ],
                    ]}
                  />
                </>
              )}
            </>
          )}

          {resultado.acessorios.plataformas.length > 0 && (
            <>
              <Text style={styles.h2}>
                Plataformas ({resultado.acessorios.plataformas.length})
              </Text>
              <View style={styles.tabela}>
                <View style={styles.tabelaHeader}>
                  <Text style={{ width: 80 }}>Nome</Text>
                  <Text style={{ width: 50 }}>Cota</Text>
                  <Text style={{ width: 60 }}>Área</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>Piso</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>Estrut.</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>G/Corpo</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>Total</Text>
                </View>
                {resultado.acessorios.plataformas.map((p, idx) => (
                  <View
                    key={p.entrada.id}
                    style={[
                      styles.tabelaLinha,
                      idx % 2 === 1 ? styles.tabelaLinhaAlt : {},
                    ]}
                  >
                    <Text style={[styles.td, { width: 80, fontFamily: "Helvetica-Bold" }]}>
                      {p.entrada.id}
                    </Text>
                    <Text style={[styles.td, { width: 50 }]}>
                      {fmtNum(p.entrada.cota_m)} m
                    </Text>
                    <Text style={[styles.td, { width: 60 }]}>
                      {fmtNum(p.area_m2)} m²
                    </Text>
                    <Text style={[styles.tdNum, { flex: 1 }]}>
                      {fmtNum(p.peso_piso_kg, 0)}
                    </Text>
                    <Text style={[styles.tdNum, { flex: 1 }]}>
                      {fmtNum(p.peso_estrutura_kg, 0)}
                    </Text>
                    <Text style={[styles.tdNum, { flex: 1 }]}>
                      {p.peso_guardaCorpo_kg > 0
                        ? fmtNum(p.peso_guardaCorpo_kg, 0)
                        : "—"}
                    </Text>
                    <Text style={[styles.tdNum, { flex: 1, fontFamily: "Helvetica-Bold" }]}>
                      {fmtNum(p.pesoTotal_kg, 0)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.destaqueBox}>
            <Text style={styles.destaqueLabel}>Massa total dos acessórios</Text>
            <Text style={styles.destaqueValor}>
              {fmtNum(resultado.pesoAcessorios_kg, 0)} kg
            </Text>
          </View>

          <Rodape />
        </Page>
      )}

      {/* ===================== RESUMO + LISTAS + REFS ==================== */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />
        <Text style={styles.h1}>Resumo geral</Text>

        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={{ flex: 2 }}>Componente</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Massa (kg)</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>%</Text>
          </View>
          {[
            ["Costado", resultado.costado.pesoTotal_kg],
            ["Fundo", resultado.fundo.pesoTotal_kg],
            ["Teto", resultado.teto.pesoTotal_kg],
            [
              `Bocais (${resultado.bocais.length})`,
              resultado.pesoBocais_kg,
            ],
            ["Acessórios", resultado.pesoAcessorios_kg],
          ].map(([nome, valor], i) => {
            const v = Number(valor);
            const pct = (v / resultado.pesoTotal_kg) * 100;
            return (
              <View
                key={String(nome)}
                style={[
                  styles.tabelaLinha,
                  i % 2 === 1 ? styles.tabelaLinhaAlt : {},
                ]}
              >
                <Text style={[styles.td, { flex: 2 }]}>{nome}</Text>
                <Text style={[styles.tdNum, { flex: 1 }]}>
                  {fmtNum(v, 0)}
                </Text>
                <Text style={[styles.tdNum, { flex: 1 }]}>
                  {fmtNum(pct, 1)}%
                </Text>
              </View>
            );
          })}
          <View
            style={[
              styles.tabelaLinha,
              { backgroundColor: PRETO, borderTopWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.td,
                { flex: 2, color: VERDE, fontFamily: "Helvetica-Bold" },
              ]}
            >
              TOTAL
            </Text>
            <Text
              style={[
                styles.tdNum,
                { flex: 1, color: VERDE, fontFamily: "Helvetica-Bold" },
              ]}
            >
              {fmtNum(resultado.pesoTotal_kg, 0)}
            </Text>
            <Text
              style={[
                styles.tdNum,
                { flex: 1, color: VERDE, fontFamily: "Helvetica-Bold" },
              ]}
            >
              100,0%
            </Text>
          </View>
        </View>

        {(() => {
          const custoMDO = (projeto.parametros as typeof projeto.parametros & { custoMaoDeObraPorKg_R$?: number }).custoMaoDeObraPorKg_R$ ?? 18;
          const custoMDOTotal = resultado.pesoTotal_kg * custoMDO;
          const custoTotal = resultado.custo_R$ + custoMDOTotal;
          return (
            <>
              {/* Linhas individuais de custo (como no app) */}
              <KV
                kv={[
                  ["Custo do aço", `${fmtBRL.format(resultado.custo_R$)}  (${fmtBRL.format(projeto.parametros.custoAcoPorKg_R$)}/kg)`],
                  ["Custo mão de obra", `${fmtBRL.format(custoMDOTotal)}  (${fmtBRL.format(custoMDO)}/kg)`],
                ]}
              />
              {/* Box de destaque com total */}
              <View style={styles.destaqueBox}>
                <Text style={[styles.destaqueLabel, { fontFamily: "Helvetica-Bold" }]}>
                  CUSTO TOTAL ESTIMADO (AÇO + MÃO DE OBRA)
                </Text>
                <Text style={styles.destaqueValor}>
                  {fmtBRL.format(custoTotal)}
                </Text>
                <Text style={{ fontSize: 8, color: PRETO, marginTop: 4 }}>
                  Total de aço: {fmtNum(resultado.pesoTotal_kg, 0)} kg
                </Text>
              </View>
            </>
          );
        })()}

        <Text style={{ fontSize: 7, color: CARBONO_500, marginTop: 4, marginBottom: 8 }}>
          O quantitativo completo de chapas (costado, fundo, teto e fundo duplo) está no Anexo 1 deste documento.
        </Text>

        <Text style={styles.h2}>Referências normativas</Text>
        <Text style={styles.paragrafo}>
          Os cálculos deste documento aplicam fórmulas dos seguintes documentos
          (citados por item/seção, sem reproduzir texto, tabelas ou figuras):
        </Text>
        <View style={{ paddingLeft: 12 }}>
          <Text>
            · <Text style={styles.destaque}>API 650</Text> — Welded Tanks for Oil
            Storage (5.4 fundo, 5.5 anel anular, 5.6 costado, 5.7 bocais, 5.10
            teto)
          </Text>
          <Text>
            · <Text style={styles.destaque}>NBR 7821</Text> — Tanques soldados
            para armazenamento de petróleo e derivados
          </Text>
          <Text>
            · <Text style={styles.destaque}>ASME B16.5</Text> — Pipe Flanges and
            Flanged Fittings
          </Text>
          <Text>
            · <Text style={styles.destaque}>NR-12</Text> — Segurança no trabalho
            em máquinas e equipamentos (escadas, plataformas, guarda-corpos)
          </Text>
          <Text>
            · <Text style={styles.destaque}>NR-35</Text> — Trabalho em altura
            (gaiola de proteção, sinalização)
          </Text>
        </View>

        <View
          style={{
            marginTop: 30,
            paddingTop: 12,
            borderTopColor: PRETO,
            borderTopWidth: 1,
          }}
        >
          <Text style={{ fontSize: 8, color: CARBONO_500 }}>
            Documento emitido em {fmtDataHora(new Date().toISOString())}.
            Os valores aqui apresentados são estimativas de dimensionamento
            preliminar. Verificações finais de fabricação devem seguir o
            projeto detalhado da NTN Engenharia, com aprovação dos órgãos
            competentes (ANP, Corpo de Bombeiros, órgãos ambientais).
          </Text>
          {responsavel && (
            <View style={{ marginTop: 30 }}>
              <View
                style={{
                  borderTopColor: PRETO,
                  borderTopWidth: 0.5,
                  width: 240,
                  paddingTop: 4,
                }}
              >
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>
                  {responsavel}
                </Text>
                <Text style={{ fontSize: 8, color: CARBONO_500 }}>
                  Responsável técnico
                </Text>
              </View>
            </View>
          )}
        </View>

        <Rodape />
      </Page>

      {/* ====================== AVISO TÉCNICO / DISCLAIMER ================= */}
      <Page size="A4" style={styles.page}>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: PRETO, marginBottom: 8 }}>
            Aviso Técnico — Responsabilidade do Usuário
          </Text>
          <View style={{ borderBottomWidth: 2, borderBottomColor: VERDE, marginBottom: 16 }} />
          <View
            style={{
              backgroundColor: "#FFF8E1",
              borderLeftWidth: 4,
              borderLeftColor: "#F59E0B",
              padding: 16,
              borderRadius: 2,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: "#92400E", marginBottom: 6 }}>
              ⚠  Este documento tem caráter informativo e de suporte ao projeto.
            </Text>
            <Text style={{ fontSize: 10, color: "#78350F", lineHeight: 1.6 }}>
              Os cálculos apresentados nesta memória foram elaborados com base nas normas técnicas
              vigentes (API 650 — Welded Tanks for Oil Storage e ABNT NBR 7821 — Tanques soldados
              para armazenamento de petróleo e derivados), utilizando os parâmetros inseridos pelo
              usuário e os métodos implementados no software NTANK.
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>
            Os resultados obtidos <Text style={{ fontFamily: "Helvetica-Bold" }}>devem obrigatoriamente ser verificados, validados e aprovados
            por um Engenheiro Mecânico legalmente habilitado</Text>, devidamente registrado no
            Conselho Regional de Engenharia e Agronomia (CREA), conforme determina a Lei Federal
            n.º 5.194/1966 e as resoluções do CONFEA/CREA aplicáveis.
          </Text>
          <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>
            A utilização deste documento como memória de cálculo definitiva, sem revisão técnica
            por profissional habilitado, é de exclusiva responsabilidade do usuário. A NTN Engenharia
            e os desenvolvedores do software NTANK não se responsabilizam por quaisquer danos,
            perdas ou responsabilidades decorrentes do uso inadequado das informações aqui contidas.
          </Text>
          <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>
            Antes da fabricação, montagem ou operação de qualquer equipamento, recomenda-se ainda:
          </Text>
          {[
            "Verificar a edição vigente das normas referenciadas na data de execução do projeto;",
            "Consultar o fabricante dos materiais quanto às propriedades mecânicas do lote utilizado;",
            "Obter as aprovações e licenças exigidas pelos órgãos competentes (ANP, Corpo de Bombeiros, órgãos ambientais);",
            "Emitir a ART (Anotação de Responsabilidade Técnica) correspondente ao serviço de projeto.",
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ fontSize: 10, color: VERDE, marginRight: 6, fontFamily: "Helvetica-Bold" }}>•</Text>
              <Text style={{ fontSize: 10, color: "#374151", flex: 1, lineHeight: 1.6 }}>{item}</Text>
            </View>
          ))}
        </View>
        <Rodape />
      </Page>

      {/* ======================= ANEXO 1 — CHAPAS ========================== */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />

        {/* Cabeçalho do Anexo */}
        <View style={{ backgroundColor: PRETO, padding: 10, marginBottom: 14 }}>
          <Text style={{ color: VERDE, fontSize: 8, letterSpacing: 1.5, fontFamily: "Helvetica-Bold" }}>
            ANEXO 1
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 }}>
            Quantitativo de Chapas
          </Text>
        </View>

        {/* Resumo */}
        <View style={{ flexDirection: "row", marginBottom: 12, gap: 6 }}>
          <View style={{ flex: 1, backgroundColor: CREME, padding: 8 }}>
            <Text style={{ fontSize: 7, color: CARBONO_500, textTransform: "uppercase", letterSpacing: 0.8 }}>Total de chapas</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, marginTop: 2 }}>{listaMateriais.totalChapas} un</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: CREME, padding: 8 }}>
            <Text style={{ fontSize: 7, color: CARBONO_500, textTransform: "uppercase", letterSpacing: 0.8 }}>Área total comprada</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, marginTop: 2 }}>{fmtNum(listaMateriais.totalArea_m2)} m²</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: VERDE, padding: 8 }}>
            <Text style={{ fontSize: 7, color: PRETO, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Helvetica-Bold" }}>Peso total de chapas</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, marginTop: 2, color: PRETO }}>{fmtNum(listaMateriais.totalPeso_kg, 1)} kg</Text>
          </View>
        </View>

        {/* Tabela de chapas */}
        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={{ width: 70, fontSize: 8, color: VERDE }}>Componente</Text>
            <Text style={{ width: 72, fontSize: 8, color: VERDE }}>Nominal (pol)</Text>
            <Text style={{ width: 38, fontSize: 8, textAlign: "right", color: VERDE }}>Esp mm</Text>
            <Text style={{ width: 36, fontSize: 8, textAlign: "right", color: VERDE }}>Larg mm</Text>
            <Text style={{ width: 40, fontSize: 8, textAlign: "right", color: VERDE }}>Compr mm</Text>
            <Text style={{ width: 30, fontSize: 8, textAlign: "right", color: VERDE }}>Qtde</Text>
            <Text style={{ width: 44, fontSize: 8, textAlign: "right", color: VERDE }}>Área un m²</Text>
            <Text style={{ width: 44, fontSize: 8, textAlign: "right", color: VERDE }}>Área tot m²</Text>
            <Text style={{ flex: 1, fontSize: 8, textAlign: "right", color: VERDE }}>Peso kg</Text>
          </View>
          {listaMateriais.itens.map((item, idx) => (
            <View key={idx} style={idx % 2 === 1 ? [styles.tabelaLinha, styles.tabelaLinhaAlt] : styles.tabelaLinha}>
              <Text style={{ width: 70, fontSize: 8 }}>{item.componente}</Text>
              <Text style={{ width: 72, fontSize: 8 }}>
                {item.polegada.includes("mm") ? item.polegada : `${item.polegada}"`}
              </Text>
              <Text style={{ width: 38, fontSize: 8, textAlign: "right" }}>{fmtNum(item.espessura_mm, 2)}</Text>
              <Text style={{ width: 36, fontSize: 8, textAlign: "right" }}>{item.largura_mm}</Text>
              <Text style={{ width: 40, fontSize: 8, textAlign: "right" }}>{item.comprimento_mm}</Text>
              <Text style={{ width: 30, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{item.quantidade}</Text>
              <Text style={{ width: 44, fontSize: 8, textAlign: "right" }}>{fmtNum(item.areaUnitaria_m2, 3)}</Text>
              <Text style={{ width: 44, fontSize: 8, textAlign: "right" }}>{fmtNum(item.areaTotal_m2, 2)}</Text>
              <Text style={{ flex: 1, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmtNum(item.pesoTotal_kg, 1)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", backgroundColor: PRETO, paddingVertical: 5, paddingHorizontal: 4 }}>
            <Text style={{ flex: 1, fontSize: 8, color: VERDE, fontFamily: "Helvetica-Bold" }}>TOTAL GERAL</Text>
            <Text style={{ fontSize: 8, color: VERDE, fontFamily: "Helvetica-Bold" }}>
              {listaMateriais.totalChapas} un  ·  {fmtNum(listaMateriais.totalArea_m2)} m²  ·  {fmtNum(listaMateriais.totalPeso_kg, 1)} kg
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 7, color: CARBONO_500, marginTop: 4 }}>
          Costado: aproveitamento exato por anel (π × D / comprimento, arredondado para cima).
          Fundo e Teto: fator 1,15 (15% de perda no corte circular). Fundo Duplo: mesma área do fundo externo.
        </Text>

        <Rodape />
      </Page>

      {/* ======================= ANEXO 2 — SOLDAGEM ======================== */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />

        {/* Cabeçalho do Anexo */}
        <View style={{ backgroundColor: PRETO, padding: 10, marginBottom: 14 }}>
          <Text style={{ color: VERDE, fontSize: 8, letterSpacing: 1.5, fontFamily: "Helvetica-Bold" }}>
            ANEXO 2
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 }}>
            Quantitativo de Soldagem
          </Text>
        </View>

        {/* Juntas por componente */}
        {resultadoSoldagem.componentes.map((comp, ci) => (
          <View key={ci} style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: PRETO, marginBottom: 4 }}>
              {comp.componente} — {PROCESSOS_SOLDAGEM[comp.processo].nome}
            </Text>
            <View style={styles.tabela}>
              <View style={styles.tabelaHeader}>
                <Text style={{ flex: 1, fontSize: 8, color: VERDE }}>Junta / Descrição</Text>
                <Text style={{ width: 70, fontSize: 8, color: VERDE }}>Tipo</Text>
                <Text style={{ width: 34, fontSize: 8, textAlign: "right", color: VERDE }}>Esp mm</Text>
                <Text style={{ width: 48, fontSize: 8, textAlign: "right", color: VERDE }}>Compr m</Text>
                <Text style={{ width: 48, fontSize: 8, textAlign: "right", color: VERDE }}>Peso kg</Text>
              </View>
              {comp.juntas.map((j, ji) => (
                <View key={ji} style={ji % 2 === 1 ? [styles.tabelaLinha, styles.tabelaLinhaAlt] : styles.tabelaLinha}>
                  <Text style={{ flex: 1, fontSize: 8 }}>{j.descricao}</Text>
                  <Text style={{ width: 70, fontSize: 8 }}>{labelJuntaPDF(j.tipoJunta)}</Text>
                  <Text style={{ width: 34, fontSize: 8, textAlign: "right" }}>{fmtNum(j.espessura_mm, 1)}</Text>
                  <Text style={{ width: 48, fontSize: 8, textAlign: "right" }}>{fmtNum(j.comprimento_m, 2)}</Text>
                  <Text style={{ width: 48, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmtNum(j.pesoMetal_kg, 3)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", backgroundColor: CARBONO_100, paddingVertical: 4, paddingHorizontal: 4 }}>
                <Text style={{ flex: 1, fontSize: 8, color: CARBONO_700, fontFamily: "Helvetica-Bold" }}>
                  Subtotal {comp.componente}
                </Text>
                <Text style={{ width: 48, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                  {fmtNum(comp.totalComprimento_m, 1)} m
                </Text>
                <Text style={{ width: 48, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                  {fmtNum(comp.totalPesoMetal_kg, 2)} kg
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 7, color: CARBONO_500 }}>
              Consumível ({comp.processo}): {fmtNum(comp.consumivel.material_kg, 2)} kg de eletrodo/arame
              {comp.consumivel.gas_m3 > 0 ? `  ·  ${fmtNum(comp.consumivel.gas_m3, 2)} m³ gás proteção` : "  (sem gás)"}
            </Text>
          </View>
        ))}

        {/* Resumo global de consumíveis */}
        <View style={{ backgroundColor: CREME, padding: 10, marginTop: 8, borderLeftColor: VERDE, borderLeftWidth: 3 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 8 }}>
            Resumo de Consumíveis — Corte e Preparação
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 6 }}>
              <Text style={{ fontSize: 7, color: CARBONO_500 }}>Total peso metal solda</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>
                {fmtNum(resultadoSoldagem.totalPesoMetal_kg, 1)} kg
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 6 }}>
              <Text style={{ fontSize: 7, color: CARBONO_500 }}>Discos de corte/desbaste</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>
                {resultadoSoldagem.discos_un} un
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 6 }}>
              <Text style={{ fontSize: 7, color: CARBONO_500 }}>O₂ (oxicorte)</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>
                {fmtNum(resultadoSoldagem.oxigenio_kg, 1)} kg
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 6 }}>
              <Text style={{ fontSize: 7, color: CARBONO_500 }}>Acetileno</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>
                {fmtNum(resultadoSoldagem.acetileno_m3, 1)} m³
              </Text>
            </View>
          </View>
        </View>

        <Rodape />
      </Page>

      {/* ======================= ANEXO 3 — PINTURA ========================= */}
      <Page size="A4" style={styles.page}>
        <Cabecalho projeto={projeto} />

        {/* Cabeçalho do Anexo */}
        <View style={{ backgroundColor: PRETO, padding: 10, marginBottom: 14 }}>
          <Text style={{ color: VERDE, fontSize: 8, letterSpacing: 1.5, fontFamily: "Helvetica-Bold" }}>
            ANEXO 3
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 }}>
            Quantitativo de Pintura
          </Text>
        </View>

        {/* Áreas pintáveis */}
        <Text style={styles.h3}>Áreas pintáveis</Text>
        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={{ flex: 1, fontSize: 8, color: VERDE }}>Superfície</Text>
            <Text style={{ width: 80, fontSize: 8, textAlign: "right", color: VERDE }}>Área (m²)</Text>
          </View>
          {[
            { label: "Costado (externo)",   val: resultadoPintura.areaCostado_m2   },
            { label: "Teto (externo)",       val: resultadoPintura.areaTeto_m2     },
            { label: "Acessórios — 20% de (Costado + Teto)", val: resultadoPintura.areaAcessorios_m2 },
          ].map(({ label, val }, i) => (
            <View key={label} style={i % 2 === 1 ? [styles.tabelaLinha, styles.tabelaLinhaAlt] : styles.tabelaLinha}>
              <Text style={{ flex: 1, fontSize: 8 }}>{label}</Text>
              <Text style={{ width: 80, fontSize: 8, textAlign: "right" }}>{fmtNum(val, 2)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", backgroundColor: PRETO, paddingVertical: 4, paddingHorizontal: 4 }}>
            <Text style={{ flex: 1, fontSize: 8, color: VERDE, fontFamily: "Helvetica-Bold" }}>TOTAL PINTÁVEL</Text>
            <Text style={{ width: 80, fontSize: 8, textAlign: "right", color: VERDE, fontFamily: "Helvetica-Bold" }}>
              {fmtNum(resultadoPintura.areaTotalPintavel_m2, 2)} m²
            </Text>
          </View>
        </View>

        {/* Plano de pintura */}
        <Text style={[styles.h3, { marginTop: 12 }]}>
          Plano de pintura — {resultadoPintura.demaos.length === 3 ? "3 demãos" : "2 demãos"}
        </Text>
        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={{ flex: 1, fontSize: 8, color: VERDE }}>Demão</Text>
            <Text style={{ width: 44, fontSize: 8, textAlign: "right", color: VERDE }}>Esp µm</Text>
            <Text style={{ width: 56, fontSize: 8, textAlign: "right", color: VERDE }}>Rend m²/L</Text>
            <Text style={{ width: 56, fontSize: 8, textAlign: "right", color: VERDE }}>Volume (L)</Text>
            <Text style={{ width: 70, fontSize: 8, textAlign: "right", color: VERDE }}>Custo (R$)</Text>
          </View>
          {resultadoPintura.demaos.map((d, di) => (
            <View key={di} style={di % 2 === 1 ? [styles.tabelaLinha, styles.tabelaLinhaAlt] : styles.tabelaLinha}>
              <Text style={{ flex: 1, fontSize: 8 }}>{d.nome}</Text>
              <Text style={{ width: 44, fontSize: 8, textAlign: "right" }}>{d.espessura_um}</Text>
              <Text style={{ width: 56, fontSize: 8, textAlign: "right" }}>{fmtNum(d.rendimento_m2_L, 1)}</Text>
              <Text style={{ width: 56, fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmtNum(d.volume_L, 1)}</Text>
              <Text style={{ width: 70, fontSize: 8, textAlign: "right" }}>
                {d.custo_R$ > 0 ? fmtBRL.format(d.custo_R$) : "—"}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", backgroundColor: PRETO, paddingVertical: 4, paddingHorizontal: 4 }}>
            <Text style={{ flex: 1, fontSize: 8, color: VERDE, fontFamily: "Helvetica-Bold" }}>TOTAL</Text>
            <Text style={{ width: 44, fontSize: 8, color: VERDE }}></Text>
            <Text style={{ width: 56, fontSize: 8, color: VERDE }}></Text>
            <Text style={{ width: 56, fontSize: 8, textAlign: "right", color: VERDE, fontFamily: "Helvetica-Bold" }}>
              {fmtNum(resultadoPintura.totalVolume_L, 1)} L
            </Text>
            <Text style={{ width: 70, fontSize: 8, textAlign: "right", color: VERDE, fontFamily: "Helvetica-Bold" }}>
              {resultadoPintura.totalCusto_R$ > 0 ? fmtBRL.format(resultadoPintura.totalCusto_R$) : "—"}
            </Text>
          </View>
        </View>

        {/* Caixas de resumo */}
        <View style={{ flexDirection: "row", marginTop: 12, gap: 6 }}>
          <View style={{ flex: 1, backgroundColor: CREME, padding: 8 }}>
            <Text style={{ fontSize: 7, color: CARBONO_500, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Área total pintável
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, marginTop: 2 }}>
              {fmtNum(resultadoPintura.areaTotalPintavel_m2, 1)} m²
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: CREME, padding: 8 }}>
            <Text style={{ fontSize: 7, color: CARBONO_500, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Volume total de tinta
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, marginTop: 2 }}>
              {fmtNum(resultadoPintura.totalVolume_L, 1)} L
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: VERDE, padding: 8 }}>
            <Text style={{ fontSize: 7, color: PRETO, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Helvetica-Bold" }}>
              Custo estimado de tinta
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, marginTop: 2, color: PRETO }}>
              {resultadoPintura.totalCusto_R$ > 0
                ? fmtBRL.format(resultadoPintura.totalCusto_R$)
                : "Informar R$/L"}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 7, color: CARBONO_500, marginTop: 8, lineHeight: 1.5 }}>
          Fundo não pintado (apoiado na fundação). Rendimento a seco — acrescentar 10–15% por perdas de aplicação.
          Custo calculado apenas quando R$/L informado na aba Pintura do projeto.
        </Text>

        <Rodape />
      </Page>

      {/* ======================= CTA — NTN ENGENHARIA ====================== */}
      <Page size="A4" style={styles.pageCapa}>
        <View style={styles.capaTopo} />
        <View
          style={{
            flex: 1,
            paddingHorizontal: 50,
            paddingTop: 80,
            paddingBottom: 60,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              fontSize: 28,
              color: VERDE,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Quer construir este tanque?
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#FFFFFF",
              textAlign: "center",
              marginBottom: 40,
              lineHeight: 1.6,
              maxWidth: 400,
            }}
          >
            A NTN Engenharia realiza o projeto detalhado, fabricação e montagem
            de tanques de armazenamento de combustíveis — da concepção ao
            start-up.
          </Text>

          <View
            style={{
              backgroundColor: VERDE,
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderRadius: 4,
              marginBottom: 32,
            }}
          >
            <Text
              style={{
                fontFamily: "Helvetica-Bold",
                fontSize: 14,
                color: PRETO,
                textAlign: "center",
              }}
            >
              Entre em contato e receba um orçamento
            </Text>
          </View>

          <View style={{ gap: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 11, color: VERDE, fontFamily: "Helvetica-Bold" }}>
              WhatsApp: (19) 99751-4035
            </Text>
            <Text style={{ fontSize: 11, color: "#FFFFFF" }}>
              wa.me/5519997514035
            </Text>
            <Text style={{ fontSize: 11, color: "#FFFFFF", marginTop: 8 }}>
              contato@ntnengenharia.com.br
            </Text>
            <Text style={{ fontSize: 11, color: "#FFFFFF" }}>
              www.ntnengenharia.com.br
            </Text>
          </View>
        </View>
        <View style={styles.capaRodape}>
          <Text>Powered by NTN ENGENHARIA</Text>
          <Text>www.ntnengenharia.com.br</Text>
        </View>
      </Page>
    </Document>
  );
}

function labelJuntaPDF(tipo: string): string {
  if (tipo === "topo-meio-v") return "Topo Meio-V 37°";
  if (tipo === "topo-reto") return "Topo Reto";
  return "Filete";
}

function rotuloFundo(tipo: string): string {
  switch (tipo) {
    case "plano-com-anel-anular":
      return "Plano com anel anular";
    case "conico-centro":
      return "Cônico para centro";
    case "conico-periferia":
      return "Cônico para periferia";
    default:
      return tipo;
  }
}

function rotuloTeto(tipo: string): string {
  switch (tipo) {
    case "conico-autoportante":
      return "Cônico autoportante";
    case "conico-suportado":
      return "Cônico suportado";
    case "dome-autoportante":
      return "Dome autoportante";
    default:
      return tipo;
  }
}
