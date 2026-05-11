/**
 * Memória de cálculo NTANK — API 2350 (Prevenção de Transbordamento).
 *
 * Segue a identidade visual NTN/NTANK (verde #ADD91C, preto, Helvetica).
 *
 * IMPORTANTE: este documento NÃO reproduz texto, tabelas nem figuras da norma
 * API 2350. Cita apenas o número da seção/item normativo e implementa as
 * fórmulas físicas (taxa de subida, volume de resposta), que não têm copyright.
 *
 * Os valores de tempo mínimo por categoria (Annex G da API 2350) não são
 * emitidos aqui — apenas o valor informado pelo usuário do seu exemplar licenciado.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  ResultadoEscopoAPI2350,
  ResultadoTaxaSubidaAPI2350,
  ResultadoTempoRespostaAPI2350,
  ResultadoVolumeRespostaAPI2350,
  ResultadoNiveisAPI2350,
  ResultadoCategoriaAPI2350,
} from "@ntank/calc-core";
import type { ProjetoAPI2350 } from "@/lib/api2350-projeto";

// ---------------------------------------------------------------------------
// Paleta
// ---------------------------------------------------------------------------
const VERDE         = "#ADD91C";
const PRETO         = "#0A0A0A";
const CARBONO_700   = "#262626";
const CARBONO_500   = "#525252";
const CARBONO_300   = "#A3A3A3";
const CARBONO_100   = "#E5E5E5";
const CREME         = "#ECECE3";

// ---------------------------------------------------------------------------
// Props do componente
// ---------------------------------------------------------------------------

export interface CalculoAPI2350 {
  escopoRes:     ResultadoEscopoAPI2350;
  taxaRes:       ResultadoTaxaSubidaAPI2350;
  tempoRes:      ResultadoTempoRespostaAPI2350;
  volRes:        ResultadoVolumeRespostaAPI2350;
  niveisRes:     ResultadoNiveisAPI2350;
  categoriaRes:  ResultadoCategoriaAPI2350;
  Q_efetiva:     number;
  t_disponivel_min: number;
  // Fase 2B — cenário conservador vs. líquido
  Q_liquida:            number | null;
  volResLiquido:        ResultadoVolumeRespostaAPI2350 | null;
  t_disponivel_liquido: number | null;
  // Fase 2B — checklist de conformidade
  conformidade: {
    escopo:          boolean;
    escopoReqAval:   boolean;
    distanciaHHCH:   boolean;
    mwAbaixoHH:      boolean;
    chAbaixoFisico:  boolean;
    aops:            string | null; // "APROVADO" | "REPROVADO" | "INDETERMINADO" | null
    tempoSuficiente: boolean;
    tempoCateg:      boolean | null; // null = Annex G não preenchido
  };
  statusGeral: "CONFORME" | "NAO_CONFORME" | "INCOMPLETO";
}

interface Props {
  projeto: ProjetoAPI2350;
  calculo: CalculoAPI2350;
}

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
  capaTopo:   { backgroundColor: VERDE, height: 8 },
  capaCorpo:  { flex: 1, paddingHorizontal: 50, paddingTop: 70, paddingBottom: 60, color: "#FFFFFF" },
  capaMarca:  { fontFamily: "Helvetica-Bold", fontSize: 38, letterSpacing: -1 },
  capaMarcaV: { color: VERDE },
  capaTituloDoc: { fontFamily: "Helvetica-Bold", fontSize: 22, marginTop: 72, color: "#FFFFFF", lineHeight: 1.2 },
  capaSub:    { fontSize: 12, marginTop: 8, color: CARBONO_300 },
  capaProjeto:{ marginTop: 48, paddingTop: 16, borderTopColor: VERDE, borderTopWidth: 1 },
  capaProjLabel: { fontSize: 8, letterSpacing: 1.5, color: VERDE, marginBottom: 4 },
  capaProjNome:  { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 14 },
  capaRow:    { flexDirection: "row", marginBottom: 5 },
  capaLabel:  { width: 90, color: CARBONO_300, fontSize: 8 },
  capaValor:  { flex: 1, color: "#FFFFFF", fontSize: 9 },
  capaRodape: { borderTopColor: "#333", borderTopWidth: 1, paddingTop: 10, marginTop: "auto" },
  capaRodapeTxt: { fontSize: 8, color: CARBONO_300 },

  // Cabeçalho/rodapé de páginas internas
  header: { position: "absolute", top: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomColor: CARBONO_100, borderBottomWidth: 0.5, paddingBottom: 4 },
  headerMarca: { fontFamily: "Helvetica-Bold", fontSize: 9, color: PRETO },
  headerVerde: { color: VERDE },
  headerInfo:  { fontSize: 8, color: CARBONO_500 },
  footer: { position: "absolute", bottom: 18, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopColor: CARBONO_100, borderTopWidth: 0.5, paddingTop: 4 },
  footerTxt: { fontSize: 7, color: CARBONO_300 },

  // Seções
  h2: { fontFamily: "Helvetica-Bold", fontSize: 11, color: PRETO, marginBottom: 6, marginTop: 14, paddingBottom: 4, borderBottomColor: VERDE, borderBottomWidth: 2 },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 9, color: CARBONO_700, marginBottom: 4, marginTop: 8 },

  // Tabelas
  table:    { borderWidth: 0.5, borderColor: CARBONO_300, borderRadius: 3 },
  tRow:     { flexDirection: "row", borderBottomColor: CARBONO_100, borderBottomWidth: 0.5 },
  tRowLast: { flexDirection: "row" },
  tHead:    { backgroundColor: CREME },
  tCell:    { padding: 4, flex: 1, fontSize: 8.5 },
  tCellBold:{ padding: 4, flex: 1, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  tLabel:   { width: 180, padding: 4, fontSize: 8.5, color: CARBONO_500 },
  tValue:   { flex: 1, padding: 4, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },

  // Status badges (inline)
  badgeOk:  { backgroundColor: "#d1fae5", color: "#065f46", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  badgeErr: { backgroundColor: "#fee2e2", color: "#991b1b", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  // Alertas
  alertaCritico: { backgroundColor: "#fee2e2", borderLeftColor: "#dc2626", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaAviso:   { backgroundColor: "#fef3c7", borderLeftColor: "#d97706", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaInfo:    { backgroundColor: "#dbeafe", borderLeftColor: "#2563eb", borderLeftWidth: 3, padding: 6, marginBottom: 4, borderRadius: 3 },
  alertaTxt:     { fontSize: 7.5, lineHeight: 1.4 },

  // Categoria
  catCaixa: { borderWidth: 1.5, borderRadius: 6, padding: 10, marginBottom: 8 },
  catNumero: { fontFamily: "Helvetica-Bold", fontSize: 28, textAlign: "center", marginBottom: 2 },
  catTipo:   { fontSize: 8, textAlign: "center", color: CARBONO_500 },

  // Disclaimer
  disclaimer: { backgroundColor: CREME, padding: 8, borderRadius: 4, marginTop: 10 },
  discTxt:    { fontSize: 7.5, color: CARBONO_500, lineHeight: 1.5 },

  // Checklist de conformidade (Página 5)
  statusBox:    { borderWidth: 2, borderRadius: 6, padding: 10, marginBottom: 12, alignItems: "center" },
  statusTxt:    { fontFamily: "Helvetica-Bold", fontSize: 13, textAlign: "center" },
  statusSub:    { fontSize: 8.5, textAlign: "center", marginTop: 3, color: CARBONO_500 },
  ckRow:        { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4, paddingHorizontal: 6, borderRadius: 3, marginBottom: 2 },
  ckRowOk:      { backgroundColor: "#f0fdf4" },
  ckRowErr:     { backgroundColor: "#fef2f2" },
  ckRowPend:    { backgroundColor: "#fefce8" },
  ckRowNa:      { backgroundColor: CREME },
  ckIcon:       { width: 14, fontFamily: "Helvetica-Bold", fontSize: 9 },
  ckLabel:      { flex: 1, fontSize: 8.5, lineHeight: 1.4 },
  ckObs:        { fontSize: 7.5, color: CARBONO_500, marginLeft: 14, marginTop: 1 },
});

// ---------------------------------------------------------------------------
// Helpers de formatação
// ---------------------------------------------------------------------------
const fmtN1 = (v: number) => v.toFixed(1).replace(".", ",");
const fmtN2 = (v: number) => v.toFixed(2).replace(".", ",");
const fmtN3 = (v: number) => v.toFixed(3).replace(".", ",");

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={s.tRowLast}>
      <Text style={s.tLabel}>{label}</Text>
      <Text style={s.tValue}>{valor}</Text>
    </View>
  );
}

function LinhaTabela({ label, valor, last }: { label: string; valor: string; last?: boolean }) {
  return (
    <View style={last ? s.tRowLast : s.tRow}>
      <Text style={s.tLabel}>{label}</Text>
      <Text style={s.tValue}>{valor}</Text>
    </View>
  );
}

function Secao({ titulo }: { titulo: string }) {
  return <Text style={s.h2}>{titulo}</Text>;
}

function Subtitulo({ titulo }: { titulo: string }) {
  return <Text style={s.h3}>{titulo}</Text>;
}

function HeaderPagina({ tag, norma }: { tag: string; norma: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerMarca}>
        <Text style={s.headerVerde}>N</Text>TANK — API 2350
      </Text>
      <Text style={s.headerInfo}>{tag} · {norma}</Text>
    </View>
  );
}

function RodapePagina({ projeto }: { projeto: ProjetoAPI2350 }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>
        NTN Engenharia · www.ntnengenharia.com.br · {new Date().toLocaleDateString("pt-BR")}
      </Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) =>
        `Pág. ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function AlertaPDF({ nivel, mensagem }: { nivel: string; mensagem: string }) {
  const estilo = nivel === "CRITICO" || nivel === "BLOQUEANTE"
    ? s.alertaCritico
    : nivel === "ALERTA" ? s.alertaAviso : s.alertaInfo;
  const icone = nivel === "CRITICO" ? "⛔ " : nivel === "ALERTA" ? "⚠ " : "ℹ ";
  return (
    <View style={estilo}>
      <Text style={s.alertaTxt}>{icone}{mensagem}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cores de categoria
// ---------------------------------------------------------------------------
const catEstilo: Record<string, { borderColor: string; color: string }> = {
  "0": { borderColor: "#dc2626", color: "#dc2626" },
  "1": { borderColor: "#d97706", color: "#d97706" },
  "2": { borderColor: "#2563eb", color: "#2563eb" },
  "3": { borderColor: "#16a34a", color: "#16a34a" },
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function MemoriaAPI2350PDF({ projeto: p, calculo: c }: Props) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const catCor = catEstilo[String(c.categoriaRes.categoria)] ?? catEstilo["0"];

  return (
    <Document
      title={`OPS ${p.tagTanque} — API 2350`}
      author="NTN Engenharia / NTANK"
      subject="Análise de prevenção de transbordamento — API 2350"
    >
      {/* ================================================================
          CAPA
      ================================================================ */}
      <Page size="A4" style={s.pageCapa}>
        <View style={s.capaTopo} />
        <View style={s.capaCorpo}>
          <Text style={s.capaMarca}>
            <Text style={s.capaMarcaV}>N</Text>TANK
          </Text>
          <Text style={s.capaTituloDoc}>
            Análise de Prevenção{"\n"}de Transbordamento
          </Text>
          <Text style={s.capaSub}>API Standard 2350, 5ª edição (2020)</Text>

          <View style={s.capaProjeto}>
            <Text style={s.capaProjLabel}>ANÁLISE</Text>
            <Text style={s.capaProjNome}>{p.nome}</Text>

            {[
              ["Tag do tanque",     p.tagTanque],
              ["Cliente",           p.cliente || "—"],
              ["Local",             p.local || "—"],
              ["Responsável",       p.responsavelAnalise || "—"],
              ["Norma construção",  p.normaContrucao],
              ["Data de emissão",   dataGeracao],
            ].map(([label, valor]) => (
              <View key={label} style={s.capaRow}>
                <Text style={s.capaLabel}>{label}</Text>
                <Text style={s.capaValor}>{valor}</Text>
              </View>
            ))}
          </View>

          <View style={s.capaRodape}>
            <Text style={s.capaRodapeTxt}>
              Documento gerado pelo sistema NTANK — NTN Engenharia
            </Text>
            <Text style={[s.capaRodapeTxt, { marginTop: 2, fontSize: 7 }]}>
              ⚠ Uso exclusivamente informativo. Não substitui análise de risco formal,
              ART/RRT e validação com exemplar licenciado da API 2350.
            </Text>
          </View>
        </View>
      </Page>

      {/* ================================================================
          PÁGINA 2 — DADOS DE ENTRADA
      ================================================================ */}
      <Page size="A4" style={s.page}>
        <HeaderPagina tag={p.tagTanque} norma={p.normaContrucao} />

        <Secao titulo="1. Identificação e dados de entrada" />

        <Subtitulo titulo="Tanque" />
        <View style={s.table}>
          {[
            ["Tag",                    p.tagTanque],
            ["Tipo de tanque",         p.geometria.tipoTanque],
            ["Diâmetro interno D",     `${p.geometria.D_m} m`],
            ["Altura total H",         `${p.geometria.H_total_m} m`],
            ["Altura útil (calibrada)",`${p.geometria.H_util_m} m`],
            ["Área transversal A",     `${fmtN3(c.taxaRes.A_m2)} m²`],
            ["Cálculo de V/mm",        p.geometria.usarVPorMm ? `Manual: ${p.geometria.vPorMm_m3_mm} m³/mm` : "Geométrico (π·D²/4)"],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Subtitulo titulo="Produto" />
        <View style={s.table}>
          {[
            ["Nome do produto",         p.produto.nome || "—"],
            ["Classe NFPA",             p.produto.classeNFPA],
            ["Temperatura de operação", `${p.produto.T_operacao_C ?? "—"} °C`],
            ["Densidade",               p.produto.densidade_kg_m3 ? `${p.produto.densidade_kg_m3} kg/m³` : "—"],
            ["Inflamável",              p.produto.inflamavel ? "Sim" : "Não"],
            ["Tóxico",                  p.produto.toxico ? "Sim" : "Não"],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Subtitulo titulo="Operação de recebimento" />
        <View style={s.table}>
          {[
            ["Vazão máxima de recebimento", `${fmtN1(p.operacao.vazaoMax_m3h)} m³/h`],
            ["Múltiplas fontes",            p.operacao.multiplas_fontes ? "Sim" : "Não"],
            ["Vazão total simultânea",      p.operacao.multiplas_fontes && p.operacao.vazaoTotal_simultanea_m3h
              ? `${fmtN1(p.operacao.vazaoTotal_simultanea_m3h)} m³/h` : "—"],
            ["Vazão efetiva adotada",       `${fmtN1(c.Q_efetiva)} m³/h`],
            ["Fontes de recebimento",       p.operacao.fontes.join(", ") || "—"],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Subtitulo titulo="Monitoramento" />
        <View style={s.table}>
          {[
            ["Presença operacional",     p.monitoramento.presencaOperacional === "plena" ? "Plena"
              : p.monitoramento.presencaOperacional === "semi" ? "Semi-assistida" : "Não assistida"],
            ["ATG instalado",            p.monitoramento.temATG ? "Sim" : "Não"],
            ["Nível transmitido remoto", p.monitoramento.nivelTransmitidoRemoto ? "Sim" : "Não"],
            ["Alarme HH presente",       p.monitoramento.temAlarmeHH ? "Sim" : "Não"],
            ["Alarme HH → local ocupado",p.monitoramento.alarmeEnviadoLocalOcupado ? "Sim" : "Não"],
            ["LAHH independente do ATG", p.monitoramento.temLAHHIndependente ? "Sim" : "Não"],
            ["Encerrar remotamente",     p.monitoramento.capacidadeEncerrarRemoto ? "Sim" : "Não"],
            ["AOPS presente",            p.ops.temAOPS ? "Sim" : "Não"],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        <RodapePagina projeto={p} />
      </Page>

      {/* ================================================================
          PÁGINA 3 — CÁLCULOS
      ================================================================ */}
      <Page size="A4" style={s.page}>
        <HeaderPagina tag={p.tagTanque} norma={p.normaContrucao} />

        <Secao titulo="2. Cálculos" />

        {/* Taxa de subida */}
        <Subtitulo titulo="2.1 Taxa máxima de subida de nível" />
        <Text style={{ fontSize: 8, color: CARBONO_500, marginBottom: 4 }}>
          Física: taxa_subida [mm/min] = (Q [m³/h] / 60) / A [m²] × 1000
        </Text>
        <View style={s.table}>
          {[
            ["Método",              c.taxaRes.metodo === "geometrico" ? "Geométrico (π·D²/4)" : "Manual — V/mm de arqueação"],
            ["Área transversal A",  `${fmtN3(c.taxaRes.A_m2)} m²`],
            ["Vazão efetiva Q",     `${fmtN1(c.Q_efetiva)} m³/h`],
            ["Taxa de subida",      `${fmtN2(c.taxaRes.taxaSubida_mm_min)} mm/min`],
            ["=",                   `${fmtN1(c.taxaRes.taxaSubida_mm_h)} mm/h = ${fmtN2(c.taxaRes.taxaSubida_in_h)} in/h`],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Tempo de resposta */}
        <Subtitulo titulo="2.2 Componentes do tempo de resposta (API 2350 §6)" />
        <View style={s.table}>
          <View style={[s.tRow, s.tHead]}>
            <Text style={[s.tCell, { fontFamily: "Helvetica-Bold" }]}>Componente</Text>
            <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Tempo (min)</Text>
          </View>
          {[
            ["Detecção de nível alto",          c.tempoRes.componentes.detecao_min],
            ["Validação do alarme",             c.tempoRes.componentes.validacao_min],
            ["Comunicação ao operador",         c.tempoRes.componentes.comunicacao_min],
            ["Decisão operacional",             c.tempoRes.componentes.decisao_min],
            ["Ação operacional (deslocamento)", c.tempoRes.componentes.acaoOperacional_min],
            ["Fechamento de válvula",           c.tempoRes.componentes.fechamentoValvula_min],
            ["Parada de bomba",                 c.tempoRes.componentes.paradaBomba_min],
            ["Drenagem / equilíbrio da linha",  c.tempoRes.componentes.drenagemLinha_min],
            ["Margem de segurança",             c.tempoRes.componentes.margemSeguranca_min],
          ].map(([label, valor], i) => (
            <View key={label as string} style={s.tRow}>
              <Text style={s.tCell}>{label as string}</Text>
              <Text style={[s.tCell, { textAlign: "right" }]}>{fmtN2(valor as number)}</Text>
            </View>
          ))}
          <View style={[s.tRowLast, { backgroundColor: CREME }]}>
            <Text style={[s.tCell, { fontFamily: "Helvetica-Bold" }]}>Total calculado</Text>
            <Text style={[s.tCell, { textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
              {fmtN2(c.tempoRes.total_calculado_min)} min
            </Text>
          </View>
        </View>

        <View style={[s.table, { marginTop: 4 }]}>
          {[
            ["Total adotado",                  `${fmtN2(c.tempoRes.total_adotado_min)} min`],
            ["Mínimo exigido pela categoria",  p.tempoResposta.tempoMinimoCategoria_min != null
              ? `${fmtN2(p.tempoResposta.tempoMinimoCategoria_min)} min`
              : "Não informado — consultar API 2350 Annex G"],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Volume de resposta */}
        <Subtitulo titulo="2.3 Volume de resposta requerido" />
        <Text style={{ fontSize: 8, color: CARBONO_500, marginBottom: 4 }}>
          Física: V_resposta [m³] = Q_efetiva [m³/h] × t_resposta [min] / 60
        </Text>
        <View style={s.table}>
          {[
            ["V_resposta",  `${fmtN3(c.volRes.volume_m3)} m³`],
            ["=",           `${fmtN1(c.volRes.volume_L)} L = ${fmtN2(c.volRes.volume_bbl)} bbl`],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        <RodapePagina projeto={p} />
      </Page>

      {/* ================================================================
          PÁGINA 4 — NÍVEIS E CATEGORIA
      ================================================================ */}
      <Page size="A4" style={s.page}>
        <HeaderPagina tag={p.tagTanque} norma={p.normaContrucao} />

        <Secao titulo="3. Verificação de níveis operacionais" />

        <Subtitulo titulo="3.1 Configuração de níveis" />
        <View style={s.table}>
          {[
            ["Nível físico máximo (transbordamento)",  `${p.niveis.H_fisico_max_m} m`],
            ["CH — Critical High Level",               `${p.niveis.CH_m} m`],
            ["AOPS (se presente)",                     p.niveis.AOPS_m != null ? `${p.niveis.AOPS_m} m` : "—"],
            ["HH — High-High Level (LAHH)",            `${p.niveis.HH_m} m`],
            ["H — High Level (opcional)",              p.niveis.H_m != null ? `${p.niveis.H_m} m` : "—"],
            ["MW — Maximum Working Level",             `${p.niveis.MW_m} m`],
          ].map(([l, v], i, arr) => (
            <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={s.tLabel}>{l}</Text>
              <Text style={s.tValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Subtitulo titulo="3.2 Verificação das distâncias" />
        <View style={s.table}>
          <View style={[s.tRow, s.tHead]}>
            <Text style={[s.tCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Parâmetro</Text>
            <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Valor</Text>
            <Text style={[s.tCell, { fontFamily: "Helvetica-Bold", textAlign: "center" }]}>Status</Text>
          </View>
          {[
            ["Distância HH → CH disponível",   `${fmtN1(c.niveisRes.distancia_CH_HH_mm)} mm`,      c.niveisRes.status_distancia_HH_CH === "APROVADO"],
            ["Mínimo normativo (3 in)",         `${c.niveisRes.distancia_minima_normativa_mm} mm`,  null],
            ["Mínimo efetivo requerido",        `${fmtN1(c.niveisRes.distancia_efetiva_minima_mm)} mm`, null],
            ["Distância MW → HH",               `${fmtN1(c.niveisRes.distancia_HH_MW_mm)} mm`,      c.niveisRes.status_MW_abaixo_HH === "APROVADO"],
            ["Distância CH → máx. físico",      `${fmtN1(c.niveisRes.distancia_CH_fisico_mm)} mm`,  c.niveisRes.status_CH_abaixo_fisico === "APROVADO"],
            ["Tempo disponível HH → CH",        `${fmtN2(c.t_disponivel_min)} min`,                c.t_disponivel_min >= c.tempoRes.total_adotado_min],
          ].map(([label, valor, ok], i, arr) => (
            <View key={label as string} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
              <Text style={[s.tCell, { flex: 2 }]}>{label as string}</Text>
              <Text style={[s.tCell, { textAlign: "right" }]}>{valor as string}</Text>
              <View style={[s.tCell, { justifyContent: "center", alignItems: "center" }]}>
                {ok === null ? <Text style={{ fontSize: 7.5, color: CARBONO_500 }}>—</Text>
                  : ok ? <Text style={s.badgeOk}>✓ OK</Text>
                       : <Text style={s.badgeErr}>✗ FALHA</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Alertas de nível */}
        {c.niveisRes.alertas.filter(a => a.nivel !== "AVISO_LEGAL").length > 0 && (
          <>
            <Subtitulo titulo="Alertas — verificação de níveis" />
            {c.niveisRes.alertas
              .filter(a => a.nivel !== "AVISO_LEGAL")
              .map(a => <AlertaPDF key={a.code} nivel={a.nivel} mensagem={`[${a.code}] ${a.mensagem}`} />)}
          </>
        )}

        <Secao titulo="4. Classificação da categoria OPS" />

        {/* Caixa de categoria */}
        <View style={[s.catCaixa, { borderColor: catCor.borderColor }]}>
          <Text style={[s.catNumero, { color: catCor.color }]}>
            Categoria {c.categoriaRes.categoria}
          </Text>
          <Text style={s.catTipo}>Tipo OPS: {c.categoriaRes.tipoOPS}</Text>
        </View>

        <Text style={{ fontSize: 9, marginBottom: 6, color: CARBONO_700 }}>
          {c.categoriaRes.justificativa}
        </Text>

        {c.categoriaRes.requisitosAtendidos.length > 0 && (
          <>
            <Text style={[s.h3, { color: "#065f46" }]}>Requisitos atendidos:</Text>
            {c.categoriaRes.requisitosAtendidos.map((r, i) => (
              <Text key={i} style={{ fontSize: 8, color: "#065f46", marginBottom: 2 }}>
                ✓ {r}
              </Text>
            ))}
          </>
        )}

        {c.categoriaRes.requisitosNaoAtendidos.length > 0 && (
          <>
            <Text style={[s.h3, { color: "#92400e" }]}>Requisitos não atendidos:</Text>
            {c.categoriaRes.requisitosNaoAtendidos.map((r, i) => (
              <Text key={i} style={{ fontSize: 8, color: "#92400e", marginBottom: 2 }}>
                → {r}
              </Text>
            ))}
          </>
        )}

        {/* Alertas de categoria */}
        {c.categoriaRes.alertas.filter(a => a.nivel !== "AVISO_LEGAL").length > 0 && (
          <>
            <Subtitulo titulo="Alertas — categoria OPS" />
            {c.categoriaRes.alertas
              .filter(a => a.nivel !== "AVISO_LEGAL")
              .map(a => <AlertaPDF key={a.code} nivel={a.nivel} mensagem={`[${a.code}] ${a.mensagem}`} />)}
          </>
        )}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.discTxt}>
            CLASSIFICAÇÃO PRELIMINAR — A classificação OPS deve ser confirmada pelo proprietário/operador
            mediante análise de risco formal conforme API Standard 2350, 5ª edição (2020).{"\n"}
            Os valores de tempo mínimo por categoria (Annex G da API 2350) devem ser consultados
            no exemplar licenciado da norma e não são reproduzidos neste documento.{"\n"}
            Esta memória de cálculo tem finalidade de apoio ao dimensionamento; não substitui
            ART/RRT do responsável técnico nem a aprovação de órgãos fiscalizadores.
          </Text>
        </View>

        {p.observacoes && (
          <>
            <Subtitulo titulo="Observações do responsável" />
            <Text style={{ fontSize: 8, color: CARBONO_700, lineHeight: 1.5 }}>
              {p.observacoes}
            </Text>
          </>
        )}

        <RodapePagina projeto={p} />
      </Page>

      {/* ================================================================
          PÁGINA 5 — CHECKLIST DE CONFORMIDADE
      ================================================================ */}
      <Page size="A4" style={s.page}>
        <HeaderPagina tag={p.tagTanque} norma={p.normaContrucao} />

        <Secao titulo="5. Checklist de conformidade" />

        {/* Status geral */}
        {(() => {
          const status = c.statusGeral;
          const borderColor = status === "CONFORME" ? "#16a34a"
            : status === "NAO_CONFORME" ? "#dc2626" : "#d97706";
          const textColor = borderColor;
          const label = status === "CONFORME"
            ? "✓  ANÁLISE CONFORME — todos os requisitos verificados"
            : status === "NAO_CONFORME"
            ? "✗  NÃO CONFORME — revisar itens em vermelho"
            : "⚠  ANÁLISE INCOMPLETA — preencher tempo mínimo (Annex G)";
          const sub = status === "CONFORME"
            ? "O sistema de OPS atende aos requisitos verificados abaixo."
            : status === "NAO_CONFORME"
            ? "Um ou mais requisitos não estão satisfeitos. Veja os itens abaixo."
            : "O campo 'Tempo mínimo — Annex G' não foi preenchido. Consulte o exemplar licenciado da API 2350.";
          return (
            <View style={[s.statusBox, { borderColor }]}>
              <Text style={[s.statusTxt, { color: textColor }]}>{label}</Text>
              <Text style={s.statusSub}>{sub}</Text>
            </View>
          );
        })()}

        {/* Tabela de itens */}
        {(() => {
          const cf = c.conformidade;

          // Escopo
          const escopoOk      = cf.escopo || cf.escopoReqAval;
          const escopoErrMsg  = !escopoOk ? "Produto/instalação fora do escopo da API 2350 — aplicar norma pertinente." : "";
          const escopoObs     = cf.escopoReqAval ? "Escopo requer avaliação adicional — produto/operação limítrofe." : "";

          // AOPS
          const aopsNa        = cf.aops === null;
          const aopsOk        = cf.aops === "APROVADO";

          // Tempo Annex G
          const tempoPend     = cf.tempoCateg === null;
          const tempoOk       = cf.tempoCateg === true;

          const itens = [
            {
              id: "escopo",
              label: "Produto/instalação dentro do escopo da API 2350",
              ok: escopoOk,
              pendente: false,
              na: false,
              obs: escopoObs || escopoErrMsg,
            },
            {
              id: "distHHCH",
              label: "Distância HH → CH suficiente para o volume de resposta",
              ok: cf.distanciaHHCH,
              pendente: false,
              na: false,
              obs: !cf.distanciaHHCH
                ? `Mínimo requerido: ${fmtN1(c.niveisRes.distancia_efetiva_minima_mm)} mm · Disponível: ${fmtN1(c.niveisRes.distancia_CH_HH_mm)} mm`
                : `${fmtN1(c.niveisRes.distancia_CH_HH_mm)} mm ≥ ${fmtN1(c.niveisRes.distancia_efetiva_minima_mm)} mm mínimo`,
            },
            {
              id: "tempDisp",
              label: "Tempo disponível (HH → CH) ≥ tempo de resposta adotado",
              ok: cf.tempoSuficiente,
              pendente: false,
              na: false,
              obs: `${fmtN2(c.t_disponivel_min)} min disponível · ${fmtN2(c.tempoRes.total_adotado_min)} min adotado`,
            },
            {
              id: "mwHH",
              label: "MW (nível máximo de trabalho) abaixo do HH",
              ok: cf.mwAbaixoHH,
              pendente: false,
              na: false,
              obs: !cf.mwAbaixoHH ? "Nível MW deve estar abaixo do LAHH (HH)." : "",
            },
            {
              id: "chFisico",
              label: "CH (Critical High) abaixo do nível físico máximo",
              ok: cf.chAbaixoFisico,
              pendente: false,
              na: false,
              obs: !cf.chAbaixoFisico ? "CH deve estar abaixo do nível de transbordamento físico." : "",
            },
            {
              id: "tempoCateg",
              label: "Tempo de resposta adotado ≥ mínimo da categoria (Annex G)",
              ok: tempoOk,
              pendente: tempoPend,
              na: false,
              obs: tempoPend
                ? "Preencher o campo 'Tempo mínimo — Annex G' com o valor do seu exemplar licenciado da API 2350."
                : tempoOk
                ? `${fmtN2(c.tempoRes.total_adotado_min)} min adotado ≥ ${fmtN2(p.tempoResposta.tempoMinimoCategoria_min!)} min mínimo`
                : `${fmtN2(c.tempoRes.total_adotado_min)} min adotado < ${fmtN2(p.tempoResposta.tempoMinimoCategoria_min!)} min mínimo`,
            },
            {
              id: "aops",
              label: "AOPS — sensor e nível configurados corretamente",
              ok: aopsOk,
              pendente: false,
              na: aopsNa,
              obs: aopsNa
                ? "AOPS não configurado nesta análise."
                : !aopsOk
                ? "Verificar configuração do AOPS (nível e sensor)."
                : "Nível AOPS entre HH e CH.",
            },
          ];

          return (
            <View>
              {itens.map(item => {
                const rowStyle = item.na
                  ? [s.ckRow, s.ckRowNa]
                  : item.pendente
                  ? [s.ckRow, s.ckRowPend]
                  : item.ok
                  ? [s.ckRow, s.ckRowOk]
                  : [s.ckRow, s.ckRowErr];
                const iconColor = item.na ? CARBONO_300
                  : item.pendente ? "#d97706"
                  : item.ok ? "#16a34a"
                  : "#dc2626";
                const icon = item.na ? "—"
                  : item.pendente ? "⚠"
                  : item.ok ? "✓"
                  : "✗";

                return (
                  <View key={item.id}>
                    <View style={rowStyle}>
                      <Text style={[s.ckIcon, { color: iconColor }]}>{icon}</Text>
                      <Text style={s.ckLabel}>{item.label}</Text>
                    </View>
                    {item.obs ? (
                      <Text style={s.ckObs}>{item.obs}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* Cenário informativo: vazão líquida (se houver saída simultânea) */}
        {c.Q_liquida != null && c.volResLiquido != null && (
          <>
            <Subtitulo titulo="Informativo: cenário com saída simultânea de produto" />
            <Text style={{ fontSize: 7.5, color: CARBONO_500, marginBottom: 4, lineHeight: 1.4 }}>
              A API 2350 recomenda abordagem conservadora (sem descontar a saída simultânea) para o
              dimensionamento oficial. O cenário abaixo é apenas informativo — mostra o efeito
              da saída sobre o volume e o tempo disponível.
            </Text>
            <View style={s.table}>
              {[
                ["Vazão de saída simultânea",     `${fmtN1(p.operacao.vazaoSaida_m3h ?? 0)} m³/h`],
                ["Vazão líquida (entrada − saída)", `${fmtN1(c.Q_liquida)} m³/h`],
                ["Volume de resposta (líquido)",   `${fmtN3(c.volResLiquido.volume_m3)} m³`],
                ["Tempo disponível (líquido)",     c.t_disponivel_liquido != null
                  ? `${fmtN2(c.t_disponivel_liquido)} min` : "—"],
              ].map(([l, v], i, arr) => (
                <View key={l} style={i < arr.length - 1 ? s.tRow : s.tRowLast}>
                  <Text style={s.tLabel}>{l}</Text>
                  <Text style={s.tValue}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Nota sobre categoria OPS */}
        <Subtitulo titulo="Categoria OPS classificada" />
        {(() => {
          const catCor2 = catEstilo[String(c.categoriaRes.categoria)] ?? catEstilo["0"];
          return (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Text style={[s.catNumero, { color: catCor2.color, fontSize: 18, textAlign: "left" }]}>
                Categoria {c.categoriaRes.categoria}
              </Text>
              <Text style={{ fontSize: 8.5, color: CARBONO_700 }}>
                ({c.categoriaRes.tipoOPS}) — {c.categoriaRes.justificativa}
              </Text>
            </View>
          );
        })()}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.discTxt}>
            CHECKLIST PRELIMINAR — Este resumo é uma ferramenta de apoio ao dimensionamento;
            não substitui a análise de risco formal, ART/RRT do responsável técnico nem a
            aprovação dos órgãos fiscalizadores.{"\n"}
            Os valores de tempo mínimo por categoria (Annex G) devem ser verificados no
            exemplar licenciado da API Standard 2350, 5ª edição (2020) e não são reproduzidos neste documento.
          </Text>
        </View>

        <RodapePagina projeto={p} />
      </Page>
    </Document>
  );
}
