/**
 * Memória de cálculo NTANK — API 653 (Inspeção e Vida Útil de Tanques).
 *
 * Layout segue identidade NTN/NTANK (verde #ADD91C, preto, Helvetica).
 *
 * IMPORTANTE: este documento NÃO reproduz texto, tabelas nem figuras da norma
 * API 653. Cita apenas o número da seção/item normativo e implementa as
 * fórmulas matemáticas (MAST, CR, RUL), que não têm copyright.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  avaliarCostado,
  calcularMAOLL,
  avaliarFundo,
  avaliarTeto,
  calcularProximaInspecao,
  T_MIN_FUNDO_MM,
  T_MIN_TETO_MM,
  type ResultadoVerificacaoCurso,
  type ResultadoAvaliacaoCostado,
  type ResultadoMAOLL,
  type ResultadoAvaliacaoFundo,
  type ResultadoAvaliacaoTeto,
  type ResultadoProximaInspecao,
} from "@ntank/calc-core";
import type { ProjetoAPI653 } from "@/lib/api653-projeto";

// ---------------------------------------------------------------------------
// Paleta
// ---------------------------------------------------------------------------
const VERDE       = "#ADD91C";
const PRETO       = "#0A0A0A";
const CARBONO_700 = "#262626";
const CARBONO_500 = "#525252";
const CARBONO_300 = "#A3A3A3";
const CARBONO_100 = "#E5E5E5";
const CREME       = "#ECECE3";

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: 56,
    paddingBottom: 48,
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
  capaTopo:      { backgroundColor: VERDE, height: 8 },
  capaCorpo:     { flex: 1, paddingHorizontal: 50, paddingTop: 70, paddingBottom: 60, color: "#FFFFFF" },
  capaMarca:     { fontFamily: "Helvetica-Bold", fontSize: 38, letterSpacing: -1 },
  capaMarcaV:    { color: VERDE },
  capaTituloDoc: { fontFamily: "Helvetica-Bold", fontSize: 22, marginTop: 72, color: "#FFFFFF", lineHeight: 1.2 },
  capaSub:       { fontSize: 12, marginTop: 8, color: CARBONO_300 },
  capaProjeto:   { marginTop: 48, paddingTop: 16, borderTopColor: VERDE, borderTopWidth: 1 },
  capaProjLabel: { fontSize: 8, letterSpacing: 1.5, color: VERDE, marginBottom: 4 },
  capaProjNome:  { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 14 },
  capaRow:       { flexDirection: "row", marginBottom: 5 },
  capaLabel:     { width: 100, color: CARBONO_300, fontSize: 8 },
  capaValor:     { flex: 1, color: "#FFFFFF", fontSize: 9 },
  capaRodape:    { borderTopColor: "#333", borderTopWidth: 1, paddingTop: 10, marginTop: "auto" },
  capaRodapeTxt: { fontSize: 8, color: CARBONO_300 },

  // Cabeçalho/rodapé internos
  header:      { position: "absolute", top: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomColor: CARBONO_100, borderBottomWidth: 0.5, paddingBottom: 4 },
  headerMarca: { fontFamily: "Helvetica-Bold", fontSize: 9, color: PRETO },
  headerVerde: { color: VERDE },
  headerInfo:  { fontSize: 8, color: CARBONO_500 },
  footer:      { position: "absolute", bottom: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopColor: CARBONO_100, borderTopWidth: 0.5, paddingTop: 4 },
  footerTxt:   { fontSize: 7, color: CARBONO_300 },

  // Seções
  h2: { fontFamily: "Helvetica-Bold", fontSize: 11, color: PRETO, marginBottom: 6, marginTop: 14, paddingBottom: 4, borderBottomColor: VERDE, borderBottomWidth: 2 },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 9, color: CARBONO_700, marginBottom: 4, marginTop: 8 },

  // Tabelas
  table:    { borderWidth: 0.5, borderColor: CARBONO_300, borderRadius: 3 },
  tRow:     { flexDirection: "row", borderBottomColor: CARBONO_100, borderBottomWidth: 0.5 },
  tRowLast: { flexDirection: "row" },
  tHead:    { backgroundColor: CREME },
  tCell:    { padding: 4, flex: 1, fontSize: 8 },
  tCellBold:{ padding: 4, flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tLabel:   { width: 160, padding: 4, fontSize: 8, color: CARBONO_500 },
  tValue:   { flex: 1, padding: 4, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },

  // Status
  statusOk:  { backgroundColor: "#d1fae5", color: "#065f46", padding: 3, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  statusErr: { backgroundColor: "#fee2e2", color: "#991b1b", padding: 3, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  statusWar: { backgroundColor: "#fef3c7", color: "#92400e", padding: 3, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  // Alertas
  alertaCritico: { backgroundColor: "#fee2e2", borderLeftColor: "#dc2626", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaAviso:   { backgroundColor: "#fef3c7", borderLeftColor: "#d97706", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaInfo:    { backgroundColor: "#dbeafe", borderLeftColor: "#2563eb", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaTxt:     { fontSize: 7.5, lineHeight: 1.4 },

  // Memo
  memoBox:   { backgroundColor: CREME, padding: 8, borderRadius: 4, marginBottom: 10 },
  memoTitulo:{ fontFamily: "Helvetica-Bold", fontSize: 9, color: CARBONO_700, marginBottom: 5 },
  memoLinha: { fontSize: 8, fontFamily: "Courier", lineHeight: 1.6, color: CARBONO_700 },
  memoLinhaB:{ fontSize: 8, fontFamily: "Courier-Bold", lineHeight: 1.6, color: PRETO },
  memoLabel: { fontSize: 8, color: CARBONO_500, fontFamily: "Courier" },

  // Sumário — bloco de item
  sumarioItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, borderBottomColor: CARBONO_100, borderBottomWidth: 0.5 },
  sumarioLabel: { fontSize: 9, color: CARBONO_500 },
  sumarioValor: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  // Disclaimer
  disclaimer: { backgroundColor: CREME, padding: 8, borderRadius: 4, marginTop: 10 },
  discTxt:    { fontSize: 7.5, color: CARBONO_500, lineHeight: 1.5 },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtMm   = (v: number | null | undefined, dec = 2) =>
  v == null ? "—" : v.toFixed(dec).replace(".", ",") + " mm";
const fmtAnos = (v: number | null | undefined) =>
  v == null ? "∞" : v === 0 ? "0 anos" : v.toFixed(1).replace(".", ",") + " anos";
const fmtData = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
};
const fmtNum = (v: number, dec = 3) => v.toFixed(dec).replace(".", ",");

// ---------------------------------------------------------------------------
// Componentes base
// ---------------------------------------------------------------------------

function HeaderPagina({ tag }: { tag: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerMarca}>
        <Text style={s.headerVerde}>N</Text>TANK — API 653
      </Text>
      <Text style={s.headerInfo}>{tag}</Text>
    </View>
  );
}

function RodapePagina() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>
        NTN Engenharia · www.ntnengenharia.com.br · {new Date().toLocaleDateString("pt-BR")}
      </Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Secao({ titulo }: { titulo: string }) {
  return <Text style={s.h2}>{titulo}</Text>;
}

function AlertaPDF({ nivel, mensagem }: { nivel: string; mensagem: string }) {
  const estilo = nivel === "CRITICO" ? s.alertaCritico : nivel === "ALERTA" ? s.alertaAviso : s.alertaInfo;
  const icone  = nivel === "CRITICO" ? "! " : nivel === "ALERTA" ? "! " : "i ";
  return <View style={estilo}><Text style={s.alertaTxt}>{icone}{mensagem}</Text></View>;
}

function BadgeStatus({ status }: { status: string }) {
  const estilo = status === "APROVADO" ? s.statusOk : status === "CRITICO" ? s.statusWar : s.statusErr;
  return <Text style={estilo}>{status}</Text>;
}

// ---------------------------------------------------------------------------
// Capa
// ---------------------------------------------------------------------------

function Capa({ p }: { p: ProjetoAPI653 }) {
  return (
    <Page size="A4" style={s.pageCapa}>
      <View style={s.capaTopo} />
      <View style={s.capaCorpo}>
        <Text style={s.capaMarca}><Text style={s.capaMarcaV}>N</Text>TANK</Text>
        <Text style={s.capaTituloDoc}>Laudo de Inspeção{"\n"}e Vida Útil de Tanque</Text>
        <Text style={s.capaSub}>API Standard 653 — 5ª Edição</Text>

        <View style={s.capaProjeto}>
          <Text style={s.capaProjLabel}>IDENTIFICAÇÃO DO PROJETO</Text>
          <Text style={s.capaProjNome}>{p.nome}</Text>
          {[
            ["TAG do tanque",       p.tagTanque],
            ["Cliente",             p.cliente ?? "—"],
            ["Localidade",          p.local ?? "—"],
            ["Data da inspeção",    fmtData(p.dataInspecao)],
            ["Responsável técnico", p.responsavelAnalise || "—"],
            ["Metodologia",         p.metodologia],
            ["Norma de construção", p.normaConstrucao],
            ["Gerado em",           new Date().toLocaleDateString("pt-BR")],
          ].map(([label, valor]) => (
            <View key={label} style={s.capaRow}>
              <Text style={s.capaLabel}>{label}</Text>
              <Text style={s.capaValor}>{valor}</Text>
            </View>
          ))}
        </View>

        <View style={s.capaRodape}>
          <Text style={s.capaRodapeTxt}>
            Documento gerado pelo NTANK — NTN Engenharia.{"\n"}
            Este laudo não reproduz texto da norma API 653. Cálculos baseados em fórmulas
            matemáticas de domínio público referenciadas na norma.{"\n"}
            Não substitui julgamento de engenheiro inspetor habilitado (ART/RRT).
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Sumário Executivo
// ---------------------------------------------------------------------------

function PaginaSumario({
  p,
  costado,
  fundo,
  teto,
  maoll,
  proximaInspecao,
}: {
  p: ProjetoAPI653;
  costado: ResultadoAvaliacaoCostado | null;
  fundo: ResultadoAvaliacaoFundo | null;
  teto: ResultadoAvaliacaoTeto | null;
  maoll: ResultadoMAOLL | null;
  proximaInspecao: ResultadoProximaInspecao;
}) {
  const statusGeral =
    costado?.costadoAprovado === false || fundo?.status === "REPROVADO" || teto?.status === "REPROVADO"
      ? "REPROVADO"
      : costado?.cursoCritico && (costado.cursoCritico.status === "CRITICO" || costado.cursoCritico.status === "REPROVADO")
      ? "CRÍTICO"
      : fundo?.status === "CRITICO" || teto?.status === "CRITICO"
      ? "CRÍTICO"
      : "APROVADO";

  const corStatus =
    statusGeral === "REPROVADO" ? "#991b1b" :
    statusGeral === "CRÍTICO"   ? "#92400e" : "#065f46";
  const bgStatus =
    statusGeral === "REPROVADO" ? "#fee2e2" :
    statusGeral === "CRÍTICO"   ? "#fef3c7" : "#d1fae5";

  const itens = [
    ["Status geral do tanque",        statusGeral],
    ["Anel crítico (menor RUL)",      costado?.cursoCritico ? `Anel #${costado.cursoCritico.numero}` : "—"],
    ["RUL do costado",                fmtAnos(costado?.RUL_costado_anos)],
    ["RUL do fundo",                  fundo ? fmtAnos(fundo.RUL_anos) : "Não avaliado"],
    ["RUL do teto",                   teto  ? fmtAnos(teto.RUL_anos)  : "Não avaliado"],
    ["RUL crítico (componente min.)", fmtAnos(proximaInspecao.RUL_critico_anos)],
    ["MAOLL",                         maoll ? fmtNum(maoll.MAOLL_m, 2) + " m" : "—"],
    ["Re-rating necessário",          maoll?.reratingNecessario ? "SIM" : "NÃO"],
    ["Próxima inspeção INTERNA",      fmtData(proximaInspecao.dataProximaInterna)],
    ["Próxima inspeção EXTERNA",      fmtData(proximaInspecao.dataProximaExterna)],
  ];

  const sumario = [
    ["1. Parâmetros do Tanque",         "2"],
    ["2. Resumo do Costado",            "2"],
    ["3. Memorial de Cálculo por Anel", "3"],
    ["4. MAOLL",                        "4"],
    ["5. Fundo",                        "4"],
    ["6. Teto",                         "4"],
    ["7. Próxima Inspeção",             "4"],
  ];

  return (
    <Page size="A4" style={s.page}>
      <HeaderPagina tag={p.tagTanque} />
      <RodapePagina />

      {/* Situação geral */}
      <View style={{ backgroundColor: bgStatus, borderRadius: 6, padding: 14, marginBottom: 14, alignItems: "center" }}>
        <Text style={{ fontSize: 7.5, color: corStatus, letterSpacing: 1.5, marginBottom: 4 }}>
          SITUAÇÃO GERAL DO TANQUE
        </Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, color: corStatus }}>
          {statusGeral}
        </Text>
        <Text style={{ fontSize: 8, color: corStatus, marginTop: 4 }}>
          {p.tagTanque} · Inspeção: {fmtData(p.dataInspecao)} · {p.metodologia}
        </Text>
      </View>

      {/* Resumo executivo */}
      <Secao titulo="Resumo Executivo" />
      <View style={s.table}>
        {itens.map(([label, valor], idx) => (
          <View key={label} style={idx < itens.length - 1 ? s.tRow : s.tRowLast}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={[s.tValue, { color: label.includes("Status") && valor !== "APROVADO" ? (valor === "REPROVADO" ? "#991b1b" : "#92400e") : PRETO }]}>
              {valor}
            </Text>
          </View>
        ))}
      </View>

      {/* Índice */}
      <Secao titulo="Índice" />
      <View style={s.table}>
        {sumario.map(([titulo, pag], idx) => (
          <View key={titulo} style={idx < sumario.length - 1 ? s.tRow : s.tRowLast}>
            <Text style={[s.tLabel, { flex: 1 }]}>{titulo}</Text>
            <Text style={[s.tValue, { width: 40, flex: 0, color: CARBONO_500 }]}>pág. {pag}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Parâmetros + resumo do costado
// ---------------------------------------------------------------------------

function PaginaParametros({ p, costado }: { p: ProjetoAPI653; costado: ResultadoAvaliacaoCostado }) {
  return (
    <Page size="A4" style={s.page}>
      <HeaderPagina tag={p.tagTanque} />
      <RodapePagina />

      <Secao titulo="1. Parâmetros do Tanque" />
      <View style={[s.table, { marginBottom: 10 }]}>
        {[
          ["Diâmetro interno D",     `${fmtNum(p.geometria.D_m, 3)} m`],
          ["Altura total H",         `${fmtNum(p.geometria.H_m, 2)} m`],
          ["Número de anéis",        String(p.cursos.length)],
          ["Nível de projeto H_liq", `${fmtNum(p.H_liq_m, 2)} m`],
          ["Produto armazenado",     p.produto.nome || "—"],
          ["Densidade relativa G",   fmtNum(p.produto.G, 3)],
          ["Tensão admissível S",    `${fmtNum(p.material.S_MPa, 1)} MPa`],
          ["Eficiência de junta E",  fmtNum(p.material.E, 2)],
          ["CR global assumida",     `${fmtNum(p.CR_global_mm_ano, 3)} mm/ano`],
        ].map(([label, valor], idx, arr) => (
          <View key={label} style={idx < arr.length - 1 ? s.tRow : s.tRowLast}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={s.tValue}>{valor}</Text>
          </View>
        ))}
      </View>

      <Secao titulo="2. Resumo do Costado" />
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
        <View style={{ flex: 1, backgroundColor: costado.costadoAprovado ? "#d1fae5" : "#fee2e2", borderRadius: 6, padding: 10, alignItems: "center" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: costado.costadoAprovado ? "#065f46" : "#991b1b" }}>
            {costado.costadoAprovado ? "APROVADO" : "REPROVADO"}
          </Text>
          <Text style={{ fontSize: 8, color: CARBONO_500, marginTop: 3 }}>Status Geral</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: CREME, borderRadius: 6, padding: 10, alignItems: "center" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14 }}>{fmtAnos(costado.RUL_costado_anos)}</Text>
          <Text style={{ fontSize: 8, color: CARBONO_500, marginTop: 3 }}>RUL do Costado</Text>
        </View>
        {costado.cursoCritico && (
          <View style={{ flex: 1, backgroundColor: CREME, borderRadius: 6, padding: 10, alignItems: "center" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14 }}>Anel #{costado.cursoCritico.numero}</Text>
            <Text style={{ fontSize: 8, color: CARBONO_500, marginTop: 3 }}>Anel Crítico</Text>
          </View>
        )}
      </View>

      {/* Tabela resumo por anel */}
      <View style={s.table}>
        <View style={[s.tRow, s.tHead]}>
          {["Anel", "t nom.", "t med.", "t mín.", "CR", "RUL", "Camps.", "Status"].map((h) => (
            <Text key={h} style={[s.tCell, { fontFamily: "Helvetica-Bold", fontSize: 7.5 }]}>{h}</Text>
          ))}
        </View>
        {costado.cursos.map((r, idx) => (
          <View key={r.numero} style={idx < costado.cursos.length - 1 ? s.tRow : s.tRowLast}>
            <Text style={s.tCell}>{r.numero}</Text>
            <Text style={s.tCell}>{fmtMm(r.t_nominal_mm)}</Text>
            <Text style={s.tCell}>{fmtMm(r.t_medida_mm)}</Text>
            <Text style={s.tCell}>{fmtMm(r.t_min_mm, 3)}</Text>
            <Text style={s.tCell}>{fmtNum(r.CR_mm_ano, 3)}</Text>
            <Text style={[s.tCell, { fontFamily: "Helvetica-Bold" }]}>{fmtAnos(r.RUL_anos)}</Text>
            <Text style={[s.tCell, { color: CARBONO_500 }]}>{r.n_medicoes}x</Text>
            <View style={{ ...s.tCell, justifyContent: "center" }}>
              <BadgeStatus status={r.status} />
            </View>
          </View>
        ))}
      </View>

      {costado.alertas.filter(a => a.nivel !== "AVISO_LEGAL").length > 0 && (
        <View style={{ marginTop: 8 }}>
          {costado.alertas.filter(a => a.nivel !== "AVISO_LEGAL").map((a, i) => (
            <AlertaPDF key={i} nivel={a.nivel} mensagem={a.mensagem} />
          ))}
        </View>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Memorial de cálculo por anel
// ---------------------------------------------------------------------------

function MemoAnel({ r, p }: { r: ResultadoVerificacaoCurso; p: ProjetoAPI653 }) {
  const temHistorico = r.CR_historica_mm_ano != null && r.anos_entre_inspecoes != null;

  return (
    <View style={s.memoBox} wrap={false}>
      <Text style={s.memoTitulo}>
        Anel {r.numero} — Cota base: {fmtNum(r.cota_base_m, 2)} m · Altura: {fmtNum(r.altura_m, 2)} m
        {r.n_medicoes > 1 ? `  [${r.n_medicoes} campanhas]` : ""}
      </Text>

      <Text style={[s.memoLabel, { marginBottom: 2 }]}>1. MAST — Espessura mínima aceitável (API 653 §4.3.2)</Text>
      <Text style={s.memoLinha}>{"  "}t_min = 2,6 x D x H_liq x G / (S x E)</Text>
      <Text style={s.memoLinha}>{"  "}H_liq acima do 1-foot = {fmtNum(r.H_liq_acima_m, 3)} m</Text>
      <Text style={s.memoLinhaB}>
        {"  "}t_min = 2,6 x {fmtNum(p.geometria.D_m, 3)} x {fmtNum(r.H_liq_acima_m, 3)} x {fmtNum(p.produto.G, 3)} / ({fmtNum(p.material.S_MPa, 1)} x {fmtNum(p.material.E, 2)}) = {fmtMm(r.t_min_mm, 3)}
      </Text>
      <Text style={[s.memoLinha, { color: r.t_medida_mm >= r.t_min_mm ? "#065f46" : "#991b1b" }]}>
        {"  "}{"t_medida ("}{fmtMm(r.t_medida_mm)}{")"}{" "}{r.t_medida_mm >= r.t_min_mm ? ">=" : "<"}{" t_min ("}{fmtMm(r.t_min_mm, 3)}{")"}{" -> "}{r.t_medida_mm >= r.t_min_mm ? "APROVADO" : "REPROVADO"}
      </Text>

      <Text style={[s.memoLabel, { marginTop: 5, marginBottom: 2 }]}>
        2. Taxa de corrosão (CR){r.n_medicoes > 2 ? ` — regressao linear (${r.n_medicoes} campanhas)` : ""}
      </Text>
      {temHistorico ? (
        <>
          {r.n_medicoes <= 2 ? (
            <>
              <Text style={s.memoLinha}>{"  "}CR_historica = (t_anterior - t_medida) / anos</Text>
              <Text style={s.memoLinha}>{"  "}= ({fmtMm(r.t_anterior_mm)} - {fmtMm(r.t_medida_mm)}) / {fmtNum(r.anos_entre_inspecoes!, 2)} anos</Text>
            </>
          ) : (
            <Text style={s.memoLinha}>{"  "}Regressao linear: span = {fmtNum(r.anos_entre_inspecoes!, 2)} anos</Text>
          )}
          <Text style={s.memoLinhaB}>{"  "}CR_historica = {fmtNum(r.CR_historica_mm_ano!, 3)} mm/ano</Text>
          <Text style={s.memoLinha}>{"  "}CR_assumida = {fmtNum(r.CR_assumida_mm_ano, 3)} mm/ano</Text>
          <Text style={s.memoLinhaB}>{"  "}CR_adotada = max(CR_hist, CR_ass) = {fmtNum(r.CR_mm_ano, 3)} mm/ano</Text>
        </>
      ) : (
        <>
          <Text style={s.memoLinha}>{"  "}Sem historico anterior. CR = taxa assumida pelo operador.</Text>
          <Text style={s.memoLinhaB}>{"  "}CR_adotada = {fmtNum(r.CR_mm_ano, 3)} mm/ano</Text>
        </>
      )}

      <Text style={[s.memoLabel, { marginTop: 5, marginBottom: 2 }]}>3. Vida util restante — RUL</Text>
      {r.t_medida_mm < r.t_min_mm ? (
        <Text style={[s.memoLinhaB, { color: "#991b1b" }]}>{"  t_medida < t_min -> Anel REPROVADO. RUL = 0"}</Text>
      ) : r.CR_mm_ano <= 0 ? (
        <Text style={[s.memoLinhaB, { color: "#065f46" }]}>{"  CR = 0 -> Vida util indeterminada"}</Text>
      ) : (
        <>
          <Text style={s.memoLinha}>{"  "}RUL = (t_medida - t_min) / CR</Text>
          <Text style={s.memoLinha}>{"  "}t_sobra = {fmtMm(r.t_medida_mm)} - {fmtMm(r.t_min_mm, 3)} = {fmtMm(r.t_sobra_mm)}</Text>
          <Text style={s.memoLinhaB}>
            {"  "}RUL = {fmtMm(r.t_sobra_mm)} / {fmtNum(r.CR_mm_ano, 3)} mm/ano = {r.RUL_anos != null ? fmtNum(r.RUL_anos, 2) : "inf"} anos
          </Text>
        </>
      )}
      <Text style={[s.memoLinha, {
        color: r.status === "APROVADO" ? "#065f46" : r.status === "CRITICO" ? "#92400e" : "#991b1b",
        fontFamily: "Courier-Bold", marginTop: 2,
      }]}>{"  "}Status: {r.status}</Text>
    </View>
  );
}

function PaginaMemoriais({ p, costado }: { p: ProjetoAPI653; costado: ResultadoAvaliacaoCostado }) {
  return (
    <Page size="A4" style={s.page}>
      <HeaderPagina tag={p.tagTanque} />
      <RodapePagina />

      <Secao titulo="3. Memorial de Cálculo por Anel" />
      <Text style={{ fontSize: 8, color: CARBONO_500, marginBottom: 10 }}>
        Referência: MAST — API 653 §4.3.2 (formula 1-Foot Method da API 650 §5.6.3).
        RUL = (t_medida - t_min) / CR. CR por regressao linear quando há 3+ campanhas.
      </Text>

      {costado.cursos.map((r) => (
        <MemoAnel key={r.numero} r={r} p={p} />
      ))}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// MAOLL + Fundo + Teto + Próxima Inspeção
// ---------------------------------------------------------------------------

function PaginaResultados({
  p,
  maoll,
  fundo,
  teto,
  proximaInspecao,
}: {
  p: ProjetoAPI653;
  maoll: ResultadoMAOLL;
  fundo: ResultadoAvaliacaoFundo | null;
  teto: ResultadoAvaliacaoTeto | null;
  proximaInspecao: ResultadoProximaInspecao;
}) {
  return (
    <Page size="A4" style={s.page}>
      <HeaderPagina tag={p.tagTanque} />
      <RodapePagina />

      {/* MAOLL */}
      <Secao titulo="4. MAOLL — Nível Máximo de Operação Permitido" />
      <View style={[s.table, { marginBottom: 12 }]}>
        {[
          ["H projeto (m)",          fmtNum(p.H_liq_m, 2) + " m"],
          ["MAOLL (m)",              fmtNum(maoll.MAOLL_m, 2) + " m"],
          ["Volume no MAOLL (m³)",   fmtNum(maoll.volume_MAOLL_m3, 1) + " m³"],
          ["Volume nominal (m³)",    fmtNum(maoll.volume_nominal_m3, 1) + " m³"],
          ["% volume disponível",    fmtNum(maoll.pct_volume_disponivel, 1) + " %"],
          ["Re-rating necessário",   maoll.reratingNecessario ? "SIM" : "NÃO"],
        ].map(([label, valor], idx, arr) => (
          <View key={label} style={idx < arr.length - 1 ? s.tRow : s.tRowLast}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={s.tValue}>{valor}</Text>
          </View>
        ))}
      </View>

      {/* Fundo */}
      <Secao titulo="5. Fundo — Avaliação de Vida Útil" />
      {fundo ? (
        <View style={[s.table, { marginBottom: 12 }]}>
          {[
            ["t nominal",             fmtMm(fundo.t_nominal_mm)],
            ["t medida",              fmtMm(fundo.t_medida_mm)],
            ["t mín. API 653 §4.4.5", fmtNum(T_MIN_FUNDO_MM, 1) + " mm"],
            ["t sobra",               fmtMm(fundo.t_sobra_mm)],
            ["CR adotada",            fmtNum(fundo.CR_mm_ano, 3) + " mm/ano"],
            ["RUL fundo",             fmtAnos(fundo.RUL_anos)],
            ["Status",                fundo.status],
          ].map(([label, valor], idx, arr) => (
            <View key={label} style={idx < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{label}</Text>
              <Text style={s.tValue}>{valor}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 8.5, color: CARBONO_500, marginBottom: 12 }}>
          Dados do fundo não informados nesta inspeção.
        </Text>
      )}

      {/* Teto */}
      <Secao titulo="6. Teto — Avaliação de Vida Útil" />
      {teto ? (
        <View style={[s.table, { marginBottom: 12 }]}>
          {[
            ["t nominal",                   fmtMm(teto.t_nominal_mm)],
            ["t medida",                    fmtMm(teto.t_medida_mm)],
            ["t mín. (3/16\" — API 650 §5.10.5.2)", fmtNum(T_MIN_TETO_MM, 2) + " mm"],
            ["t sobra",                     fmtMm(teto.t_sobra_mm)],
            ["CR adotada",                  fmtNum(teto.CR_mm_ano, 3) + " mm/ano"],
            ["Campanhas de medição",        String(teto.n_medicoes)],
            ["RUL teto",                    fmtAnos(teto.RUL_anos)],
            ["Status",                      teto.status],
          ].map(([label, valor], idx, arr) => (
            <View key={label} style={idx < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{label}</Text>
              <Text style={s.tValue}>{valor}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 8.5, color: CARBONO_500, marginBottom: 12 }}>
          Dados do teto não informados nesta inspeção.
        </Text>
      )}

      {/* Próxima inspeção */}
      <Secao titulo="7. Próxima Inspeção Recomendada — API 653 §6" />
      <View style={[s.table, { marginBottom: 12 }]}>
        {[
          ["Data da inspeção atual",     fmtData(proximaInspecao.dataInspecao)],
          ["RUL crítico",                fmtAnos(proximaInspecao.RUL_critico_anos)],
          ["Próxima inspeção INTERNA",   fmtData(proximaInspecao.dataProximaInterna)],
          ["Intervalo inspeção interna", fmtAnos(proximaInspecao.intervaloInterno_anos) + " (RUL/4, máx 20 anos)"],
          ["Próxima inspeção EXTERNA",   fmtData(proximaInspecao.dataProximaExterna)],
          ["Intervalo inspeção externa", fmtAnos(proximaInspecao.intervaloExterno_anos) + " (RUL/2, máx 10 anos)"],
        ].map(([label, valor], idx, arr) => (
          <View key={label} style={idx < arr.length - 1 ? s.tRow : s.tRowLast}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={s.tValue}>{valor}</Text>
          </View>
        ))}
      </View>

      {proximaInspecao.alertas.filter(a => a.nivel !== "AVISO_LEGAL").map((a, i) => (
        <AlertaPDF key={i} nivel={a.nivel} mensagem={a.mensagem} />
      ))}

      {/* Disclaimer */}
      <View style={[s.disclaimer, { marginTop: 16 }]}>
        <Text style={s.discTxt}>
          Aviso legal: Este laudo é gerado automaticamente pelo NTANK e tem caráter informativo.
          Os cálculos seguem a metodologia da API 653, 5ª edição. Os resultados NÃO substituem
          o julgamento de engenheiro inspetor habilitado. O documento deve ser revisado e assinado
          por profissional com ART/RRT antes de ser utilizado como base para decisões operacionais.
          NTN Engenharia · www.ntnengenharia.com.br
        </Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// CTA — NTN Engenharia (última página)
// ---------------------------------------------------------------------------

function PaginaCTA() {
  return (
    <Page size="A4" style={s.pageCapa}>
      <View style={s.capaTopo} />
      <View style={{
        flex: 1,
        paddingHorizontal: 50,
        paddingTop: 80,
        paddingBottom: 60,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Text style={{
          fontFamily: "Helvetica-Bold",
          fontSize: 28,
          color: VERDE,
          marginBottom: 8,
          textAlign: "center",
        }}>
          Precisa de suporte técnico?
        </Text>
        <Text style={{
          fontSize: 13,
          color: "#FFFFFF",
          textAlign: "center",
          marginBottom: 40,
          lineHeight: 1.6,
          maxWidth: 400,
        }}>
          A NTN Engenharia realiza inspeções, laudos técnicos, reparo e montagem
          de tanques de armazenamento de combustíveis — da inspeção ao start-up.
        </Text>

        <View style={{
          backgroundColor: VERDE,
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 4,
          marginBottom: 32,
        }}>
          <Text style={{
            fontFamily: "Helvetica-Bold",
            fontSize: 14,
            color: PRETO,
            textAlign: "center",
          }}>
            Entre em contato e receba uma proposta
          </Text>
        </View>

        <View style={{ gap: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: VERDE, fontFamily: "Helvetica-Bold" }}>
            WhatsApp: (19) 99751-4035
          </Text>
          <Text style={{ fontSize: 11, color: "#FFFFFF" }}>wa.me/5519997514035</Text>
          <Text style={{ fontSize: 11, color: "#FFFFFF", marginTop: 8 }}>
            contato@ntnengenharia.com.br
          </Text>
          <Text style={{ fontSize: 11, color: "#FFFFFF" }}>www.ntnengenharia.com.br</Text>
        </View>
      </View>
      <View style={s.capaRodape}>
        <Text style={s.capaRodapeTxt}>Powered by NTN ENGENHARIA</Text>
        <Text style={s.capaRodapeTxt}>www.ntnengenharia.com.br</Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface Props {
  projeto: ProjetoAPI653;
}

export function MemoriaAPI653PDF({ projeto: p }: Props) {
  const costado =
    p.cursos.length > 0
      ? avaliarCostado({
          D_m: p.geometria.D_m,
          H_m: p.geometria.H_m,
          H_liq_m: p.H_liq_m,
          G: p.produto.G,
          S_MPa: p.material.S_MPa,
          E: p.material.E,
          cursos: p.cursos,
          CR_assumida_mm_ano: p.CR_global_mm_ano,
          dataInspecao: p.dataInspecao,
        })
      : null;

  const maoll =
    p.cursos.length > 0
      ? calcularMAOLL(p.geometria.D_m, p.H_liq_m, p.produto.G, p.material.S_MPa, p.material.E, p.cursos)
      : null;

  const fundo = p.fundo ? avaliarFundo(p.fundo, p.dataInspecao) : null;
  const teto  = p.teto  ? avaliarTeto(p.teto,  p.dataInspecao) : null;

  const RUL_costado = costado?.RUL_costado_anos ?? null;
  const RUL_fundo   = fundo?.RUL_anos ?? null;
  const RUL_teto    = teto?.RUL_anos  ?? null;
  const RULs        = [RUL_costado, RUL_fundo, RUL_teto].filter((v) => v !== null) as number[];
  const RUL_critico = RULs.length > 0 ? Math.min(...RULs) : null;

  const proximaInspecao = calcularProximaInspecao(p.dataInspecao, RUL_critico, null);

  return (
    <Document
      title={`API 653 — ${p.nome}`}
      author="NTANK — NTN Engenharia"
      subject="Laudo de Inspeção e Vida Útil — API 653"
      creator="NTANK"
    >
      <Capa p={p} />

      <PaginaSumario
        p={p}
        costado={costado}
        fundo={fundo}
        teto={teto}
        maoll={maoll}
        proximaInspecao={proximaInspecao}
      />

      {costado && <PaginaParametros p={p} costado={costado} />}

      {costado && costado.cursos.length > 0 && (
        <PaginaMemoriais p={p} costado={costado} />
      )}

      {maoll && (
        <PaginaResultados
          p={p}
          maoll={maoll}
          fundo={fundo}
          teto={teto}
          proximaInspecao={proximaInspecao}
        />
      )}

      <PaginaCTA />
    </Document>
  );
}
