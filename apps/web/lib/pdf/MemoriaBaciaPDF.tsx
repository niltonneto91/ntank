/**
 * Memória de cálculo NTANK — Bacia de Contenção (NBR 17505-2:2024 §5.9.2).
 *
 * Layout segue identidade NTN/NTANK (verde #ADD91C, preto, Helvetica).
 *
 * IMPORTANTE: este documento NÃO reproduz texto, tabelas nem figuras da norma
 * NBR 17505. Cita apenas o número do item normativo e implementa as fórmulas
 * matemáticas, que não têm copyright.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ProjetoBacia, MuretaIntermediaria } from "@/lib/bacia-projeto";
import { totalVolumeMuretas, volumeMureta } from "@/lib/bacia-projeto";
import type {
  ResultadoVerificarBacia,
  ResultadoDimensionarBacia,
} from "@ntank/calc-core";
import { distMinTanqueMuro, distMinEntreATanques } from "@ntank/calc-core";

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

  header:      { position: "absolute", top: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomColor: VERDE, borderBottomWidth: 2, paddingBottom: 5 },
  headerMarca: { fontFamily: "Helvetica-Bold", fontSize: 10, color: PRETO },
  headerVerde: { color: VERDE },
  headerInfo:  { fontSize: 8, color: CARBONO_500 },

  footer:    { position: "absolute", bottom: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopColor: CARBONO_100, borderTopWidth: 0.5, paddingTop: 4 },
  footerTxt: { fontSize: 7, color: CARBONO_300 },

  h2: { fontFamily: "Helvetica-Bold", fontSize: 11, color: PRETO, marginBottom: 6, marginTop: 14, paddingBottom: 4, borderBottomColor: VERDE, borderBottomWidth: 2 },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 9, color: CARBONO_700, marginBottom: 4, marginTop: 8 },

  table:    { borderWidth: 0.5, borderColor: CARBONO_300, borderRadius: 3 },
  tRow:     { flexDirection: "row", borderBottomColor: CARBONO_100, borderBottomWidth: 0.5 },
  tRowLast: { flexDirection: "row" },
  tHead:    { backgroundColor: CREME },
  tCell:    { padding: 4, flex: 1, fontSize: 8 },
  tCellBold:{ padding: 4, flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tLabel:   { width: 160, padding: 4, fontSize: 8, color: CARBONO_500 },
  tValue:   { flex: 1, padding: 4, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },

  statusOk:  { backgroundColor: "#d1fae5", color: "#065f46", padding: 3, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  statusErr: { backgroundColor: "#fee2e2", color: "#991b1b", padding: 3, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  statusWar: { backgroundColor: "#fef3c7", color: "#92400e", padding: 3, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  alertaCritico: { backgroundColor: "#fee2e2", borderLeftColor: "#dc2626", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaAviso:   { backgroundColor: "#fef3c7", borderLeftColor: "#d97706", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaInfo:    { backgroundColor: "#dbeafe", borderLeftColor: "#2563eb", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaTxt:     { fontSize: 7.5, lineHeight: 1.4 },

  memoBox:   { backgroundColor: CREME, padding: 8, borderRadius: 4, marginBottom: 10 },
  memoTitulo:{ fontFamily: "Helvetica-Bold", fontSize: 9, color: CARBONO_700, marginBottom: 5 },
  memoLinha: { fontSize: 8, fontFamily: "Courier", lineHeight: 1.6, color: CARBONO_700 },
  memoLinhaB:{ fontSize: 8, fontFamily: "Courier-Bold", lineHeight: 1.6, color: PRETO },

  disclaimer: { backgroundColor: CREME, padding: 8, borderRadius: 4, marginTop: 10 },
  discTxt:    { fontSize: 7.5, color: CARBONO_500, lineHeight: 1.5 },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const f2  = (v: number) => v.toFixed(2).replace(".", ",");
const f1  = (v: number) => v.toFixed(1).replace(".", ",");
const f3  = (v: number) => v.toFixed(3).replace(".", ",");
const fmtData = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// ---------------------------------------------------------------------------
// Partes do documento
// ---------------------------------------------------------------------------

/** Cabeçalho padrão de página interna */
function Header({ projeto }: { projeto: ProjetoBacia }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerMarca}>
        <Text>NT</Text><Text style={s.headerVerde}>ANK</Text>
        {"  "}
        <Text style={{ fontFamily: "Helvetica", fontSize: 8, color: CARBONO_500 }}>
          Bacia de Contenção — NBR 17505-2:2024
        </Text>
      </Text>
      <Text style={s.headerInfo}>{projeto.nome}</Text>
    </View>
  );
}

/** Rodapé padrão de página interna */
function Footer({ data }: { data: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>NTN Engenharia — www.ntnengenharia.com.br</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) =>
        `Pág. ${pageNumber} / ${totalPages} — Gerado em ${data}`
      } />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Página de capa
// ---------------------------------------------------------------------------
function Capa({ projeto, geradoEm }: { projeto: ProjetoBacia; geradoEm: string }) {
  return (
    <Page size="A4" style={s.pageCapa}>
      <View style={s.capaTopo} />
      <View style={s.capaCorpo}>
        <Text style={s.capaMarca}>
          <Text>NT</Text><Text style={s.capaMarcaV}>ANK</Text>
        </Text>
        <Text style={s.capaTituloDoc}>Memória de Cálculo{"\n"}Bacia de Contenção</Text>
        <Text style={s.capaSub}>NBR 17505-2:2024 §5.9.2 — Contenção por diques</Text>

        <View style={s.capaProjeto}>
          <Text style={s.capaProjLabel}>PROJETO</Text>
          <Text style={s.capaProjNome}>{projeto.nome}</Text>
          {projeto.cliente && (
            <View style={s.capaRow}>
              <Text style={s.capaLabel}>Cliente</Text>
              <Text style={s.capaValor}>{projeto.cliente}</Text>
            </View>
          )}
          {projeto.local && (
            <View style={s.capaRow}>
              <Text style={s.capaLabel}>Local</Text>
              <Text style={s.capaValor}>{projeto.local}</Text>
            </View>
          )}
          <View style={s.capaRow}>
            <Text style={s.capaLabel}>Modo</Text>
            <Text style={s.capaValor}>
              {projeto.modo === "verificar" ? "Verificação de bacia existente" : "Dimensionamento de nova bacia"}
            </Text>
          </View>
          <View style={s.capaRow}>
            <Text style={s.capaLabel}>Data</Text>
            <Text style={s.capaValor}>{geradoEm}</Text>
          </View>
          <View style={s.capaRow}>
            <Text style={s.capaLabel}>Tanques</Text>
            <Text style={s.capaValor}>{projeto.tanques.length} tanque{projeto.tanques.length !== 1 ? "s" : ""}</Text>
          </View>
        </View>

        <View style={s.capaRodape}>
          <Text style={s.capaRodapeTxt}>
            NTN Engenharia — Av. José Paulino, 1456 – Sala 04 – Paulínia – SP
          </Text>
          <Text style={[s.capaRodapeTxt, { marginTop: 2 }]}>
            contato@ntnengenharia.com.br | (19) 2932-5678 | www.ntnengenharia.com.br
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Página de parâmetros
// ---------------------------------------------------------------------------
function PaginaParametros({
  projeto,
  geradoEm,
}: {
  projeto: ProjetoBacia;
  geradoEm: string;
}) {
  const muretas = projeto.muretasIntermediarias ?? [];
  const totalVMuretas = totalVolumeMuretas(muretas);

  return (
    <Page size="A4" style={s.page}>
      <Header projeto={projeto} />
      <Footer data={geradoEm} />

      <Text style={s.h2}>Parâmetros de Entrada</Text>

      {/* Tanques */}
      <Text style={s.h3}>Tanques na bacia</Text>
      <View style={s.table}>
        <View style={[s.tRow, s.tHead]}>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", flex: 0.7 }]}>TAG</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>D (m)</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>H (m)</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>H.Anel (m)</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Volume (m³)</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>d min→muro (m)</Text>
        </View>
        {projeto.tanques.map((t, i) => {
          const isLast = i === projeto.tanques.length - 1;
          return (
            <View key={t.id} style={isLast ? s.tRowLast : s.tRow}>
              <Text style={[s.tCell, { flex: 0.7, fontFamily: "Courier-Bold" }]}>{t.tag}</Text>
              <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(t.D_m)}</Text>
              <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(t.H_m)}</Text>
              <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(t.alturaAnel_m ?? 0)}</Text>
              <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier-Bold" }]}>{f1(t.volume_m3)}</Text>
              <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(distMinTanqueMuro(t.D_m))}</Text>
            </View>
          );
        })}
      </View>

      {/* Configuração da bacia */}
      <Text style={s.h3}>Configuração da bacia</Text>
      <View style={s.table}>
        {[
          ["Freeboard (sobrealtura)", `${f2(projeto.freeboard_m)} m`, "§5.9.2.2.1"],
          ["Altura máxima do muro", `${f2(projeto.alturaMaxMuro_m)} m`, "§5.9.2.2"],
          ["Modo de cálculo", projeto.modo === "verificar" ? "Verificação" : "Dimensionamento", ""],
          ...(projeto.modo === "verificar" && projeto.baciaDims
            ? [
                ["Comprimento interno (L)", `${f2(projeto.baciaDims.comprimento_m)} m`, ""],
                ["Largura interna (W)", `${f2(projeto.baciaDims.largura_m)} m`, ""],
                ["Altura total do muro", `${f2(projeto.baciaDims.alturaTotal_m)} m`, "§5.9.2.2"],
              ]
            : []),
        ].map(([label, valor, norma], i, arr) => (
          <View key={i} style={i === arr.length - 1 ? s.tRowLast : s.tRow}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={s.tValue}>{valor}</Text>
            {norma ? <Text style={[s.tCell, { flex: 0.6, fontSize: 7, color: CARBONO_500 }]}>{norma}</Text> : <Text style={[s.tCell, { flex: 0.6 }]} />}
          </View>
        ))}
      </View>

      {/* Muretas intermediárias */}
      {muretas.length > 0 && (
        <>
          <Text style={s.h3}>Muretas intermediárias</Text>
          <View style={s.table}>
            <View style={[s.tRow, s.tHead]}>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", flex: 2 }]}>Descrição</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Compr. (m)</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Alt. (m)</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Esp. (m)</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Vol. (m³)</Text>
            </View>
            {muretas.map((m: MuretaIntermediaria, i: number) => {
              const isLast = i === muretas.length - 1;
              return (
                <View key={m.id} style={isLast ? s.tRowLast : s.tRow}>
                  <Text style={[s.tCell, { flex: 2 }]}>{m.descricao || "—"}</Text>
                  <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(m.comprimento_m)}</Text>
                  <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(m.altura_m)}</Text>
                  <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(m.espessura_m)}</Text>
                  <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier-Bold" }]}>{f3(volumeMureta(m))}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 8, color: CARBONO_500, marginTop: 4 }}>
            Volume total deslocado por muretas: {f3(totalVMuretas)} m³ (descontado da capacidade líquida)
          </Text>
        </>
      )}

      <View style={s.disclaimer}>
        <Text style={s.discTxt}>
          Distâncias mínimas: tanque → muro = max(D/6 ; 1,50 m) | entre tanques = max((D1+D2)/6 ; 1,00 m). Referência: NBR 17505-2:2024 §5.9.2.
        </Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Página memorial — Verificação
// ---------------------------------------------------------------------------
function PaginaMemorialVerificar({
  projeto,
  resultado,
  geradoEm,
}: {
  projeto: ProjetoBacia;
  resultado: ResultadoVerificarBacia;
  geradoEm: string;
}) {
  const dims = projeto.baciaDims!;
  const muretas = projeto.muretasIntermediarias ?? [];
  const totalVMuretas = totalVolumeMuretas(muretas);
  const statusTxt = resultado.aprovado && !resultado.alturaExcedeMuro ? "ADEQUADA" : "INADEQUADA";
  const statusStyle = resultado.aprovado && !resultado.alturaExcedeMuro ? s.statusOk : s.statusErr;

  return (
    <Page size="A4" style={s.page}>
      <Header projeto={projeto} />
      <Footer data={geradoEm} />

      <Text style={s.h2}>Memorial de Cálculo — Verificação da Bacia</Text>

      {/* Resultado resumido */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Text style={statusStyle}>{statusTxt}</Text>
        <Text style={{ fontSize: 8.5, color: CARBONO_700 }}>
          Volume disponível: {f1(resultado.volumeDisponivel_m3)} m³ | Requerido: {f1(resultado.volumeRequerido_m3)} m³ | Utilização: {resultado.utilizacao_pct.toFixed(1).replace(".", ",")} %
        </Text>
      </View>

      {/* Alertas */}
      {resultado.alertas.filter((a) => a.nivel !== "INFO").map((a, i) => (
        <View key={i} style={a.nivel === "CRITICO" ? s.alertaCritico : s.alertaAviso}>
          <Text style={s.alertaTxt}>[{a.code}] {a.mensagem}</Text>
        </View>
      ))}

      {/* Memória de cálculo */}
      <View style={s.memoBox}>
        <Text style={s.memoTitulo}>Memória de Cálculo — NBR 17505-2:2024 §5.9.2.2.1</Text>

        <Text style={s.memoLinha}>1. Volume requerido (maior tanque vertical cheio):</Text>
        <Text style={s.memoLinhaB}>   V_req = {f1(resultado.volumeRequerido_m3)} m³</Text>

        <Text style={[s.memoLinha, { marginTop: 4 }]}>2. Soma das áreas de base dos tanques:</Text>
        <Text style={s.memoLinha}>   ΣA_bases = Σ(π/4 × Dᵢ²) = {f2(resultado.areaBasesTanques_m2)} m²</Text>

        <Text style={[s.memoLinha, { marginTop: 4 }]}>3. Altura efetiva de contenção:</Text>
        <Text style={s.memoLinha}>   h_efetiva = h_total − freeboard</Text>
        <Text style={s.memoLinhaB}>   h_efetiva = {f2(dims.alturaTotal_m)} − {f2(resultado.freeboard_m)} = {f2(resultado.alturaEfetiva_m)} m</Text>

        {totalVMuretas > 0 && (
          <>
            <Text style={[s.memoLinha, { marginTop: 4 }]}>4. Volume deslocado por muretas intermediárias:</Text>
            <Text style={s.memoLinhaB}>   V_desl_muretas = {f3(totalVMuretas)} m³</Text>
          </>
        )}

        <Text style={[s.memoLinha, { marginTop: 4 }]}>{totalVMuretas > 0 ? "5." : "4."} Volume líquido disponível:</Text>
        <Text style={s.memoLinha}>   V_disp = (L × W − ΣA_bases) × h_efetiva − V_desl_muretas</Text>
        <Text style={s.memoLinha}>   V_disp = ({f2(dims.comprimento_m)} × {f2(dims.largura_m)} − {f2(resultado.areaBasesTanques_m2)}) × {f2(resultado.alturaEfetiva_m)} − {f3(totalVMuretas)}</Text>
        <Text style={s.memoLinhaB}>   V_disp = {f1(resultado.volumeDisponivel_m3)} m³</Text>

        <Text style={[s.memoLinha, { marginTop: 4 }]}>{totalVMuretas > 0 ? "6." : "5."} Verificação:</Text>
        <Text style={[s.memoLinhaB, { color: resultado.aprovado ? "#065f46" : "#991b1b" }]}>
          {"   "}V_disp ({f1(resultado.volumeDisponivel_m3)} m³) {resultado.aprovado ? "≥" : "<"} V_req ({f1(resultado.volumeRequerido_m3)} m³) → {statusTxt}
        </Text>

        <Text style={[s.memoLinha, { marginTop: 8, color: CARBONO_500 }]}>
          Referência normativa: NBR 17505-2:2024 §5.9.2.2.1
        </Text>
      </View>

      {/* Tabela de resultados */}
      <Text style={s.h3}>Quadro de resultados</Text>
      <View style={s.table}>
        {[
          ["Volume requerido (maior tanque)", `${f1(resultado.volumeRequerido_m3)} m³`, "§5.9.2.2.1"],
          ["Volume disponível na bacia", `${f1(resultado.volumeDisponivel_m3)} m³`, "§5.9.2.2.1"],
          ["Altura efetiva de contenção", `${f2(resultado.alturaEfetiva_m)} m`, "§5.9.2.2.1"],
          ["Freeboard (sobrealtura)", `${f2(resultado.freeboard_m)} m`, "§5.9.2.2.1"],
          ["Área de base dos tanques", `${f2(resultado.areaBasesTanques_m2)} m²`, ""],
          ["Utilização da bacia", `${resultado.utilizacao_pct.toFixed(1).replace(".", ",")} %`, ""],
          ...(totalVMuretas > 0 ? [["Volume deslocado (muretas)", `${f3(totalVMuretas)} m³`, ""]] : []),
          ["Resultado", statusTxt, "§5.9.2.2.1"],
        ].map(([label, valor, norma], i, arr) => (
          <View key={i} style={i === arr.length - 1 ? s.tRowLast : s.tRow}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={s.tValue}>{valor}</Text>
            {norma ? <Text style={[s.tCell, { flex: 0.6, fontSize: 7, color: CARBONO_500 }]}>{norma}</Text> : <Text style={[s.tCell, { flex: 0.6 }]} />}
          </View>
        ))}
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Página memorial — Dimensionamento
// ---------------------------------------------------------------------------
function PaginaMemorialDimensionar({
  projeto,
  resultado,
  geradoEm,
}: {
  projeto: ProjetoBacia;
  resultado: ResultadoDimensionarBacia;
  geradoEm: string;
}) {
  const muretas = projeto.muretasIntermediarias ?? [];
  const totalVMuretas = totalVolumeMuretas(muretas);
  const statusTxt = resultado.alturaExcedeLimite ? "ATENÇÃO" : "OK";
  const statusStyle = resultado.alturaExcedeLimite ? s.statusWar : s.statusOk;

  return (
    <Page size="A4" style={s.page}>
      <Header projeto={projeto} />
      <Footer data={geradoEm} />

      <Text style={s.h2}>Memorial de Cálculo — Dimensionamento da Bacia</Text>

      {/* Resultado resumido */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Text style={statusStyle}>{statusTxt}</Text>
        <Text style={{ fontSize: 8.5, color: CARBONO_700 }}>
          L × W = {f1(resultado.comprimentoSugerido_m)} × {f1(resultado.larguraSugerida_m)} m | h_parede = {f2(resultado.alturaParede_m)} m | V_req = {f1(resultado.volumeRequerido_m3)} m³
        </Text>
      </View>

      {/* Alertas */}
      {resultado.alertas.filter((a) => a.nivel !== "INFO").map((a, i) => (
        <View key={i} style={a.nivel === "CRITICO" ? s.alertaCritico : s.alertaAviso}>
          <Text style={s.alertaTxt}>[{a.code}] {a.mensagem}</Text>
        </View>
      ))}

      {/* Memória de cálculo */}
      <View style={s.memoBox}>
        <Text style={s.memoTitulo}>Memória de Cálculo — Layout Geométrico — NBR 17505-2:2024 §5.9.2</Text>

        <Text style={s.memoLinha}>1. Volume requerido (maior tanque vertical cheio):</Text>
        <Text style={s.memoLinhaB}>   V_req = {f1(resultado.volumeRequerido_m3)} m³</Text>

        <Text style={[s.memoLinha, { marginTop: 4 }]}>2. Altura efetiva máxima disponível:</Text>
        <Text style={s.memoLinha}>   h_efetiva = h_max_muro − freeboard = {f2(projeto.alturaMaxMuro_m)} − {f2(resultado.freeboard_m)} = {f2(resultado.alturaEfetiva_m)} m</Text>

        <Text style={[s.memoLinha, { marginTop: 4 }]}>3. Dimensionamento geométrico (L × W):</Text>
        <Text style={s.memoLinha}>   Para cada fileira: L_row = d_borda(T0) + D0 + d_entre(T0,T1) + D1 + ... + d_borda(Tn)</Text>
        <Text style={s.memoLinha}>   L_min = maior L_row entre as fileiras</Text>
        <Text style={s.memoLinha}>   W_min = d_borda(Dmax_f1) + Dmax_f1 + d_entre_fileiras + Dmax_f2 + d_borda(Dmax_f2)</Text>
        <Text style={[s.memoLinhaB, { marginTop: 2 }]}>   L = {f1(resultado.comprimentoSugerido_m)} m   W = {f1(resultado.larguraSugerida_m)} m</Text>

        <Text style={[s.memoLinha, { marginTop: 4 }]}>4. Verificação de volume com dimensões calculadas:</Text>
        <Text style={s.memoLinha}>   A_liq = L × W − ΣA_bases = {f2(resultado.areaTotalSugerida_m2)} − {f2(resultado.areaTotalSugerida_m2 - resultado.areaLiquidaMinima_m2)} = {f2(resultado.areaLiquidaMinima_m2)} m²</Text>
        <Text style={s.memoLinha}>   h_req = (V_req + V_desl) / A_liq = ({f1(resultado.volumeRequerido_m3)} + {f3(totalVMuretas)}) / {f2(resultado.areaLiquidaMinima_m2)} = {f2(resultado.alturaEfetiva_m)} m</Text>
        <Text style={s.memoLinhaB}>   h_parede = h_req + freeboard = {f2(resultado.alturaEfetiva_m)} + {f2(resultado.freeboard_m)} = {f2(resultado.alturaParede_m)} m</Text>

        <Text style={[s.memoLinha, { marginTop: 8, color: CARBONO_500 }]}>
          Referência normativa: NBR 17505-2:2024 §5.9.2.2.1
        </Text>
      </View>

      {/* Quadro de resultados */}
      <Text style={s.h3}>Quadro de resultados</Text>
      <View style={s.table}>
        {[
          ["Volume requerido", `${f1(resultado.volumeRequerido_m3)} m³`, "§5.9.2.2.1"],
          ["Comprimento interno sugerido (L)", `${f1(resultado.comprimentoSugerido_m)} m`, "§5.9.2"],
          ["Largura interna sugerida (W)", `${f1(resultado.larguraSugerida_m)} m`, "§5.9.2"],
          ["Altura da parede do dique", `${f2(resultado.alturaParede_m)} m`, "§5.9.2.2"],
          ["Freeboard (sobrealtura)", `${f2(resultado.freeboard_m)} m`, "§5.9.2.2.1"],
          ["Altura efetiva de contenção", `${f2(resultado.alturaEfetiva_m)} m`, "§5.9.2.2.1"],
          ["Área líquida mínima necessária", `${f2(resultado.areaLiquidaMinima_m2)} m²`, "§5.9.2.2.1"],
          ...(totalVMuretas > 0 ? [["Volume deslocado (muretas)", `${f3(totalVMuretas)} m³`, ""]] : []),
        ].map(([label, valor, norma], i, arr) => (
          <View key={i} style={i === arr.length - 1 ? s.tRowLast : s.tRow}>
            <Text style={s.tLabel}>{label}</Text>
            <Text style={s.tValue}>{valor}</Text>
            {norma ? <Text style={[s.tCell, { flex: 0.6, fontSize: 7, color: CARBONO_500 }]}>{norma}</Text> : <Text style={[s.tCell, { flex: 0.6 }]} />}
          </View>
        ))}
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Página de distanciamentos
// ---------------------------------------------------------------------------
function PaginaDistanciamentos({
  projeto,
  resultado,
  geradoEm,
}: {
  projeto: ProjetoBacia;
  resultado: ResultadoVerificarBacia | ResultadoDimensionarBacia;
  geradoEm: string;
}) {
  const dists = resultado.distanciamentos;
  if (dists.length === 0) return null;

  return (
    <Page size="A4" style={s.page}>
      <Header projeto={projeto} />
      <Footer data={geradoEm} />

      <Text style={s.h2}>Distanciamentos Mínimos — NBR 17505-2:2024 §5.9.2</Text>

      <View style={s.table}>
        <View style={[s.tRow, s.tHead]}>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", flex: 1 }]}>Par</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", flex: 2 }]}>Fórmula aplicada</Text>
          <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Dist. mín. (m)</Text>
        </View>
        {dists.map((d, i) => {
          const isLast = i === dists.length - 1;
          return (
            <View key={i} style={isLast ? s.tRowLast : s.tRow}>
              <Text style={[s.tCell, { fontFamily: "Courier-Bold", flex: 1 }]}>
                {d.tagA} → {d.tagB}
              </Text>
              <Text style={[s.tCell, { fontFamily: "Courier", fontSize: 7.5, flex: 2 }]}>{d.formula}</Text>
              <Text style={[s.tCell, { fontFamily: "Courier-Bold", textAlign: "right" }]}>
                {d.distanciaMinima_m.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[s.disclaimer, { marginTop: 14 }]}>
        <Text style={s.discTxt}>
          Regras de distanciamento (NBR 17505-2:2024 §5.9.2):{"\n"}
          • Tanque → muro (parede do dique): d_min = max(D/6 ; 1,50 m){"\n"}
          • Entre tanques adjacentes: d_min = max((D1+D2)/6 ; 1,00 m){"\n"}
          As distâncias são medidas entre as superfícies externas das carcaças.
        </Text>
      </View>

      {/* Distâncias entre tanques adjacentes — memorial expandido */}
      {projeto.tanques.length > 1 && (
        <>
          <Text style={s.h3}>Verificação de espaçamento entre tanques</Text>
          <View style={s.table}>
            <View style={[s.tRow, s.tHead]}>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold" }]}>Par</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>D1 (m)</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>D2 (m)</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>(D1+D2)/6</Text>
              <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>d_min (m)</Text>
            </View>
            {projeto.tanques.flatMap((t1, i) =>
              projeto.tanques.slice(i + 1).map((t2, j) => {
                const dCalc = (t1.D_m + t2.D_m) / 6;
                const dMin = Math.max(dCalc, 1.0);
                const isLast = i === projeto.tanques.length - 2 && j === projeto.tanques.length - i - 2;
                return (
                  <View key={`${t1.id}-${t2.id}`} style={isLast ? s.tRowLast : s.tRow}>
                    <Text style={[s.tCell, { fontFamily: "Courier-Bold" }]}>{t1.tag} ↔ {t2.tag}</Text>
                    <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(t1.D_m)}</Text>
                    <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(t2.D_m)}</Text>
                    <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier" }]}>{f2(dCalc)}</Text>
                    <Text style={[s.tCell, { textAlign: "right", fontFamily: "Courier-Bold" }]}>{f2(dMin)}</Text>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Página CTA
// ---------------------------------------------------------------------------
function PaginaCTA({ geradoEm }: { geradoEm: string }) {
  return (
    <Page size="A4" style={s.pageCapa}>
      <View style={s.capaTopo} />
      <View style={s.capaCorpo}>
        <Text style={s.capaMarca}>
          <Text>NT</Text><Text style={s.capaMarcaV}>N</Text>
        </Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 20, marginTop: 30, color: "#FFFFFF" }}>
          NTN Engenharia
        </Text>
        <Text style={{ fontSize: 11, marginTop: 8, color: CARBONO_300 }}>
          Bases e terminais de combustíveis — Projeto, construção e start-up
        </Text>

        <View style={{ marginTop: 48, paddingTop: 16, borderTopColor: VERDE, borderTopWidth: 1 }}>
          {[
            ["Site",      "www.ntnengenharia.com.br"],
            ["E-mail",    "contato@ntnengenharia.com.br"],
            ["Telefone",  "(19) 2932-5678 / (19) 3933-3864"],
            ["Endereço",  "Av. José Paulino, 1456 – Sala 04 – Paulínia – SP"],
            ["CNPJ",      "34.986.789/0001-13"],
          ].map(([label, valor]) => (
            <View key={label} style={s.capaRow}>
              <Text style={s.capaLabel}>{label}</Text>
              <Text style={s.capaValor}>{valor}</Text>
            </View>
          ))}
        </View>

        <View style={[s.capaRodape, { marginTop: 48 }]}>
          <Text style={s.capaRodapeTxt}>
            Este documento foi gerado automaticamente pelo NTANK em {geradoEm}.{"\n"}
            Os cálculos seguem a NBR 17505-2:2024 §5.9.2. Para aplicação em projetos, consulte
            o exemplar licenciado da ABNT e verifique requisitos específicos dos órgãos
            fiscalizadores (Corpo de Bombeiros, ANP, órgãos ambientais).
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Documento principal
// ---------------------------------------------------------------------------
interface MemoriaBaciaPDFProps {
  projeto: ProjetoBacia;
  resultado: {
    tipo: "verificar" | "dimensionar";
    data: ResultadoVerificarBacia | ResultadoDimensionarBacia;
  } | null;
}

export function MemoriaBaciaPDF({ projeto, resultado }: MemoriaBaciaPDFProps) {
  const geradoEm = fmtData(new Date().toISOString());

  return (
    <Document
      title={`Bacia de Contenção — ${projeto.nome}`}
      author="NTANK / NTN Engenharia"
      subject="Memória de cálculo bacia de contenção NBR 17505-2:2024"
    >
      <Capa projeto={projeto} geradoEm={geradoEm} />
      <PaginaParametros projeto={projeto} geradoEm={geradoEm} />
      {resultado?.tipo === "verificar" && (
        <PaginaMemorialVerificar
          projeto={projeto}
          resultado={resultado.data as ResultadoVerificarBacia}
          geradoEm={geradoEm}
        />
      )}
      {resultado?.tipo === "dimensionar" && (
        <PaginaMemorialDimensionar
          projeto={projeto}
          resultado={resultado.data as ResultadoDimensionarBacia}
          geradoEm={geradoEm}
        />
      )}
      {resultado && resultado.data.distanciamentos.length > 0 && (
        <PaginaDistanciamentos
          projeto={projeto}
          resultado={resultado.data}
          geradoEm={geradoEm}
        />
      )}
      <PaginaCTA geradoEm={geradoEm} />
    </Document>
  );
}
