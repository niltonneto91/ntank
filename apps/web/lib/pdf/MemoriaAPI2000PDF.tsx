/**
 * Memória de cálculo NTANK — API 2000 (Ventilação de Tanques).
 *
 * Segue a identidade visual NTN/NTANK (verde #ADD91C, preto, Helvetica).
 *
 * IMPORTANTE: o documento NÃO reproduz texto, tabelas nem figuras das normas
 * (API 2000, NBR 17505). Cita apenas item/seção normativa e implementa as
 * fórmulas físicas (conversão calor → vapor), que não têm copyright.
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { nm3hParaScfh } from "@ntank/calc-core";
import type {
  ResultadoRespiroNormal,
  ResultadoTermico,
  ResultadoEmergenciaFogo,
  ResultadoAreaMolhada,
  VerificacaoDispositivo,
  DispositivoAlivioAPI2000,
} from "@ntank/calc-core";
import type { ProjetoAPI2000 } from "@/lib/api2000-projeto";

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------
const VERDE = "#ADD91C";
const PRETO = "#0A0A0A";
const CARBONO_700 = "#262626";
const CARBONO_500 = "#525252";
const CARBONO_300 = "#A3A3A3";
const CARBONO_100 = "#E5E5E5";
const CREME = "#ECECE3";
const AMARELO_AVISO = "#FFFBEB";
const BORDA_AVISO = "#F59E0B";

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
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
  capaTopo:  { backgroundColor: VERDE, height: 8 },
  capaCorpo: {
    flex: 1,
    paddingHorizontal: 50,
    paddingTop: 70,
    paddingBottom: 60,
    color: "#FFFFFF",
  },
  capaLogoLinha: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  capaLogo:      { width: 60, height: 60, marginRight: 14 },
  capaMarca:     { fontFamily: "Helvetica-Bold", fontSize: 36, letterSpacing: -1 },
  capaMarcaVerde:{ color: VERDE },
  capaTituloDoc: { fontFamily: "Helvetica-Bold", fontSize: 24, marginTop: 80, color: "#FFFFFF", lineHeight: 1.2 },
  capaSub:       { fontSize: 13, marginTop: 8, color: CARBONO_300 },
  capaProjeto:   { marginTop: 50, paddingTop: 18, borderTopColor: VERDE, borderTopWidth: 1 },
  capaProjLabel: { fontSize: 8, letterSpacing: 1.5, color: VERDE, marginBottom: 4 },
  capaProjNome:  { fontFamily: "Helvetica-Bold", fontSize: 20, marginBottom: 16 },
  capaProjLinha: { flexDirection: "row", marginBottom: 6 },
  capaProjChave: { width: 100, fontSize: 9, color: CARBONO_300 },
  capaProjValor: { flex: 1, fontSize: 9 },
  capaRodape: {
    backgroundColor: VERDE,
    color: PRETO,
    paddingVertical: 10,
    paddingHorizontal: 50,
    fontSize: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Cabeçalho / Rodapé
  cabecalho: {
    position: "absolute",
    top: 20, left: 40, right: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomColor: VERDE,
    borderBottomWidth: 2,
  },
  cabecalhoMarca:      { fontFamily: "Helvetica-Bold", fontSize: 12, color: PRETO },
  cabecalhoMarcaVerde: { color: VERDE },
  cabecalhoProjeto:    { fontSize: 8, color: CARBONO_500, textAlign: "right" },
  rodape: {
    position: "absolute",
    bottom: 20, left: 40, right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: CARBONO_500,
    paddingTop: 6,
    borderTopColor: CARBONO_100,
    borderTopWidth: 1,
  },

  // Tipografia
  h1: { fontFamily: "Helvetica-Bold", fontSize: 17, color: PRETO, marginBottom: 4 },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: PRETO,
    marginTop: 14,
    marginBottom: 6,
    borderBottomColor: VERDE,
    borderBottomWidth: 1,
    paddingBottom: 3,
  },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: CARBONO_700, marginTop: 8, marginBottom: 4 },
  destaque:  { fontFamily: "Helvetica-Bold" },
  paragrafo: { marginBottom: 6 },

  // KV
  kvBox: { backgroundColor: CREME, padding: 8, marginBottom: 6, borderRadius: 2 },
  kvLinha: { flexDirection: "row", paddingVertical: 1.5 },
  kvChave: { width: 160, color: CARBONO_500 },
  kvValor: { flex: 1, fontFamily: "Helvetica-Bold" },

  // Tabela
  tabela: {
    borderTopColor: PRETO, borderTopWidth: 1,
    borderBottomColor: PRETO, borderBottomWidth: 1,
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
  tabelaLinhaAlt:  { backgroundColor: CREME },
  tabelaLinhaTotal:{ backgroundColor: PRETO },
  td:    { fontSize: 8 },
  tdNum: { fontSize: 8, textAlign: "right" },
  tdBold:{ fontSize: 8, fontFamily: "Helvetica-Bold" },
  tdNumBold: { fontSize: 8, textAlign: "right", fontFamily: "Helvetica-Bold" },

  // Memória de cálculo
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

  // Destaque
  destaqueBox: { backgroundColor: VERDE, padding: 14, marginTop: 10 },
  destaqueLabel: { fontSize: 8, color: PRETO, letterSpacing: 1 },
  destaqueValor: { fontFamily: "Helvetica-Bold", fontSize: 20, color: PRETO, marginTop: 2 },

  // Alertas
  avisoBox: {
    backgroundColor: AMARELO_AVISO,
    borderLeftColor: BORDA_AVISO,
    borderLeftWidth: 3,
    padding: 6,
    marginVertical: 3,
    fontSize: 8,
  },
  erroBox: {
    backgroundColor: "#FEF2F2",
    borderLeftColor: "#EF4444",
    borderLeftWidth: 3,
    padding: 6,
    marginVertical: 3,
    fontSize: 8,
  },
  infoBox: {
    backgroundColor: CREME,
    borderLeftColor: CARBONO_300,
    borderLeftWidth: 3,
    padding: 6,
    marginVertical: 3,
    fontSize: 8,
  },

  // Sumário
  sumarioLinha: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomColor: CARBONO_100,
    borderBottomWidth: 1,
  },
  sumarioNum:    { width: 30, fontFamily: "Helvetica-Bold", color: VERDE },
  sumarioTitulo: { flex: 1 },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CalculoAPI2000 {
  V_nominal: number;
  A_wet: number;
  areaRes: ResultadoAreaMolhada;
  respiro: ResultadoRespiroNormal;
  termico: ResultadoTermico;
  emergencia: ResultadoEmergenciaFogo | null;
  verificacoes: Array<{
    dispositivo: DispositivoAlivioAPI2000;
    outbreathing: VerificacaoDispositivo;
    inbreathing: VerificacaoDispositivo;
    emergenciaResult: VerificacaoDispositivo | null;
  }>;
  Q_out_total: number;
  Q_in_total: number;
}

interface MemoriaAPI2000PDFProps {
  projeto: ProjetoAPI2000;
  calculo: CalculoAPI2000;
  logoUrl?: string;
}

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------
const n1 = (v: number | null | undefined) =>
  v !== null && v !== undefined
    ? v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "—";
const n2 = (v: number | null | undefined) =>
  v !== null && v !== undefined
    ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
const fmtDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
const Cabecalho = ({ projeto }: { projeto: ProjetoAPI2000 }) => (
  <View style={s.cabecalho} fixed>
    <Text style={s.cabecalhoMarca}>
      <Text style={s.cabecalhoMarcaVerde}>N</Text>TANK · API 2000
    </Text>
    <Text style={s.cabecalhoProjeto}>
      {projeto.nome}{projeto.cliente ? `  ·  ${projeto.cliente}` : ""}
    </Text>
  </View>
);

const Rodape = () => (
  <View style={s.rodape} fixed>
    <Text>Powered by NTN ENGENHARIA · NTANK · Memória de Cálculo API 2000</Text>
    <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
  </View>
);

const KV = ({ kv }: { kv: ReadonlyArray<readonly [string, string]> }) => (
  <View style={s.kvBox}>
    {kv.map(([k, v]) => (
      <View key={k} style={s.kvLinha}>
        <Text style={s.kvChave}>{k}</Text>
        <Text style={s.kvValor}>{v}</Text>
      </View>
    ))}
  </View>
);

function statusCor(status: string) {
  if (status === "APROVADO") return VERDE;
  if (status === "REPROVADO") return "#EF4444";
  return CARBONO_300;
}

// ---------------------------------------------------------------------------
// Documento principal
// ---------------------------------------------------------------------------
export function MemoriaAPI2000PDF({ projeto, calculo, logoUrl }: MemoriaAPI2000PDFProps) {
  const { respiro, termico, emergencia, verificacoes, Q_out_total, Q_in_total, V_nominal, A_wet, areaRes } = calculo;

  const secoes = [
    "1. Dados de entrada",
    "2. Respiro normal — Outbreathing e Inbreathing",
    ...(projeto.termico.considerar ? ["3. Efeito térmico (Tabela 2)"] : []),
    ...(projeto.emergencia.calcular ? ["4. Emergência por exposição ao fogo externo"] : []),
    ...(projeto.dispositivos.length > 0 ? ["5. Dispositivos de alívio"] : []),
    "6. Resumo — Vazões requeridas",
    ...(
      [...respiro.alertas, ...(projeto.termico.considerar ? termico.alertas : []),
       ...(projeto.emergencia.calcular && emergencia ? emergencia.alertas : [])].length > 0
      ? ["7. Alertas e verificações normativos"] : []
    ),
    "Referências normativas",
    "Aviso técnico — Responsabilidade",
  ];

  return (
    <Document
      title={`NTANK API 2000 · ${projeto.nome}`}
      author="NTN Engenharia"
      subject="Memória de cálculo — Ventilação de tanques (API 2000)"
      keywords="API 2000, ventilação, respiro, VPV, NTANK, NTN"
    >

      {/* =============================== CAPA =============================== */}
      <Page size="A4" style={s.pageCapa}>
        <View style={s.capaTopo} />
        <View style={s.capaCorpo}>
          <View style={s.capaLogoLinha}>
            {logoUrl ? <Image src={logoUrl} style={s.capaLogo} /> : null}
            <Text style={s.capaMarca}>
              <Text style={s.capaMarcaVerde}>N</Text>TANK
            </Text>
          </View>

          <Text style={s.capaTituloDoc}>Memória de Cálculo</Text>
          <Text style={s.capaSub}>
            Ventilação de Tanques · API Standard 2000, 7ª edição (2014)
          </Text>

          <View style={s.capaProjeto}>
            <Text style={s.capaProjLabel}>PROJETO</Text>
            <Text style={s.capaProjNome}>{projeto.nome}</Text>

            {[
              ["TAG do tanque",   projeto.tagTanque],
              ...(projeto.cliente ? [["Cliente", projeto.cliente] as const] : []),
              ...(projeto.local   ? [["Local",   projeto.local]   as const] : []),
              ["Norma de construção", projeto.normaContrucao],
              ["Tipo de tanque",  rotularTipoTanque(projeto.tipoTanque)],
              ["Produto",         projeto.produto.nome || "(não informado)"],
              ["Classe do líquido", `Classe ${projeto.produto.classe}`],
              ["Volume nominal",  `${n1(V_nominal)} m³`],
              ["Área molhada",    `${n1(A_wet)} m²`],
              ["Emitido em",      fmtDataHora(new Date().toISOString())],
            ].map(([k, v]) => (
              <View key={k} style={s.capaProjLinha}>
                <Text style={s.capaProjChave}>{k}</Text>
                <Text style={s.capaProjValor}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.capaRodape}>
          <Text>Powered by NTN ENGENHARIA</Text>
          <Text>www.ntnengenharia.com.br</Text>
        </View>
      </Page>

      {/* ============================= SUMÁRIO ============================== */}
      <Page size="A4" style={s.page}>
        <Cabecalho projeto={projeto} />
        <Text style={s.h1}>Sumário</Text>
        <View style={{ marginTop: 12 }}>
          {secoes.map((titulo, i) => (
            <View key={titulo} style={s.sumarioLinha}>
              <Text style={s.sumarioNum}>{i + 1}.</Text>
              <Text style={s.sumarioTitulo}>{titulo}</Text>
            </View>
          ))}
        </View>
        <Rodape />
      </Page>

      {/* ====================== 1. DADOS DE ENTRADA ========================= */}
      <Page size="A4" style={s.page}>
        <Cabecalho projeto={projeto} />
        <Text style={s.h1}>1. Dados de entrada</Text>

        <Text style={s.h2}>Identificação e geometria</Text>
        <KV kv={[
          ["Nome do cálculo",      projeto.nome],
          ["TAG do tanque",        projeto.tagTanque],
          ...(projeto.cliente ? [["Cliente", projeto.cliente] as const] : []),
          ...(projeto.local   ? [["Local",   projeto.local]   as const] : []),
          ["Norma de construção",  projeto.normaContrucao],
          ["Tipo de tanque",       rotularTipoTanque(projeto.tipoTanque)],
          ["Diâmetro D",           `${n2(projeto.geometria.D_m)} m`],
          ["Altura H",             `${n2(projeto.geometria.H_m)} m`],
          ["Nível máx. de líquido", `${n2(projeto.geometria.H_liq_max_m)} m`],
          ["Volume nominal",       `${n1(V_nominal)} m³  (= π × D² × H / 4)`],
          ["Área molhada A_wet",   projeto.geometria.areaAutoCalculada
            ? `${n1(A_wet)} m²  (= ${n2(areaRes.A_total_ft2)} ft²) — calculada automaticamente`
            : `${n1(A_wet)} m²  (= ${n2(areaRes.A_total_ft2)} ft²) — informada manualmente`],
        ]} />

        <Text style={s.h2}>Produto</Text>
        <KV kv={[
          ["Produto",              projeto.produto.nome || "(não informado)"],
          ["Classe (NBR 17505)",   `Classe ${projeto.produto.classe}`],
          ["Temperatura de armazenamento", `${projeto.produto.T_armazenamento_C} °C`],
          ...(projeto.produto.pontoFulgor_C !== undefined
            ? [["Ponto de fulgor", `${projeto.produto.pontoFulgor_C} °C`] as const] : []),
          ...(projeto.produto.pontoEbulicao_C !== undefined
            ? [["Ponto de ebulição", `${projeto.produto.pontoEbulicao_C} °C`] as const] : []),
          ["Inertização (blanketing)", projeto.produto.blanketing ? "Sim" : "Não"],
          ...(projeto.produto.blanketing && projeto.produto.gasBlanketing
            ? [["Gás de inertização", projeto.produto.gasBlanketing] as const] : []),
          ...(projeto.produto.L_kJ_kg !== null && projeto.produto.L_kJ_kg !== undefined
            ? [["Calor latente L", `${projeto.produto.L_kJ_kg} kJ/kg`] as const] : []),
          ...(projeto.produto.M_kg_kmol !== null && projeto.produto.M_kg_kmol !== undefined
            ? [["Massa molecular M", `${projeto.produto.M_kg_kmol} kg/kmol`] as const] : []),
        ]} />

        <Text style={s.h2}>Operação e pressões</Text>
        <KV kv={[
          ["Vazão máx. de enchimento",    `${n1(projeto.operacao.Q_enchimento_m3h)} m³/h`],
          ["Vazão máx. de esvaziamento",  `${n1(projeto.operacao.Q_esvaziamento_m3h)} m³/h`],
          ["Operações simultâneas",       projeto.operacao.simultaneo ? "Sim" : "Não"],
          ["Recuperação de vapor",        projeto.operacao.recuperacaoVapor ? "Sim" : "Não"],
          ["Pressão de projeto",          `${n2(projeto.pressoes.P_projeto_kPa)} kPa(g)`],
          ["Vácuo de projeto",            `${n2(projeto.pressoes.V_projeto_kPa)} kPa(g)`],
          ...(projeto.pressoes.P_ajuste_VPV_kPa !== null && projeto.pressoes.P_ajuste_VPV_kPa !== undefined
            ? [["Pressão de ajuste VPV", `${projeto.pressoes.P_ajuste_VPV_kPa} kPa(g)`] as const] : []),
          ...(projeto.pressoes.V_ajuste_VPV_kPa !== null && projeto.pressoes.V_ajuste_VPV_kPa !== undefined
            ? [["Vácuo de ajuste VPV", `${projeto.pressoes.V_ajuste_VPV_kPa} kPa(g)`] as const] : []),
          ...(projeto.pressoes.P_max_emergencia_kPa !== null && projeto.pressoes.P_max_emergencia_kPa !== undefined
            ? [["Pressão máx. em emergência", `${projeto.pressoes.P_max_emergencia_kPa} kPa(g)`] as const] : []),
        ]} />

        <Rodape />
      </Page>

      {/* =================== 2. RESPIRO NORMAL ============================ */}
      <Page size="A4" style={s.page}>
        <Cabecalho projeto={projeto} />
        <Text style={s.h1}>2. Respiro normal — Outbreathing e Inbreathing</Text>

        <Text style={s.paragrafo}>
          Cálculo conforme API Standard 2000, 7ª edição (2014), Seção 5 — Normal Venting.
          A vazão mínima física é calculada a partir do deslocamento de líquido (Q_liquid × fator_temperatura),
          sem necessidade de Tabela 1 da norma. Caso os fatores da Tabela 1 sejam informados, adota-se
          o maior entre o mínimo físico e o normativo.
        </Text>

        <Text style={s.h2}>Parâmetros de cálculo</Text>
        <KV kv={[
          ["Vazão de enchimento Q_liquid (outbreathing)", `${n1(projeto.operacao.Q_enchimento_m3h)} m³/h`],
          ["Vazão de esvaziamento Q_liquid (inbreathing)",`${n1(projeto.operacao.Q_esvaziamento_m3h)} m³/h`],
          ["Temperatura de armazenamento",               `${projeto.produto.T_armazenamento_C} °C`],
          ["Fator de outbreathing (Tabela 1)",           projeto.fatoresNormativos.fator_outbreathing !== null
            ? String(projeto.fatoresNormativos.fator_outbreathing) : "Não informado — usando mínimo físico"],
          ["Fator de inbreathing (Tabela 1)",            projeto.fatoresNormativos.fator_inbreathing !== null
            ? String(projeto.fatoresNormativos.fator_inbreathing) : "Não informado — usando mínimo físico"],
          ["Operações simultâneas",                      projeto.operacao.simultaneo ? "Sim" : "Não"],
          ["Inertização (blanketing)",                   projeto.produto.blanketing ? "Sim — sem outbreathing" : "Não"],
        ]} />

        <Text style={s.h2}>Resultados</Text>
        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={{ flex: 2 }}>Cenário</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Nm³/h</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>SCFH</Text>
            <Text style={{ flex: 1 }}>Fonte</Text>
          </View>
          {[
            {
              nome: "Outbreathing (pressão)",
              nm3h: respiro.Q_out_requerido_Nm3h,
              scfh: respiro.Q_out_requerido_SCFH,
              fonte: respiro.usouMinimoFisico ? "Mínimo físico" : "Normativo (Tab. 1)",
            },
            {
              nome: "Inbreathing (vácuo)",
              nm3h: respiro.Q_in_requerido_Nm3h,
              scfh: respiro.Q_in_requerido_SCFH,
              fonte: respiro.usouMinimoFisico ? "Mínimo físico" : "Normativo (Tab. 1)",
            },
          ].map((linha, i) => (
            <View key={linha.nome} style={[s.tabelaLinha, i % 2 === 1 ? s.tabelaLinhaAlt : {}]}>
              <Text style={[s.td, { flex: 2 }]}>{linha.nome}</Text>
              <Text style={[s.tdNumBold, { flex: 1 }]}>{n1(linha.nm3h)}</Text>
              <Text style={[s.tdNum, { flex: 1 }]}>{n1(linha.scfh)}</Text>
              <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>{linha.fonte}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Memória de cálculo — Mínimo físico</Text>
        <Text style={s.itemNorma}>API 2000, 7ª ed. (2014) — Seção 5, Thermal Venting</Text>
        <View style={s.memoriaBox}>
          <Text>
            {"fator_T = 273,15 / (T_arm + 273,15) = 273,15 / (" +
             projeto.produto.T_armazenamento_C + " + 273,15) = " +
             n2(273.15 / (projeto.produto.T_armazenamento_C + 273.15))}
          </Text>
          <Text>{"Q_out_mínimo = Q_enchimento × fator_T = " + n1(projeto.operacao.Q_enchimento_m3h) + " × " + n2(273.15 / (projeto.produto.T_armazenamento_C + 273.15)) + " = " + n1(projeto.operacao.Q_enchimento_m3h * 273.15 / (projeto.produto.T_armazenamento_C + 273.15)) + " Nm³/h"}</Text>
          <Text>{"Q_in_mínimo  = Q_esvaziamento × fator_T = " + n1(projeto.operacao.Q_esvaziamento_m3h) + " × " + n2(273.15 / (projeto.produto.T_armazenamento_C + 273.15)) + " = " + n1(projeto.operacao.Q_esvaziamento_m3h * 273.15 / (projeto.produto.T_armazenamento_C + 273.15)) + " Nm³/h"}</Text>
          {projeto.fatoresNormativos.fator_outbreathing !== null && (
            <Text>{"Q_out_normativo = Q_enchimento × fator_tab1 = " + n1(projeto.operacao.Q_enchimento_m3h) + " × " + projeto.fatoresNormativos.fator_outbreathing + " = " + n1(projeto.operacao.Q_enchimento_m3h * projeto.fatoresNormativos.fator_outbreathing) + " Nm³/h"}</Text>
          )}
          {projeto.fatoresNormativos.fator_inbreathing !== null && (
            <Text>{"Q_in_normativo  = Q_esvaziamento × fator_tab1 = " + n1(projeto.operacao.Q_esvaziamento_m3h) + " × " + projeto.fatoresNormativos.fator_inbreathing + " = " + n1(projeto.operacao.Q_esvaziamento_m3h * projeto.fatoresNormativos.fator_inbreathing) + " Nm³/h"}</Text>
          )}
          <Text>{"Q_out_adotado = max(mínimo físico, normativo) = " + n1(respiro.Q_out_requerido_Nm3h) + " Nm³/h"}</Text>
          <Text>{"Q_in_adotado  = max(mínimo físico, normativo) = " + n1(respiro.Q_in_requerido_Nm3h) + " Nm³/h"}</Text>
        </View>

        <Rodape />
      </Page>

      {/* =================== 3. EFEITO TÉRMICO (opcional) ================== */}
      {projeto.termico.considerar && (
        <Page size="A4" style={s.page}>
          <Cabecalho projeto={projeto} />
          <Text style={s.h1}>3. Efeito térmico (Tabela 2)</Text>

          <Text style={s.paragrafo}>
            O efeito térmico normal (aquecimento solar / variação diária de temperatura) gera
            respiração adicional que pode ser superior ao mínimo de operação.
            A API 2000, 7ª edição (2014), Tabela 2 fornece a vazão equivalente em função
            do volume nominal do tanque, da classe do líquido e da localização geográfica.
          </Text>
          <Text style={s.paragrafo}>
            O usuário deve consultar a Tabela 2 com sua cópia da norma e inserir a
            vazão correspondente. A conversão 1 Nm³/h = 37,326 SCFH é aplicada automaticamente.
          </Text>

          <KV kv={[
            ["Volume nominal",                     `${n1(V_nominal)} m³`],
            ["Classe do líquido",                  `Classe ${projeto.produto.classe}`],
            ["Q térmico (Tabela 2, informado)",    termico.Q_termico_Nm3h !== null
              ? `${n1(termico.Q_termico_Nm3h)} Nm³/h  (= ${n1(termico.Q_termico_SCFH ?? 0)} SCFH)`
              : "Não informado — ⚠ preencher com valor da Tabela 2"],
          ]} />

          {termico.Q_termico_Nm3h !== null ? (
            <View style={s.destaqueBox}>
              <Text style={s.destaqueLabel}>Efeito térmico adotado</Text>
              <Text style={s.destaqueValor}>{n1(termico.Q_termico_Nm3h)} Nm³/h</Text>
              <Text style={{ fontSize: 9, color: PRETO, marginTop: 4 }}>
                = {n1(termico.Q_termico_SCFH ?? 0)} SCFH
              </Text>
            </View>
          ) : (
            <View style={s.avisoBox}>
              <Text style={s.destaque}>⚠  Q térmico não informado.</Text>
              <Text style={{ marginTop: 4 }}>
                Consulte API 2000, 7ª ed. (2014), Tabela 2, e insira a vazão correspondente
                ao volume nominal ({n1(V_nominal)} m³) e à Classe {projeto.produto.classe}.
                O campo Q_termico_Nm3h está pendente de preenchimento.
              </Text>
            </View>
          )}

          {termico.alertas.map((a) => (
            <View key={a.code}
              style={a.nivel === "CRITICO" || a.nivel === "BLOQUEANTE" ? s.erroBox :
                     a.nivel === "ALERTA" ? s.avisoBox : s.infoBox}>
              <Text><Text style={s.destaque}>[{a.code}] </Text>{a.mensagem}</Text>
            </View>
          ))}

          <Rodape />
        </Page>
      )}

      {/* =================== 4. EMERGÊNCIA POR FOGO (opcional) ============= */}
      {projeto.emergencia.calcular && (
        <Page size="A4" style={s.page}>
          <Cabecalho projeto={projeto} />
          <Text style={s.h1}>4. Emergência por exposição ao fogo externo</Text>

          <Text style={s.paragrafo}>
            Cálculo de ventilação de emergência conforme API Standard 2000, 7ª edição (2014),
            Seção 6 — Emergency Venting. A taxa de absorção de calor depende da área molhada
            e do fator ambiental F; a conversão calor → vapor é física pura (lei de conservação).
          </Text>

          <Text style={s.h2}>Parâmetros de entrada</Text>
          <KV kv={[
            ["Modo de entrada",       projeto.emergencia.modo === "calor_calculado"
              ? "Calor calculado (Q_calor_kW + propriedades)"
              : "Vazão direta (Nm³/h informada)"],
            ["Área molhada A_wet",    `${n1(A_wet)} m²  (= ${n2(areaRes.A_total_ft2)} ft²)`],
            ...(projeto.emergencia.F_ambiental !== null
              ? [["Fator ambiental F (Tab. 4)", String(projeto.emergencia.F_ambiental)] as const] : []),
            ...(projeto.emergencia.modo === "calor_calculado" ? [
              ["Q calor absorvido", projeto.emergencia.Q_calor_kW !== null
                ? `${projeto.emergencia.Q_calor_kW} kW` : "Não informado — ⚠"],
              ["Calor latente L", projeto.produto.L_kJ_kg !== null && projeto.produto.L_kJ_kg !== undefined
                ? `${projeto.produto.L_kJ_kg} kJ/kg` : "Não informado — ⚠ (bloqueante)"],
              ["Massa molecular M", projeto.produto.M_kg_kmol !== null && projeto.produto.M_kg_kmol !== undefined
                ? `${projeto.produto.M_kg_kmol} kg/kmol` : "Não informado — ⚠"],
              ["Temperatura de alívio T_alívio", projeto.emergencia.T_alivio_C !== null
                ? `${projeto.emergencia.T_alivio_C} °C` : "Não informada — usando 150 °C (conservador)"],
            ] as ReadonlyArray<readonly [string, string]> : [
              ["Vazão de emergência (direta)", projeto.emergencia.Q_emergencia_direto_Nm3h !== null
                ? `${projeto.emergencia.Q_emergencia_direto_Nm3h} Nm³/h` : "Não informada — ⚠"],
            ] as ReadonlyArray<readonly [string, string]>),
            ["Resfriamento por água",  projeto.emergencia.resfriamentoAgua ? "Sim" : "Não"],
            ["Isolamento aprovado",    projeto.emergencia.isolamentoAprovado ? "Sim" : "Não"],
          ]} />

          {emergencia && (
            <>
              <Text style={s.h2}>Memória de cálculo</Text>
              <Text style={s.itemNorma}>
                {emergencia.referenciaNormativa}
              </Text>
              <View style={s.memoriaBox}>
                <Text>{emergencia.formula}</Text>
              </View>

              <Text style={s.h2}>Resultados</Text>
              <KV kv={[
                ["Taxa de calor absorvido Q_calor", emergencia.Q_calor_kW !== null ? `${n1(emergencia.Q_calor_kW)} kW` : "—"],
                ["Vazão mássica de vapor ṁ",        emergencia.m_vapor_kg_h !== null ? `${n1(emergencia.m_vapor_kg_h)} kg/h` : "—"],
                ["Vazão de vapor Q_vapor",          emergencia.Q_vapor_Nm3h !== null ? `${n2(emergencia.Q_vapor_Nm3h)} Nm³/h` : "—"],
                ["Vazão de emergência requerida",   emergencia.Q_emergencia_Nm3h !== null ? `${n2(emergencia.Q_emergencia_Nm3h)} Nm³/h` : "Dados incompletos — ⚠"],
                ["Vazão de emergência requerida",   emergencia.Q_emergencia_SCFH !== null ? `${n1(emergencia.Q_emergencia_SCFH)} SCFH` : "—"],
              ]} />

              {emergencia.Q_emergencia_Nm3h !== null && (
                <View style={s.destaqueBox}>
                  <Text style={s.destaqueLabel}>Vazão de emergência requerida</Text>
                  <Text style={s.destaqueValor}>{n2(emergencia.Q_emergencia_Nm3h)} Nm³/h</Text>
                  <Text style={{ fontSize: 9, color: PRETO, marginTop: 4 }}>
                    = {n1(emergencia.Q_emergencia_SCFH ?? 0)} SCFH
                  </Text>
                </View>
              )}
            </>
          )}

          <Rodape />
        </Page>
      )}

      {/* ===================== 5. DISPOSITIVOS DE ALÍVIO ==================== */}
      {projeto.dispositivos.length > 0 && (
        <Page size="A4" style={s.page}>
          <Cabecalho projeto={projeto} />
          <Text style={s.h1}>5. Dispositivos de alívio</Text>

          <Text style={s.paragrafo}>
            Verificação de adequação de cada dispositivo de alívio cadastrado às
            vazões requeridas calculadas. Margem = Q_disponível / Q_requerido;
            margem ≥ 1,0 indica aprovação.
          </Text>

          {/* Tabela de dispositivos */}
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={{ width: 50 }}>TAG</Text>
              <Text style={{ width: 70 }}>Tipo</Text>
              <Text style={{ width: 55, textAlign: "right" }}>Cap. P (Nm³/h)</Text>
              <Text style={{ width: 55, textAlign: "right" }}>Cap. V (Nm³/h)</Text>
              <Text style={{ flex: 1 }}>Out.</Text>
              <Text style={{ flex: 1 }}>In.</Text>
              {emergencia?.Q_emergencia_Nm3h !== null && emergencia?.Q_emergencia_Nm3h !== undefined && (
                <Text style={{ flex: 1 }}>Emerg.</Text>
              )}
            </View>
            {verificacoes.map((vrf, idx) => (
              <View key={vrf.dispositivo.id}
                style={[s.tabelaLinha, idx % 2 === 1 ? s.tabelaLinhaAlt : {}]}>
                <Text style={[s.tdBold, { width: 50 }]}>{vrf.dispositivo.tag}</Text>
                <Text style={[s.td, { width: 70 }]}>{vrf.dispositivo.tipo}</Text>
                <Text style={[s.tdNum, { width: 55 }]}>
                  {vrf.dispositivo.capacidade_pressao_Nm3h !== null
                    ? n1(vrf.dispositivo.capacidade_pressao_Nm3h) : "—"}
                </Text>
                <Text style={[s.tdNum, { width: 55 }]}>
                  {vrf.dispositivo.capacidade_vacuo_Nm3h !== null
                    ? n1(vrf.dispositivo.capacidade_vacuo_Nm3h) : "—"}
                </Text>
                <Text style={[s.td, { flex: 1, color: statusCor(vrf.outbreathing.status), fontFamily: "Helvetica-Bold" }]}>
                  {vrf.outbreathing.status}
                  {vrf.outbreathing.margem !== null ? ` (${n2(vrf.outbreathing.margem)}×)` : ""}
                </Text>
                <Text style={[s.td, { flex: 1, color: statusCor(vrf.inbreathing.status), fontFamily: "Helvetica-Bold" }]}>
                  {vrf.inbreathing.status}
                  {vrf.inbreathing.margem !== null ? ` (${n2(vrf.inbreathing.margem)}×)` : ""}
                </Text>
                {emergencia?.Q_emergencia_Nm3h !== null && emergencia?.Q_emergencia_Nm3h !== undefined && (
                  <Text style={[s.td, { flex: 1,
                    color: vrf.emergenciaResult ? statusCor(vrf.emergenciaResult.status) : CARBONO_300,
                    fontFamily: "Helvetica-Bold" }]}>
                    {vrf.emergenciaResult
                      ? `${vrf.emergenciaResult.status}${vrf.emergenciaResult.margem !== null ? ` (${n2(vrf.emergenciaResult.margem)}×)` : ""}`
                      : "—"}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 8, color: CARBONO_500, marginTop: 4 }}>
            Status: APROVADO (margem ≥ 1,0) · REPROVADO (margem &lt; 1,0) · INDETERMINADO (capacidade não informada).
            Corta-chamas reduz capacidade disponível conforme fator do fabricante.
            Verificação preliminar — seleção final exige curva certificada do fabricante.
          </Text>

          <Rodape />
        </Page>
      )}

      {/* ===================== 6. RESUMO CONSOLIDADO ======================== */}
      <Page size="A4" style={s.page}>
        <Cabecalho projeto={projeto} />
        <Text style={s.h1}>6. Resumo — Vazões requeridas</Text>

        <Text style={s.paragrafo}>
          Tabela consolidada de todos os cenários de ventilação calculados.
          O VPV (ou dispositivo principal) deve ter capacidade nominal ≥ à
          maior vazão aplicável ao lado de pressão e ao lado de vácuo.
        </Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={{ flex: 2 }}>Cenário</Text>
            <Text style={{ flex: 1 }}>Norma</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>Nm³/h</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>SCFH</Text>
            <Text style={{ flex: 1 }}>VPV</Text>
          </View>

          <View style={s.tabelaLinha}>
            <Text style={[s.tdBold, { flex: 2 }]}>Outbreathing (enchimento)</Text>
            <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>API 2000, Seção 5</Text>
            <Text style={[s.tdNumBold, { flex: 1 }]}>{n1(respiro.Q_out_requerido_Nm3h)}</Text>
            <Text style={[s.tdNum, { flex: 1 }]}>{n1(respiro.Q_out_requerido_SCFH)}</Text>
            <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>Pressão</Text>
          </View>

          <View style={[s.tabelaLinha, s.tabelaLinhaAlt]}>
            <Text style={[s.tdBold, { flex: 2 }]}>Inbreathing (esvaziamento)</Text>
            <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>API 2000, Seção 5</Text>
            <Text style={[s.tdNumBold, { flex: 1 }]}>{n1(respiro.Q_in_requerido_Nm3h)}</Text>
            <Text style={[s.tdNum, { flex: 1 }]}>{n1(respiro.Q_in_requerido_SCFH)}</Text>
            <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>Vácuo</Text>
          </View>

          {projeto.termico.considerar && termico.Q_termico_Nm3h !== null && (
            <View style={s.tabelaLinha}>
              <Text style={[s.tdBold, { flex: 2 }]}>Efeito térmico normal</Text>
              <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>API 2000, Tabela 2</Text>
              <Text style={[s.tdNumBold, { flex: 1 }]}>{n1(termico.Q_termico_Nm3h)}</Text>
              <Text style={[s.tdNum, { flex: 1 }]}>{n1(termico.Q_termico_SCFH ?? 0)}</Text>
              <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>P e V</Text>
            </View>
          )}

          {projeto.emergencia.calcular && emergencia?.Q_emergencia_Nm3h !== null && emergencia?.Q_emergencia_Nm3h !== undefined && (
            <View style={[s.tabelaLinha, s.tabelaLinhaAlt]}>
              <Text style={[s.tdBold, { flex: 2 }]}>Emergência por fogo</Text>
              <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>API 2000, Seção 6</Text>
              <Text style={[s.tdNumBold, { flex: 1 }]}>{n1(emergencia.Q_emergencia_Nm3h)}</Text>
              <Text style={[s.tdNum, { flex: 1 }]}>{n1(emergencia.Q_emergencia_SCFH ?? 0)}</Text>
              <Text style={[s.td, { flex: 1, color: CARBONO_500 }]}>Emerg.</Text>
            </View>
          )}

          {/* Linha VPV pressão */}
          <View style={{ flexDirection: "row", backgroundColor: "#1a2e00", paddingVertical: 6, paddingHorizontal: 4 }}>
            <Text style={[s.tdBold, { flex: 2, color: VERDE }]}>VPV pressão — dimensionar ≥</Text>
            <Text style={[s.td, { flex: 1, color: CARBONO_300 }]}>max(out, térmico)</Text>
            <Text style={[s.tdNumBold, { flex: 1, color: VERDE, fontSize: 10 }]}>{n1(Q_out_total)}</Text>
            <Text style={[s.tdNum, { flex: 1, color: VERDE }]}>{n1(nm3hParaScfh(Q_out_total))}</Text>
            <Text style={[s.tdBold, { flex: 1, color: VERDE }]}>Pressão</Text>
          </View>
          <View style={{ flexDirection: "row", backgroundColor: PRETO, paddingVertical: 6, paddingHorizontal: 4 }}>
            <Text style={[s.tdBold, { flex: 2, color: VERDE }]}>VPV vácuo — dimensionar ≥</Text>
            <Text style={[s.td, { flex: 1, color: CARBONO_300 }]}>max(in, térmico)</Text>
            <Text style={[s.tdNumBold, { flex: 1, color: VERDE, fontSize: 10 }]}>{n1(Q_in_total)}</Text>
            <Text style={[s.tdNum, { flex: 1, color: VERDE }]}>{n1(nm3hParaScfh(Q_in_total))}</Text>
            <Text style={[s.tdBold, { flex: 1, color: VERDE }]}>Vácuo</Text>
          </View>
        </View>

        <Text style={{ fontSize: 8, color: CARBONO_500, marginTop: 4 }}>
          Conversão: 1 Nm³/h (0 °C, 101,325 kPa) = 37,326 SCFH (60 °F, 14,696 psia).
          Referência: API Standard 2000, 7ª edição (2014).
          Cálculo preliminar — não substitui seleção final de dispositivo com curva certificada do fabricante e ART/RRT.
        </Text>

        <Rodape />
      </Page>

      {/* ===================== 7. ALERTAS (se houver) ======================== */}
      {(() => {
        const todosAlertas = [
          ...respiro.alertas,
          ...(projeto.termico.considerar ? termico.alertas : []),
          ...(projeto.emergencia.calcular && emergencia ? emergencia.alertas : []),
        ].filter((a, i, arr) => arr.findIndex((x) => x.code === a.code) === i);

        return todosAlertas.length > 0 ? (
          <Page size="A4" style={s.page}>
            <Cabecalho projeto={projeto} />
            <Text style={s.h1}>7. Alertas e verificações normativos</Text>
            <Text style={s.paragrafo}>
              Os alertas abaixo foram gerados automaticamente com base nos dados inseridos.
              Alertas críticos e bloqueantes impedem o resultado final — preencher os campos
              indicados antes de usar esta memória de cálculo como documento de projeto.
            </Text>
            <View style={{ gap: 4 }}>
              {todosAlertas.map((a) => (
                <View key={a.code}
                  style={
                    a.nivel === "CRITICO" || a.nivel === "BLOQUEANTE" ? s.erroBox :
                    a.nivel === "ALERTA" ? s.avisoBox : s.infoBox
                  }>
                  <Text>
                    <Text style={s.destaque}>[{a.code}] [{a.nivel}]  </Text>
                    {a.mensagem}
                  </Text>
                </View>
              ))}
            </View>
            <Rodape />
          </Page>
        ) : null;
      })()}

      {/* =================== REFERÊNCIAS NORMATIVAS ========================= */}
      <Page size="A4" style={s.page}>
        <Cabecalho projeto={projeto} />
        <Text style={s.h1}>Referências normativas</Text>

        <Text style={s.paragrafo}>
          Os cálculos deste documento aplicam fórmulas dos seguintes documentos
          (citados por item/seção, sem reproduzir texto, tabelas ou figuras protegidos).
        </Text>

        <View style={{ paddingLeft: 12, gap: 8, marginTop: 8 }}>
          <Text>
            · <Text style={s.destaque}>API Standard 2000, 7ª edição (2014)</Text>
            {" "}— Venting Atmospheric and Low-Pressure Storage Tanks.
            Seção 5 (Normal Venting), Seção 6 (Emergency Venting), Tabela 2 (Thermal Venting).
          </Text>
          <Text>
            · <Text style={s.destaque}>ABNT NBR 17505</Text>
            {" "}— Armazenamento de líquidos inflamáveis e combustíveis.
            Aplicado na classificação dos líquidos (Classe IA, IB, IC, II, IIIA, IIIB).
          </Text>
        </View>

        <View style={{ marginTop: 30, paddingTop: 12, borderTopColor: PRETO, borderTopWidth: 1 }}>
          <Text style={{ fontSize: 8, color: CARBONO_500 }}>
            Documento emitido em {fmtDataHora(new Date().toISOString())}.
            Emitido via NTANK · Powered by NTN Engenharia · www.ntnengenharia.com.br
          </Text>
        </View>

        <Rodape />
      </Page>

      {/* ====================== AVISO TÉCNICO / DISCLAIMER ================= */}
      <Page size="A4" style={s.page}>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: PRETO, marginBottom: 8 }}>
            Aviso Técnico — Responsabilidade do Usuário
          </Text>
          <View style={{ borderBottomWidth: 2, borderBottomColor: VERDE, marginBottom: 16 }} />
          <View style={{
            backgroundColor: "#FFF8E1",
            borderLeftWidth: 4, borderLeftColor: BORDA_AVISO,
            padding: 16, borderRadius: 2, marginBottom: 16,
          }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: "#92400E", marginBottom: 6 }}>
              ⚠  Este documento tem caráter informativo e de suporte ao projeto.
            </Text>
            <Text style={{ fontSize: 10, color: "#78350F", lineHeight: 1.6 }}>
              Os cálculos apresentados nesta memória foram elaborados com base no
              API Standard 2000, 7ª edição (2014), utilizando os parâmetros inseridos pelo
              usuário e os métodos implementados no software NTANK (NTN Engenharia).
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>
            Os resultados obtidos <Text style={{ fontFamily: "Helvetica-Bold" }}>devem obrigatoriamente ser verificados, validados e aprovados
            por um Engenheiro Mecânico ou de Segurança legalmente habilitado</Text>, registrado no CREA,
            conforme Lei Federal n.º 5.194/1966.
          </Text>
          <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>
            A seleção final do dispositivo de alívio (VPV, respiro aberto, hatch de emergência)
            deve ser feita com a curva de capacidade certificada do fabricante, análise HAZOP e
            emissão de ART/RRT pelo responsável técnico do projeto.
          </Text>
          {[
            "Verificar a edição vigente das normas na data de execução do projeto;",
            "Validar os fatores da Tabela 1 e Tabela 2 da API 2000 com a cópia licenciada da norma;",
            "Obter as aprovações exigidas pelos órgãos competentes (ANP, CBMSP, órgãos ambientais);",
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

      {/* ======================== CTA — NTN ENGENHARIA ====================== */}
      <Page size="A4" style={s.pageCapa}>
        <View style={s.capaTopo} />
        <View style={{ flex: 1, paddingHorizontal: 50, paddingTop: 80, paddingBottom: 60, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 28, color: VERDE, marginBottom: 8, textAlign: "center" }}>
            Precisa executar este projeto?
          </Text>
          <Text style={{ fontSize: 13, color: "#FFFFFF", textAlign: "center", marginBottom: 40, lineHeight: 1.6, maxWidth: 400 }}>
            A NTN Engenharia realiza o projeto detalhado de ventilação, fabricação e montagem
            de tanques de armazenamento de combustíveis — da concepção ao start-up.
          </Text>
          <View style={{ backgroundColor: VERDE, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 4, marginBottom: 32 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: PRETO, textAlign: "center" }}>
              Entre em contato e receba um orçamento
            </Text>
          </View>
          <View style={{ gap: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 11, color: VERDE, fontFamily: "Helvetica-Bold" }}>WhatsApp: (19) 99751-4035</Text>
            <Text style={{ fontSize: 11, color: "#FFFFFF" }}>wa.me/5519997514035</Text>
            <Text style={{ fontSize: 11, color: "#FFFFFF", marginTop: 8 }}>contato@ntnengenharia.com.br</Text>
            <Text style={{ fontSize: 11, color: "#FFFFFF" }}>www.ntnengenharia.com.br</Text>
          </View>
        </View>
        <View style={s.capaRodape}>
          <Text>Powered by NTN ENGENHARIA</Text>
          <Text>www.ntnengenharia.com.br</Text>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rotularTipoTanque(tipo: string): string {
  switch (tipo) {
    case "vertical-teto-fixo":               return "Vertical — teto fixo";
    case "vertical-teto-flutuante-interno":  return "Vertical — teto flutuante interno";
    case "vertical-teto-flutuante-externo":  return "Vertical — teto flutuante externo";
    case "horizontal":                       return "Horizontal";
    default:                                 return tipo;
  }
}
