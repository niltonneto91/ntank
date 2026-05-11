"use client";

/**
 * Calculadora API 2350 — Prevenção de Transbordamento.
 *
 * Organização da página:
 *   - Seções de entrada (Escopo, Geometria, Produto, Operação, Tempo, Níveis, OPS, Monitoramento)
 *   - Painel de resultados (Taxa de subida, Tempo/Volume de resposta, Verificação de níveis, Categoria OPS)
 *   - Diagrama SVG de níveis do tanque
 *   - Botão para baixar a memória de cálculo em PDF
 *
 * API Standard 2350, 5ª edição (2020).
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  verificarEscopoAPI2350,
  calcularTaxaSubidaNivel,
  calcularTempoRespostaAPI2350,
  calcularVolumeRespostaAPI2350,
  verificarNiveisAPI2350,
  classificarCategoriaOPS,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { useApi2350Projeto } from "@/lib/useApi2350Projeto";
import type {
  ClasseNFPA,
  FonteRecebimento,
  PresencaOperacional,
  NiveisAPI2350,
  ProjetoAPI2350,
  TipoTanqueAPI2350,
  NormaContrucao,
} from "@/lib/api2350-projeto";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Opções de dropdowns / checkboxes
// ---------------------------------------------------------------------------

const OPCOES_PRESENCA: ReadonlyArray<{ value: PresencaOperacional; label: string }> = [
  { value: "plena",          label: "Plena — operador presente durante todo o recebimento" },
  { value: "semi",           label: "Semi-assistida — operador presente no início e no fim" },
  { value: "nao-assistida",  label: "Não assistida — sem operador local durante recebimento" },
];

const OPCOES_NORMA: ReadonlyArray<{ value: NormaContrucao; label: string }> = [
  { value: "API650",  label: "API 650" },
  { value: "API620",  label: "API 620" },
  { value: "NBR7821", label: "NBR 7821" },
  { value: "UL142",   label: "UL 142" },
  { value: "outro",   label: "Outro" },
];

const OPCOES_TIPO_TANQUE: ReadonlyArray<{ value: TipoTanqueAPI2350; label: string }> = [
  { value: "vertical-teto-fixo",               label: "Vertical — Teto Fixo" },
  { value: "vertical-teto-flutuante-interno",  label: "Vertical — Teto Flutuante Interno" },
  { value: "vertical-teto-flutuante-externo",  label: "Vertical — Teto Flutuante Externo" },
  { value: "horizontal",                       label: "Horizontal" },
  { value: "outro",                            label: "Outro" },
];

const OPCOES_CLASSE_NFPA: ReadonlyArray<{ value: ClasseNFPA; label: string }> = [
  { value: "I",             label: "Classe I — PF < 37,8°C (gasolina, etanol)" },
  { value: "II",            label: "Classe II — 37,8 a 60°C (diesel, querosene)" },
  { value: "IIIA",          label: "Classe IIIA — 60 a 93°C (óleo combustível leve)" },
  { value: "IIIB",          label: "Classe IIIB — PF ≥ 93°C (asfalto, óleos pesados)" },
  { value: "nao-inflamavel", label: "Não inflamável" },
];

const OPCOES_FONTES: ReadonlyArray<{ value: FonteRecebimento; label: string }> = [
  { value: "duto",          label: "Duto / Pipeline" },
  { value: "navio",         label: "Navio" },
  { value: "barcaca",       label: "Barcaça" },
  { value: "caminhao",      label: "Caminhão-tanque" },
  { value: "vagao",         label: "Vagão-tanque" },
  { value: "tanque-tanque", label: "Transferência tanque-a-tanque" },
  { value: "processo",      label: "Processo" },
  { value: "outro",         label: "Outro" },
];

const OPCOES_ELEMENTO_AOPS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "valvula-motorizada", label: "Válvula motorizada (MOV)" },
  { value: "valvula-pneumatica", label: "Válvula pneumática" },
  { value: "bomba",              label: "Parada de bomba" },
  { value: "intertravamento",    label: "Intertravamento (SIS)" },
  { value: "desvio",             label: "Desvio de linha" },
  { value: "outro",              label: "Outro" },
];

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------
const n1 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n3 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function Alerta({ code, nivel, mensagem }: { code: string; nivel: string; mensagem: string }) {
  const cor =
    nivel === "CRITICO" || nivel === "BLOQUEANTE"
      ? "border-red-200 bg-red-50 text-red-800"
      : nivel === "ALERTA"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : nivel === "INFO"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-carbono-200 bg-carbono-50 text-carbono-600";
  const icone =
    nivel === "CRITICO" || nivel === "BLOQUEANTE"
      ? "⛔"
      : nivel === "ALERTA"
      ? "⚠️"
      : nivel === "INFO"
      ? "ℹ️"
      : "📋";
  return (
    <div className={`flex gap-2 rounded border px-3 py-2 text-xs leading-snug ${cor}`}>
      <span className="shrink-0 text-sm">{icone}</span>
      <span>
        <span className="font-mono text-[10px] opacity-60">[{code}] </span>
        {mensagem}
      </span>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
      ✓ {label ?? "APROVADO"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
      ✗ {label ?? "REPROVADO"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Diagrama SVG do tanque
// ---------------------------------------------------------------------------

function TankDiagram({ niveis, H_total_m }: { niveis: NiveisAPI2350; H_total_m: number }) {
  const { H_fisico_max_m, CH_m, AOPS_m, HH_m, H_m, MW_m, nivelNormal_m } = niveis;
  const H = Math.max(H_total_m, 0.1);

  // Mapeamento de altura para coordenada Y no SVG
  // y=20 quando h=H_total (topo), y=220 quando h=0 (base)
  const toY = (h: number): number =>
    Math.round(220 - (Math.min(Math.max(h, 0), H) / H) * 200);

  const TK_X = 70;   // left edge of tank
  const TK_W = 120;  // tank width

  const yFisico = toY(H_fisico_max_m);
  const yCH     = toY(CH_m);
  const yHH     = toY(HH_m);
  const yMW     = toY(MW_m);
  const yAOPS   = AOPS_m != null ? toY(AOPS_m) : null;
  const yHL     = H_m     != null ? toY(H_m)     : null;
  const yNorm   = nivelNormal_m != null ? toY(nivelNormal_m) : null;

  // Clamp SVG values so bands don't go outside tank
  const yTop    = 20;  // top of tank interior
  const yBot    = 220; // bottom of tank

  return (
    <svg
      viewBox="0 0 280 260"
      className="w-full max-w-[280px]"
      aria-label="Diagrama de níveis do tanque"
    >
      {/* Legenda de cores */}
      {/* Zone: above CH → H_fisico (freeboard — danger) */}
      {yCH > yTop && yFisico < yCH && (
        <rect x={TK_X} y={Math.max(yFisico, yTop)} width={TK_W}
          height={Math.min(yCH, yBot) - Math.max(yFisico, yTop)}
          fill="#fee2e2" />
      )}
      {/* Zone: CH → HH (critical response zone) */}
      {yHH > yTop && yCH < yHH && (
        <rect x={TK_X} y={Math.max(yCH, yTop)} width={TK_W}
          height={Math.min(yHH, yBot) - Math.max(yCH, yTop)}
          fill="#fed7aa" />
      )}
      {/* Zone: HH → MW (alarm zone) */}
      {yMW > yHH && (
        <rect x={TK_X} y={Math.max(yHH, yTop)} width={TK_W}
          height={Math.min(yMW, yBot) - Math.max(yHH, yTop)}
          fill="#fef9c3" />
      )}
      {/* Zone: below MW (normal operating) */}
      {yMW < yBot && (
        <rect x={TK_X} y={Math.max(yMW, yTop)} width={TK_W}
          height={yBot - Math.max(yMW, yTop)}
          fill="#dbeafe" />
      )}

      {/* Normal level fill */}
      {yNorm != null && yNorm < yBot && (
        <rect x={TK_X + 2} y={yNorm} width={TK_W - 4}
          height={yBot - yNorm}
          fill="#93c5fd" opacity={0.5} />
      )}

      {/* Tank shell */}
      <rect x={TK_X} y={yTop} width={TK_W} height={200}
        fill="none" stroke="#374151" strokeWidth="2.5" />

      {/* Level lines */}
      <line x1={TK_X} x2={TK_X + TK_W} y1={yFisico} y2={yFisico}
        stroke="#dc2626" strokeWidth="2" />
      <line x1={TK_X} x2={TK_X + TK_W} y1={yCH} y2={yCH}
        stroke="#ea580c" strokeWidth="2" />
      {yAOPS != null && (
        <line x1={TK_X} x2={TK_X + TK_W} y1={yAOPS} y2={yAOPS}
          stroke="#d97706" strokeWidth="1.5" strokeDasharray="5,3" />
      )}
      <line x1={TK_X} x2={TK_X + TK_W} y1={yHH} y2={yHH}
        stroke="#ca8a04" strokeWidth="2" />
      {yHL != null && (
        <line x1={TK_X} x2={TK_X + TK_W} y1={yHL} y2={yHL}
          stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4,3" />
      )}
      <line x1={TK_X} x2={TK_X + TK_W} y1={yMW} y2={yMW}
        stroke="#16a34a" strokeWidth="2" />

      {/* Labels — right side */}
      <text x={TK_X + TK_W + 5} y={yFisico + 4} fontSize="8" fill="#dc2626" fontWeight="600">Máx. físico</text>
      <text x={TK_X + TK_W + 5} y={yCH + 4}     fontSize="8" fill="#ea580c" fontWeight="600">CH</text>
      {yAOPS != null && (
        <text x={TK_X + TK_W + 5} y={yAOPS + 4} fontSize="8" fill="#d97706">AOPS</text>
      )}
      <text x={TK_X + TK_W + 5} y={yHH + 4}     fontSize="8" fill="#ca8a04" fontWeight="600">HH</text>
      {yHL != null && (
        <text x={TK_X + TK_W + 5} y={yHL + 4}   fontSize="8" fill="#2563eb">H</text>
      )}
      <text x={TK_X + TK_W + 5} y={yMW + 4}     fontSize="8" fill="#16a34a" fontWeight="600">MW</text>

      {/* Heights — left side */}
      <text x={TK_X - 3} y={yFisico + 4} fontSize="8" fill="#dc2626" textAnchor="end">{H_fisico_max_m}m</text>
      <text x={TK_X - 3} y={yCH + 4}     fontSize="8" fill="#ea580c" textAnchor="end">{CH_m}m</text>
      {yAOPS != null && AOPS_m != null && (
        <text x={TK_X - 3} y={yAOPS + 4} fontSize="8" fill="#d97706" textAnchor="end">{AOPS_m}m</text>
      )}
      <text x={TK_X - 3} y={yHH + 4}     fontSize="8" fill="#ca8a04" textAnchor="end">{HH_m}m</text>
      {yHL != null && H_m != null && (
        <text x={TK_X - 3} y={yHL + 4}   fontSize="8" fill="#2563eb" textAnchor="end">{H_m}m</text>
      )}
      <text x={TK_X - 3} y={yMW + 4}     fontSize="8" fill="#16a34a" textAnchor="end">{MW_m}m</text>

      {/* Título */}
      <text x={TK_X + TK_W / 2} y={248} fontSize="9" fill="#6b7280" textAnchor="middle">
        Diagrama de níveis (não à escala)
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function API2350Page({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useApi2350Projeto(id);

  // Estado de geração de PDF — DEVE vir antes de qualquer guarda condicional
  const [gerando, setGerando] = useState(false);

  // Cálculos reativos — executa sempre (hooks antes de guards)
  const calculo = useMemo(() => {
    if (estado.status !== "ok") return null;
    const p = estado.projeto;

    // Vazão efetiva de recebimento
    const Q_efetiva =
      p.operacao.multiplas_fontes && p.operacao.vazaoTotal_simultanea_m3h != null
        ? p.operacao.vazaoTotal_simultanea_m3h
        : p.operacao.vazaoMax_m3h;

    const escopoRes = verificarEscopoAPI2350(p.escopo);

    const taxaRes = calcularTaxaSubidaNivel({
      D_m:          p.geometria.D_m,
      H_util_m:     p.geometria.H_util_m,
      vazaoMax_m3h: Q_efetiva,
      vPorMm_m3_mm: p.geometria.usarVPorMm ? p.geometria.vPorMm_m3_mm : null,
    });

    const tempoRes = calcularTempoRespostaAPI2350(
      p.tempoResposta,
      p.tempoResposta.tempoAdotado_min,
    );

    const volRes = calcularVolumeRespostaAPI2350({
      Q_efetiva_m3h:    Q_efetiva,
      tempo_adotado_min: tempoRes.total_adotado_min,
    });

    const niveisRes = verificarNiveisAPI2350({
      H_fisico_max_m: p.niveis.H_fisico_max_m,
      CH_m:           p.niveis.CH_m,
      AOPS_m:         p.niveis.AOPS_m,
      HH_m:           p.niveis.HH_m,
      H_m:            p.niveis.H_m,
      MW_m:           p.niveis.MW_m,
      A_m2:           taxaRes.A_m2,
      volume_resposta_m3: volRes.volume_m3,
      temAOPS:        p.ops.temAOPS,
    });

    const categoriaRes = classificarCategoriaOPS({
      temATG:                        p.monitoramento.temATG,
      nivelTransmitidoRemoto:        p.monitoramento.nivelTransmitidoRemoto,
      alarmeHHTransmitidoLocalOcupado: p.monitoramento.alarmeEnviadoLocalOcupado,
      temLAHHIndependente:           p.monitoramento.temLAHHIndependente,
      presencaOperacional:           p.monitoramento.presencaOperacional,
      capacidadeEncerrarRemoto:      p.monitoramento.capacidadeEncerrarRemoto,
      temAOPS:                       p.ops.temAOPS,
    });

    // Tempo disponível entre HH e CH (calculado na UI com Q_efetiva)
    const t_disponivel_min =
      Q_efetiva > 0
        ? Math.round(((niveisRes.distancia_CH_HH_mm / 1000) * taxaRes.A_m2) / Q_efetiva * 60 * 100) / 100
        : 0;

    // --- Cenário de vazão líquida (conservador vs. informativo) ---
    // API 2350 recomenda abordagem conservadora (sem descontar saída).
    // Este valor é apenas informativo — mostra o quanto a saída simultânea ajuda.
    const Q_liquida =
      p.operacao.saidaSimultanea && (p.operacao.vazaoSaida_m3h ?? 0) > 0
        ? Math.max(0, Q_efetiva - (p.operacao.vazaoSaida_m3h ?? 0))
        : null;
    const volResLiquido =
      Q_liquida != null
        ? calcularVolumeRespostaAPI2350({
            Q_efetiva_m3h:    Q_liquida,
            tempo_adotado_min: tempoRes.total_adotado_min,
          })
        : null;
    const t_disponivel_liquido =
      Q_liquida != null && Q_liquida > 0
        ? Math.round(((niveisRes.distancia_CH_HH_mm / 1000) * taxaRes.A_m2) / Q_liquida * 60 * 100) / 100
        : null;

    // --- Checklist de conformidade ---
    const tempoCategOk =
      p.tempoResposta.tempoMinimoCategoria_min != null
        ? tempoRes.total_adotado_min >= p.tempoResposta.tempoMinimoCategoria_min
        : null; // null = não avaliado (campo não preenchido)

    const conformidade = {
      escopo:           escopoRes.resultado === "dentro",
      escopoReqAval:    escopoRes.resultado === "requer-avaliacao",
      distanciaHHCH:    niveisRes.status_distancia_HH_CH === "APROVADO",
      mwAbaixoHH:       niveisRes.status_MW_abaixo_HH === "APROVADO",
      chAbaixoFisico:   niveisRes.status_CH_abaixo_fisico === "APROVADO",
      aops:             niveisRes.status_AOPS, // "APROVADO" | "REPROVADO" | "INDETERMINADO" | null
      tempoSuficiente:  t_disponivel_min > 0 && t_disponivel_min >= tempoRes.total_adotado_min,
      tempoCateg:       tempoCategOk,
    } as const;

    // Status geral: INCOMPLETO se Annex G não preenchido, CONFORME se tudo OK
    const itensObrigatorios: boolean[] = [
      conformidade.escopo || conformidade.escopoReqAval,
      conformidade.distanciaHHCH,
      conformidade.mwAbaixoHH,
      conformidade.chAbaixoFisico,
      conformidade.tempoSuficiente,
      ...(conformidade.tempoCateg != null ? [conformidade.tempoCateg] : []),
      ...(conformidade.aops != null ? [conformidade.aops === "APROVADO"] : []),
    ];
    const statusGeral: "CONFORME" | "NAO_CONFORME" | "INCOMPLETO" =
      conformidade.tempoCateg === null
        ? "INCOMPLETO"
        : itensObrigatorios.every(Boolean)
        ? "CONFORME"
        : "NAO_CONFORME";

    return {
      escopoRes, taxaRes, tempoRes, volRes, niveisRes, categoriaRes,
      Q_efetiva, t_disponivel_min,
      Q_liquida, volResLiquido, t_disponivel_liquido,
      conformidade, statusGeral,
    };
  }, [estado]);

  // ---------------------------------------------------------------------------
  // Guards de estado
  // ---------------------------------------------------------------------------
  if (estado.status === "carregando") {
    return (
      <div className="flex h-48 items-center justify-center text-carbono-500">
        Carregando análise…
      </div>
    );
  }
  if (estado.status === "ausente") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-bold">Projeto não encontrado.</p>
        <Link href="/" className="mt-2 inline-block text-sm underline">
          ← Voltar ao início
        </Link>
      </div>
    );
  }
  if (estado.status === "erro") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-bold">Erro ao carregar: {estado.mensagem}</p>
        <Link href="/" className="mt-2 inline-block text-sm underline">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  const p = estado.projeto;

  // ---------------------------------------------------------------------------
  // Helpers de atualização (inline, por seção)
  // ---------------------------------------------------------------------------
  const updEscopo     = (f: Partial<ProjetoAPI2350["escopo"]>) =>
    atualizar(prev => ({ ...prev, escopo:      { ...prev.escopo,      ...f } }));
  const updGeometria  = (f: Partial<ProjetoAPI2350["geometria"]>) =>
    atualizar(prev => ({ ...prev, geometria:   { ...prev.geometria,   ...f } }));
  const updProduto    = (f: Partial<ProjetoAPI2350["produto"]>) =>
    atualizar(prev => ({ ...prev, produto:     { ...prev.produto,     ...f } }));
  const updOperacao   = (f: Partial<ProjetoAPI2350["operacao"]>) =>
    atualizar(prev => ({ ...prev, operacao:    { ...prev.operacao,    ...f } }));
  const updTempo      = (f: Partial<ProjetoAPI2350["tempoResposta"]>) =>
    atualizar(prev => ({ ...prev, tempoResposta: { ...prev.tempoResposta, ...f } }));
  const updNiveis     = (f: Partial<ProjetoAPI2350["niveis"]>) =>
    atualizar(prev => ({ ...prev, niveis:      { ...prev.niveis,      ...f } }));
  const updOps        = (f: Partial<ProjetoAPI2350["ops"]>) =>
    atualizar(prev => ({ ...prev, ops:         { ...prev.ops,         ...f } }));
  const updMonitor    = (f: Partial<ProjetoAPI2350["monitoramento"]>) =>
    atualizar(prev => ({ ...prev, monitoramento: { ...prev.monitoramento, ...f } }));

  // Toggle para array de fontes
  function toggleFonte(fonte: FonteRecebimento) {
    const fontes = p.operacao.fontes.includes(fonte)
      ? p.operacao.fontes.filter(f => f !== fonte)
      : [...p.operacao.fontes, fonte];
    updOperacao({ fontes });
  }

  // PDF download
  async function baixarPDF() {
    if (gerando || !calculo) return;
    setGerando(true);
    try {
      const [{ pdf }, mod] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/MemoriaAPI2350PDF"),
      ]);
      const MemoriaAPI2350PDF = mod.MemoriaAPI2350PDF;
      const blob = await pdf(
        <MemoriaAPI2350PDF projeto={p} calculo={calculo} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OPS_${p.tagTanque}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF. Verifique o console.");
    } finally {
      setGerando(false);
    }
  }

  // Cor de categoria OPS para badge
  const catCor: Record<string, string> = {
    "0": "bg-red-100 text-red-800 border-red-300",
    "1": "bg-amber-100 text-amber-800 border-amber-300",
    "2": "bg-blue-100 text-blue-800 border-blue-300",
    "3": "bg-green-100 text-green-800 border-green-300",
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-carbono-500">
            <Link href="/" className="hover:text-carbono">Início</Link>
            <span>›</span>
            <span>API 2350</span>
          </div>
          <h1 className="mt-1 font-title text-2xl font-extrabold tracking-tight text-carbono">
            {p.nome}
          </h1>
          <p className="mt-0.5 text-sm text-carbono-500">
            <strong>Tag:</strong> {p.tagTanque}
            {p.produto.nome && <> · <strong>Produto:</strong> {p.produto.nome}</>}
            {p.cliente && <> · <strong>Cliente:</strong> {p.cliente}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {/* Badge de status geral */}
          {calculo && (
            <span className={[
              "rounded-full border px-3 py-1 text-xs font-bold",
              calculo.statusGeral === "CONFORME"
                ? "border-green-300 bg-green-100 text-green-800"
                : calculo.statusGeral === "NAO_CONFORME"
                ? "border-red-300 bg-red-100 text-red-800"
                : "border-amber-300 bg-amber-100 text-amber-800",
            ].join(" ")}>
              {calculo.statusGeral === "CONFORME"
                ? "✓ CONFORME"
                : calculo.statusGeral === "NAO_CONFORME"
                ? "✗ NÃO CONFORME"
                : "⚠ INCOMPLETO"}
            </span>
          )}
          {calculo && (
            <Button onClick={baixarPDF} disabled={gerando} variant="ghost">
              {gerando ? "⏳ Gerando…" : "⬇ Memória PDF"}
            </Button>
          )}
        </div>
      </header>

      {/* ======== Layout de duas colunas ======== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">

        {/* === Coluna esquerda — Entradas === */}
        <div className="space-y-6">

          {/* ── Identificação ── */}
          <Card title="Identificação do projeto">
            <div className="grid gap-3 md:grid-cols-3">
              <TextField label="Nome da análise" value={p.nome}
                onChange={v => atualizar({ nome: v })} />
              <TextField label="Tag do tanque" value={p.tagTanque}
                onChange={v => atualizar({ tagTanque: v })} />
              <TextField label="Responsável" value={p.responsavelAnalise}
                onChange={v => atualizar({ responsavelAnalise: v })} />
              <TextField label="Cliente" value={p.cliente}
                onChange={v => atualizar({ cliente: v })} />
              <TextField label="Local" value={p.local}
                onChange={v => atualizar({ local: v })} />
              <SelectField label="Norma de construção"
                value={p.normaContrucao}
                onChange={v => atualizar({ normaContrucao: v as NormaContrucao })}
                options={OPCOES_NORMA} />
            </div>
          </Card>

          {/* ── Escopo ── */}
          <Card title="Enquadramento do escopo (API 2350 §1)"
            subtitle="Marque as características do produto e da instalação.">
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["produtoClasseI_NFPA",          "Produto Classe I — NFPA 30 (PF < 37,8°C)"],
                ["produtoClasseII_NFPA",         "Produto Classe II ou IIIA — NFPA 30"],
                ["produtoLPG",                   "Produto GLP / LPG (propano, butano)"],
                ["produtoLNG",                   "Produto GNL / LNG (gás natural liquefeito)"],
                ["volumeMaior5000L",              "Volume total do tanque > 5.000 L"],
                ["conectadoRecebimento",          "Conectado a sistema de recebimento por transferência"],
                ["exclusivamenteCaminhaoVagao",   "Recebimento exclusivamente por caminhão ou vagão"],
                ["tanqueDedicadoAlivio",          "Tanque dedicado a alivio / emergência"],
                ["cobertoPorOutraPratica",        "Coberto por outra prática equivalente aprovada"],
              ] as [keyof ProjetoAPI2350["escopo"], string][]).map(([campo, label]) => (
                <label key={campo} className="flex items-start gap-2 rounded-lg border border-carbono-200 p-2 text-sm hover:bg-creme cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded"
                    checked={!!(p.escopo as unknown as Record<string, unknown>)[campo]}
                    onChange={e => updEscopo({ [campo]: e.target.checked })}
                  />
                  <span className="leading-snug">{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* ── Geometria ── */}
          <Card title="Geometria do tanque">
            <div className="grid gap-3 md:grid-cols-4">
              <SelectField label="Tipo de tanque" value={p.geometria.tipoTanque}
                onChange={v => updGeometria({ tipoTanque: v as TipoTanqueAPI2350 })}
                options={OPCOES_TIPO_TANQUE} />
              <NumberField label="Diâmetro interno D" unit="m"
                value={p.geometria.D_m}
                onChange={v => updGeometria({ D_m: v })}
                step={0.01} min={0.1} max={100} />
              <NumberField label="Altura total" unit="m"
                value={p.geometria.H_total_m}
                onChange={v => updGeometria({ H_total_m: v })}
                step={0.5} min={0.5} max={50} />
              <NumberField label="Altura útil (calibração)" unit="m"
                value={p.geometria.H_util_m}
                onChange={v => updGeometria({ H_util_m: v })}
                step={0.1} min={0.1} max={p.geometria.H_total_m} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={p.geometria.usarVPorMm}
                  onChange={e => updGeometria({ usarVPorMm: e.target.checked })} />
                Usar V/mm manual (tabela de calibração)
              </label>
              {p.geometria.usarVPorMm && (
                <div className="w-44">
                  <NumberField label="" unit="m³/mm"
                    value={p.geometria.vPorMm_m3_mm ?? 0}
                    onChange={v => updGeometria({ vPorMm_m3_mm: v })}
                    step={0.001} min={0.001} />
                </div>
              )}
            </div>
          </Card>

          {/* ── Produto ── */}
          <Card title="Produto armazenado">
            <div className="grid gap-3 md:grid-cols-3">
              <TextField label="Nome do produto" value={p.produto.nome}
                onChange={v => updProduto({ nome: v })}
                placeholder="Ex.: Diesel S10" />
              <SelectField label="Classe NFPA 30" value={p.produto.classeNFPA}
                onChange={v => updProduto({ classeNFPA: v as ClasseNFPA })}
                options={OPCOES_CLASSE_NFPA} />
              <NumberField label="Temperatura de operação" unit="°C"
                value={p.produto.T_operacao_C ?? 30}
                onChange={v => updProduto({ T_operacao_C: v })}
                step={1} min={-30} max={200} />
              <NumberField label="Densidade" unit="kg/m³"
                value={p.produto.densidade_kg_m3 ?? 0}
                onChange={v => updProduto({ densidade_kg_m3: v > 0 ? v : null })}
                step={1} min={0}
                hint="Opcional — apenas para informação no relatório" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {([
                ["inflamavel",             "Inflamável"],
                ["toxico",                 "Tóxico"],
                ["ambientalmenteCritico",  "Ambientalmente crítico"],
                ["tendenciaEspuma",        "Tendência a formação de espuma"],
                ["riscoEletroestatica",    "Risco de eletrostática"],
              ] as [keyof ProjetoAPI2350["produto"], string][]).map(([c, l]) => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded"
                    checked={!!(p.produto as unknown as Record<string, unknown>)[c]}
                    onChange={e => updProduto({ [c]: e.target.checked })} />
                  {l}
                </label>
              ))}
            </div>
          </Card>

          {/* ── Operação ── */}
          <Card title="Operação de recebimento">
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField label="Vazão máxima de recebimento" unit="m³/h"
                value={p.operacao.vazaoMax_m3h}
                onChange={v => updOperacao({ vazaoMax_m3h: v })}
                step={5} min={0} />
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded"
                    checked={p.operacao.multiplas_fontes}
                    onChange={e => updOperacao({ multiplas_fontes: e.target.checked })} />
                  Múltiplas fontes de recebimento simultâneas
                </label>
                {p.operacao.multiplas_fontes && (
                  <NumberField label="Vazão total simultânea" unit="m³/h"
                    value={p.operacao.vazaoTotal_simultanea_m3h ?? p.operacao.vazaoMax_m3h}
                    onChange={v => updOperacao({ vazaoTotal_simultanea_m3h: v })}
                    step={5} min={0}
                    hint="Soma das vazões de todas as fontes simultâneas" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium">Fontes de recebimento:</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {OPCOES_FONTES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded"
                      checked={p.operacao.fontes.includes(value)}
                      onChange={() => toggleFonte(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded"
                  checked={p.operacao.saidaSimultanea}
                  onChange={e => updOperacao({ saidaSimultanea: e.target.checked })} />
                Há saída simultânea ao recebimento (informativo)
              </label>
              {p.operacao.saidaSimultanea && (
                <div className="w-44">
                  <NumberField label="Vazão de saída" unit="m³/h"
                    value={p.operacao.vazaoSaida_m3h ?? 0}
                    onChange={v => updOperacao({ vazaoSaida_m3h: v > 0 ? v : null })}
                    step={5} min={0}
                    hint="Apenas informativo — cálculo usa abordagem conservadora (sem descontar saída)" />
                </div>
              )}
            </div>
          </Card>

          {/* ── Tempo de Resposta ── */}
          <Card title="Componentes do tempo de resposta (API 2350 §6)"
            subtitle="Preencher com os tempos reais do procedimento operacional aprovado.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ["detecao_min",           "Detecção de nível alto"],
                ["validacao_min",         "Validação do alarme"],
                ["comunicacao_min",       "Comunicação ao operador"],
                ["decisao_min",           "Decisão operacional"],
                ["acaoOperacional_min",   "Ação operacional (deslocamento)"],
                ["fechamentoValvula_min", "Fechamento da válvula"],
                ["paradaBomba_min",       "Parada de bomba"],
                ["drenagemLinha_min",     "Drenagem / equilíbrio da linha"],
                ["margemSeguranca_min",   "Margem de segurança"],
              ] as [keyof ProjetoAPI2350["tempoResposta"], string][]).map(([campo, label]) => (
                <NumberField key={campo} label={label} unit="min"
                  value={(p.tempoResposta as unknown as Record<string, number>)[campo]}
                  onChange={v => updTempo({ [campo]: v })}
                  step={0.5} min={0} />
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <NumberField label="Tempo adotado pelo responsável" unit="min"
                value={p.tempoResposta.tempoAdotado_min ?? 0}
                onChange={v => updTempo({ tempoAdotado_min: v > 0 ? v : null })}
                step={0.5} min={0}
                hint="Deve ser ≥ soma dos componentes. Zero = usar calculado." />
              <div>
                <NumberField label="Tempo mínimo da categoria — Annex G" unit="min"
                  value={p.tempoResposta.tempoMinimoCategoria_min ?? 0}
                  onChange={v => updTempo({ tempoMinimoCategoria_min: v > 0 ? v : null })}
                  step={0.5} min={0}
                  hint="Inserir o valor da Tabela G-1 do seu exemplar licenciado da API 2350." />
                <div className={[
                  "mt-1 rounded border px-2 py-1.5 text-xs leading-snug",
                  p.tempoResposta.tempoMinimoCategoria_min == null
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : calculo?.tempoRes && p.tempoResposta.tempoMinimoCategoria_min <= calculo.tempoRes.total_adotado_min
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800",
                ].join(" ")}>
                  {p.tempoResposta.tempoMinimoCategoria_min == null ? (
                    <>⚠ <strong>Campo obrigatório para verificação de conformidade.</strong>{" "}
                    Consulte a API 2350 Annex G (Tabela G-1) no exemplar licenciado da norma e insira o valor correspondente à categoria identificada pelo sistema.</>
                  ) : calculo?.tempoRes && p.tempoResposta.tempoMinimoCategoria_min <= calculo.tempoRes.total_adotado_min ? (
                    <>✓ Tempo adotado ({n2(calculo.tempoRes.total_adotado_min)} min) ≥ mínimo da categoria ({n2(p.tempoResposta.tempoMinimoCategoria_min)} min)</>
                  ) : (
                    <>✗ Tempo adotado ({n2(calculo?.tempoRes.total_adotado_min ?? 0)} min) &lt; mínimo da categoria ({n2(p.tempoResposta.tempoMinimoCategoria_min)} min) — revisar os componentes ou o nível adotado.</>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* ── Níveis OPS ── */}
          <Card title="Níveis operacionais do OPS (API 2350 §5)"
            subtitle="MW = Maximum Working Level · HH = High-High · CH = Critical High">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label="Nível físico máximo" unit="m"
                value={p.niveis.H_fisico_max_m}
                onChange={v => updNiveis({ H_fisico_max_m: v })}
                step={0.01} min={0.01}
                hint="Ponto de transbordamento real" />
              <NumberField label="CH — Critical High Level" unit="m"
                value={p.niveis.CH_m}
                onChange={v => updNiveis({ CH_m: v })}
                step={0.01} min={0.01} />
              <NumberField label="HH — High-High Level (LAHH)" unit="m"
                value={p.niveis.HH_m}
                onChange={v => updNiveis({ HH_m: v })}
                step={0.01} min={0.01} />
              <NumberField label="MW — Maximum Working Level" unit="m"
                value={p.niveis.MW_m}
                onChange={v => updNiveis({ MW_m: v })}
                step={0.01} min={0.01} />
              <NumberField label="H — High Level (opcional)" unit="m"
                value={p.niveis.H_m ?? 0}
                onChange={v => updNiveis({ H_m: v > 0 ? v : null })}
                step={0.01} min={0}
                hint="Nível de alerta antecipado. Zero = não usado." />
              {p.ops.temAOPS && (
                <NumberField label="Nível de atuação do AOPS" unit="m"
                  value={p.niveis.AOPS_m ?? 0}
                  onChange={v => updNiveis({ AOPS_m: v > 0 ? v : null })}
                  step={0.01} min={0} />
              )}
              <NumberField label="Nível normal de operação" unit="m"
                value={p.niveis.nivelNormal_m ?? 0}
                onChange={v => updNiveis({ nivelNormal_m: v > 0 ? v : null })}
                step={0.01} min={0}
                hint="Opcional — apenas para referência no diagrama" />
              <NumberField label="Nível inicial (antes do recebimento)" unit="m"
                value={p.niveis.nivelInicial_m ?? 0}
                onChange={v => updNiveis({ nivelInicial_m: v > 0 ? v : null })}
                step={0.01} min={0}
                hint="Opcional — nível no início da transferência" />
            </div>
          </Card>

          {/* ── OPS ── */}
          <Card title="Sistema de prevenção — OPS / AOPS">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                {([
                  ["temAOPS",                "Possui AOPS (sistema automático de prevenção)"],
                  ["aopaEncerraRecebimento", "O AOPS encerra efetivamente o recebimento"],
                  ["aopaIndependenteMOPS",   "O AOPS é independente dos instrumentos do MOPS"],
                ] as [keyof ProjetoAPI2350["ops"], string][]).map(([c, l]) => (
                  <label key={c} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded"
                      checked={!!(p.ops as unknown as Record<string, unknown>)[c]}
                      onChange={e => updOps({ [c]: e.target.checked })} />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
              {p.ops.temAOPS && (
                <SelectField label="Elemento final de controle do AOPS"
                  value={p.ops.elementoFinalAOPS ?? ""}
                  onChange={v => updOps({ elementoFinalAOPS: v as typeof p.ops.elementoFinalAOPS })}
                  options={[{ value: "", label: "Selecione…" }, ...OPCOES_ELEMENTO_AOPS]} />
              )}
            </div>
          </Card>

          {/* ── Monitoramento ── */}
          <Card title="Sistema de monitoramento — MOPS">
            <div className="mb-3">
              <SelectField label="Presença operacional durante recebimento"
                value={p.monitoramento.presencaOperacional}
                onChange={v => updMonitor({ presencaOperacional: v as PresencaOperacional })}
                options={OPCOES_PRESENCA} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["temATG",                       "ATG (Automatic Tank Gauge) instalado"],
                ["nivelTransmitidoRemoto",        "Nível transmitido para sala de controle remota"],
                ["temAlarmeH",                    "Alarme de nível H (High) presente"],
                ["temAlarmeHH",                   "Alarme de nível HH (High-High / LAHH) presente"],
                ["alarmeHHIndependente",          "Alarme HH independente do ATG"],
                ["alarmeEnviadoLocalOcupado",     "Alarme HH enviado a local continuamente ocupado"],
                ["temLAHHIndependente",           "Sensor LAHH independente do ATG (para Cat 3)"],
                ["capacidadeEncerrarLocal",       "Capacidade de encerrar recebimento localmente"],
                ["capacidadeEncerrarRemoto",      "Capacidade de encerrar recebimento remotamente"],
              ] as [keyof ProjetoAPI2350["monitoramento"], string][]).map(([c, l]) => (
                <label key={c} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded"
                    checked={!!(p.monitoramento as unknown as Record<string, unknown>)[c]}
                    onChange={e => updMonitor({ [c]: e.target.checked })} />
                  <span className="leading-snug">{l}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* ── Observações ── */}
          <Card title="Observações">
            <textarea
              className="w-full rounded-lg border border-carbono-200 bg-white px-3 py-2 text-sm focus:border-verde focus:outline-none"
              rows={3}
              value={p.observacoes}
              onChange={e => atualizar({ observacoes: e.target.value })}
              placeholder="Condições especiais, restrições, notas da análise…"
            />
          </Card>

        </div> {/* fim coluna esquerda */}

        {/* === Coluna direita — Resultados === */}
        {calculo && (
          <div className="space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">

            {/* Diagrama SVG */}
            <Card title="Diagrama de níveis" destaque>
              <div className="flex justify-center">
                <TankDiagram niveis={p.niveis} H_total_m={p.geometria.H_total_m} />
              </div>
            </Card>

            {/* Escopo */}
            <Card title="Enquadramento">
              {calculo.escopoRes.resultado === "dentro" && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 font-semibold">
                  ✓ Dentro do escopo da API 2350
                </div>
              )}
              {calculo.escopoRes.resultado === "requer-avaliacao" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 font-semibold">
                  ⚠ Requer avaliação adicional
                </div>
              )}
              {calculo.escopoRes.resultado === "fora" && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 font-semibold">
                  ✗ Fora do escopo da API 2350
                </div>
              )}
              {calculo.escopoRes.motivos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {calculo.escopoRes.motivos.map((m, i) => (
                    <li key={i} className="text-xs text-carbono-600">· {m}</li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Geometria / Taxa de subida */}
            <Card title="Taxa de subida de nível">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-carbono-100">
                  <tr><td className="py-1 text-carbono-600">Área da seção</td>
                    <td className="py-1 text-right font-mono font-semibold">
                      {n2(calculo.taxaRes.A_m2)} m²
                    </td>
                  </tr>
                  <tr><td className="py-1 text-carbono-600">Vazão efetiva</td>
                    <td className="py-1 text-right font-mono font-semibold">
                      {n1(calculo.Q_efetiva)} m³/h
                    </td>
                  </tr>
                  <tr><td className="py-1 text-carbono-600">Taxa de subida</td>
                    <td className="py-1 text-right font-mono font-semibold text-verde-700">
                      {n2(calculo.taxaRes.taxaSubida_mm_min)} mm/min
                    </td>
                  </tr>
                  <tr><td className="py-1 text-xs text-carbono-500">= mm/h</td>
                    <td className="py-1 text-right text-xs text-carbono-500 font-mono">
                      {n1(calculo.taxaRes.taxaSubida_mm_h)} mm/h
                    </td>
                  </tr>
                  <tr><td className="py-1 text-xs text-carbono-500">= in/h</td>
                    <td className="py-1 text-right text-xs text-carbono-500 font-mono">
                      {n2(calculo.taxaRes.taxaSubida_in_h)} in/h
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Tempo de resposta */}
            <Card title="Tempo de resposta">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-carbono-100">
                  <tr><td className="py-1 text-carbono-600">Total calculado</td>
                    <td className="py-1 text-right font-mono font-semibold">
                      {n2(calculo.tempoRes.total_calculado_min)} min
                    </td>
                  </tr>
                  <tr><td className="py-1 text-carbono-600">Total adotado</td>
                    <td className="py-1 text-right font-mono font-bold text-carbono">
                      {n2(calculo.tempoRes.total_adotado_min)} min
                    </td>
                  </tr>
                  {p.tempoResposta.tempoMinimoCategoria_min != null && (
                    <tr>
                      <td className="py-1 text-carbono-600">Mínimo exigido (Cat.)</td>
                      <td className="py-1 text-right font-mono">
                        {n2(p.tempoResposta.tempoMinimoCategoria_min)} min
                        {" "}
                        {calculo.tempoRes.total_adotado_min >= p.tempoResposta.tempoMinimoCategoria_min
                          ? <span className="text-green-700">✓</span>
                          : <span className="text-red-700">✗</span>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {calculo.tempoRes.alertas.filter(a => a.nivel !== "AVISO_LEGAL").map(a => (
                <div key={a.code} className="mt-2">
                  <Alerta {...a} />
                </div>
              ))}
            </Card>

            {/* Volume de resposta */}
            <Card title="Volume de resposta requerido">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-carbono-100">
                  {/* Conservador (adotado para cálculo) */}
                  <tr>
                    <td className="py-1 text-carbono-600">
                      Volume conservador
                      {calculo.Q_liquida != null && (
                        <span className="ml-1 text-[10px] text-carbono-400">(adotado)</span>
                      )}
                    </td>
                    <td className="py-1 text-right font-mono font-bold text-carbono">
                      {n3(calculo.volRes.volume_m3)} m³
                    </td>
                  </tr>
                  <tr><td className="py-1 text-xs text-carbono-500">= litros</td>
                    <td className="py-1 text-right text-xs font-mono text-carbono-500">
                      {n1(calculo.volRes.volume_L)} L
                    </td>
                  </tr>
                  <tr><td className="py-1 text-xs text-carbono-500">= barris</td>
                    <td className="py-1 text-right text-xs font-mono text-carbono-500">
                      {n2(calculo.volRes.volume_bbl)} bbl
                    </td>
                  </tr>
                  {/* Comparativo líquido (apenas quando há saída simultânea) */}
                  {calculo.volResLiquido != null && (
                    <>
                      <tr>
                        <td className="pt-2 text-carbono-500 text-xs italic" colSpan={2}>
                          Cenário informativo — com saída simultânea ({n1(calculo.Q_liquida ?? 0)} m³/h líquido):
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-carbono-500">Volume líquido</td>
                        <td className="py-1 text-right font-mono text-carbono-500">
                          {n3(calculo.volResLiquido.volume_m3)} m³
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-xs text-carbono-400">Tempo disp. (líquido)</td>
                        <td className="py-1 text-right text-xs font-mono text-carbono-400">
                          {calculo.t_disponivel_liquido != null
                            ? `${n2(calculo.t_disponivel_liquido)} min`
                            : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="pb-1 text-[10px] text-carbono-400 italic">
                          ⚠ API 2350 recomenda abordagem conservadora. Este cenário é apenas informativo.
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Verificação de níveis */}
            <Card title="Verificação de níveis">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-carbono-100">
                  <tr>
                    <td className="py-1 text-carbono-600">Distância HH → CH</td>
                    <td className="py-1 text-right font-mono">
                      {n1(calculo.niveisRes.distancia_CH_HH_mm)} mm
                    </td>
                    <td className="py-1 pl-2">
                      <StatusBadge ok={calculo.niveisRes.status_distancia_HH_CH === "APROVADO"} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-carbono-600">Mín. normativo (3 in)</td>
                    <td className="py-1 text-right font-mono text-carbono-500">
                      {calculo.niveisRes.distancia_minima_normativa_mm} mm
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-1 text-carbono-600">Mín. efetivo requerido</td>
                    <td className="py-1 text-right font-mono text-carbono-500">
                      {n1(calculo.niveisRes.distancia_efetiva_minima_mm)} mm
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="py-1 text-carbono-600">Distância MW → HH</td>
                    <td className="py-1 text-right font-mono">
                      {n1(calculo.niveisRes.distancia_HH_MW_mm)} mm
                    </td>
                    <td className="py-1 pl-2">
                      <StatusBadge ok={calculo.niveisRes.status_MW_abaixo_HH === "APROVADO"} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-carbono-600">Distância CH → máx. físico</td>
                    <td className="py-1 text-right font-mono">
                      {n1(calculo.niveisRes.distancia_CH_fisico_mm)} mm
                    </td>
                    <td className="py-1 pl-2">
                      <StatusBadge ok={calculo.niveisRes.status_CH_abaixo_fisico === "APROVADO"} />
                    </td>
                  </tr>
                  {calculo.niveisRes.status_AOPS != null && (
                    <tr>
                      <td className="py-1 text-carbono-600">AOPS posicionado</td>
                      <td></td>
                      <td className="py-1 pl-2">
                        <StatusBadge ok={calculo.niveisRes.status_AOPS === "APROVADO"} />
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-1 text-carbono-600">Tempo disp. HH→CH</td>
                    <td className="py-1 text-right font-mono font-bold text-carbono">
                      {n2(calculo.t_disponivel_min)} min
                    </td>
                    <td className="py-1 pl-2">
                      {calculo.t_disponivel_min > 0 && (
                        <StatusBadge
                          ok={calculo.t_disponivel_min >= calculo.tempoRes.total_adotado_min}
                          label={calculo.t_disponivel_min >= calculo.tempoRes.total_adotado_min
                            ? "SUFICIENTE" : "INSUFICIENTE"} />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 space-y-1">
                {calculo.niveisRes.alertas
                  .filter(a => a.nivel !== "AVISO_LEGAL")
                  .map(a => <Alerta key={a.code} {...a} />)}
              </div>
            </Card>

            {/* Checklist de conformidade */}
            <Card title="Checklist de conformidade">
              {/* Status geral */}
              <div className={[
                "mb-3 rounded-lg border-2 px-4 py-2 text-center text-sm font-bold",
                calculo.statusGeral === "CONFORME"
                  ? "border-green-400 bg-green-50 text-green-800"
                  : calculo.statusGeral === "NAO_CONFORME"
                  ? "border-red-400 bg-red-50 text-red-800"
                  : "border-amber-400 bg-amber-50 text-amber-800",
              ].join(" ")}>
                {calculo.statusGeral === "CONFORME" && "✓ ANÁLISE CONFORME — todos os requisitos verificados"}
                {calculo.statusGeral === "NAO_CONFORME" && "✗ NÃO CONFORME — revisar itens marcados em vermelho"}
                {calculo.statusGeral === "INCOMPLETO" && "⚠ ANÁLISE INCOMPLETA — preencher o campo Annex G"}
              </div>

              {/* Tabela de itens */}
              <div className="space-y-1">
                {([
                  {
                    id: "escopo",
                    label: "Tanque dentro do escopo API 2350",
                    ok: calculo.conformidade.escopo,
                    pendente: calculo.conformidade.escopoReqAval,
                    obs: calculo.conformidade.escopoReqAval ? "Requer avaliação adicional pelo proprietário/operador" : undefined,
                  },
                  {
                    id: "distHHCH",
                    label: `Distância HH→CH ≥ mínimo efetivo (${n1(calculo.niveisRes.distancia_efetiva_minima_mm)} mm)`,
                    ok: calculo.conformidade.distanciaHHCH,
                    obs: !calculo.conformidade.distanciaHHCH
                      ? `Disponível: ${n1(calculo.niveisRes.distancia_CH_HH_mm)} mm`
                      : undefined,
                  },
                  {
                    id: "MW",
                    label: "MW abaixo do HH (nível de alarme ≠ nível de operação)",
                    ok: calculo.conformidade.mwAbaixoHH,
                  },
                  {
                    id: "CH",
                    label: "CH abaixo do nível físico máximo (ponto de transbordamento)",
                    ok: calculo.conformidade.chAbaixoFisico,
                  },
                  {
                    id: "tempo",
                    label: `Tempo disponível HH→CH ≥ tempo de resposta (${n2(calculo.tempoRes.total_adotado_min)} min)`,
                    ok: calculo.conformidade.tempoSuficiente,
                    obs: `Disponível: ${n2(calculo.t_disponivel_min)} min`,
                  },
                  ...(calculo.conformidade.tempoCateg !== null
                    ? [{
                        id: "categ",
                        label: `Tempo adotado ≥ mínimo Annex G (${n2(p.tempoResposta.tempoMinimoCategoria_min ?? 0)} min)`,
                        ok: calculo.conformidade.tempoCateg,
                      }]
                    : [{
                        id: "categ",
                        label: "Tempo mínimo categoria (Annex G) — aguardando preenchimento",
                        ok: false,
                        pendente: true,
                      }]),
                  ...(calculo.conformidade.aops !== null
                    ? [{
                        id: "aops",
                        label: "AOPS posicionado entre HH e CH",
                        ok: calculo.conformidade.aops === "APROVADO",
                      }]
                    : []),
                ]).map(({ id, label, ok, pendente, obs }) => (
                  <div key={id} className={[
                    "flex items-start gap-2 rounded px-2 py-1.5 text-xs",
                    pendente
                      ? "bg-amber-50"
                      : ok
                      ? "bg-green-50"
                      : "bg-red-50",
                  ].join(" ")}>
                    <span className="mt-0.5 shrink-0 font-bold">
                      {pendente ? "⚠" : ok ? "✓" : "✗"}
                    </span>
                    <span className={pendente ? "text-amber-800" : ok ? "text-green-800" : "text-red-800"}>
                      {label}
                      {obs && <span className="ml-1 opacity-75">({obs})</span>}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-[10px] text-carbono-400 leading-snug">
                Checklist preliminar — não substitui análise de risco formal e ART/RRT.
              </p>
            </Card>

            {/* Categoria OPS */}
            <Card title="Categoria OPS" destaque>
              <div className="mb-3 flex items-center gap-3">
                <span className={`rounded border px-4 py-2 text-3xl font-extrabold ${catCor[String(calculo.categoriaRes.categoria)] ?? ""}`}>
                  Cat. {calculo.categoriaRes.categoria}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-carbono-500">
                    Tipo OPS
                  </p>
                  <p className="text-sm font-bold text-carbono">
                    {calculo.categoriaRes.tipoOPS}
                  </p>
                </div>
              </div>
              <p className="mb-3 text-xs leading-snug text-carbono-600">
                {calculo.categoriaRes.justificativa}
              </p>
              {calculo.categoriaRes.requisitosAtendidos.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-semibold text-green-700">Requisitos atendidos:</p>
                  <ul className="space-y-0.5">
                    {calculo.categoriaRes.requisitosAtendidos.map((r, i) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-green-700">
                        <span className="shrink-0">✓</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {calculo.categoriaRes.requisitosNaoAtendidos.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-semibold text-amber-700">Requisitos não atendidos:</p>
                  <ul className="space-y-0.5">
                    {calculo.categoriaRes.requisitosNaoAtendidos.map((r, i) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-amber-700">
                        <span className="shrink-0">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2 space-y-1">
                {calculo.categoriaRes.alertas
                  .filter(a => a.nivel !== "AVISO_LEGAL")
                  .map(a => <Alerta key={a.code} {...a} />)}
              </div>
              {/* Aviso legal da categoria */}
              <div className="mt-2 rounded border border-carbono-200 bg-creme px-3 py-2 text-xs text-carbono-500 leading-snug">
                📋 Classificação <strong>PRELIMINAR</strong>. A classificação definitiva deve ser
                determinada pelo proprietário/operador com base em análise de risco formal,
                conforme API Standard 2350, 5ª edição (2020).
              </div>
            </Card>

          </div>
        )}

      </div> {/* fim grid */}
    </div>
  );
}
