"use client";

import { use, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  avaliarCostado,
  calcularMAOLL,
  avaliarFundo,
  avaliarTeto,
  calcularProximaInspecao,
  T_MIN_FUNDO_MM,
  T_MIN_ANELAR_MM,
  T_MIN_TETO_MM,
  type CursoMedido,
  type FundoMedido,
  type TetoMedido,
  type MedicaoHistorica,
  type ResultadoVerificacaoCurso,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField } from "@/components/Field";
import { useApi653Projeto } from "@/lib/useApi653Projeto";
import type { ProjetoAPI653 } from "@/lib/api653-projeto";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Helpers visuais
// ---------------------------------------------------------------------------

function fmtMm(v: number | null | undefined, dec = 2): string {
  if (v == null) return "—";
  return v.toFixed(dec) + " mm";
}
function fmtAnos(v: number | null | undefined): string {
  if (v == null) return "∞";
  if (v === 0) return "0 anos";
  return v.toFixed(1) + " anos";
}
function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

type Semaforo = "verde" | "amarelo" | "vermelho";

function semaforoStatus(status: string | boolean | null): Semaforo {
  if (status === "APROVADO" || status === true) return "verde";
  if (status === "CRITICO") return "amarelo";
  if (status === "REPROVADO" || status === false) return "vermelho";
  return "amarelo";
}

function CorSemaforo({ cor }: { cor: Semaforo }) {
  const cls: Record<Semaforo, string> = {
    verde:    "text-green-700 bg-green-50 border-green-200",
    amarelo:  "text-yellow-700 bg-yellow-50 border-yellow-200",
    vermelho: "text-red-700 bg-red-50 border-red-200",
  };
  const emoji: Record<Semaforo, string> = {
    verde: "✅", amarelo: "⚠️", vermelho: "🔴",
  };
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${cls[cor]}`}>
      {emoji[cor]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Gráfico de vida útil (SVG)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Gráfico de espessura ao longo do tempo — por componente
// ---------------------------------------------------------------------------

interface DadosGraficoAnel {
  label: string;
  status: string;
  t_nominal_mm: number;
  t_min_mm: number;
  CR_mm_ano: number;
  RUL_anos: number | null;
  /** Pontos históricos + atual, ordenados do mais antigo ao mais recente */
  pontos: Array<{ ano: number; t_mm: number }>;
  anoAtual: number;
  t_medida_atual: number;
}

function corGrafico(status: string): string {
  if (status === "REPROVADO") return "#dc2626";
  if (status === "CRITICO")   return "#d97706";
  return "#2563eb";
}

/** Mini-gráfico SVG para um único componente (anel, fundo ou teto). */
function GraficoMiniAnel({ d }: { d: DadosGraficoAnel }) {
  const W = 280, H = 195;
  const ML = 46, MR = 12, MT = 10, MB = 42;
  const plotW = W - ML - MR;
  const plotH = H - MT - MB;

  const cor = corGrafico(d.status);

  // Escala Y: 0..yMaxR (arredondado para cima em múltiplos de 2 mm)
  const yMax = Math.max(d.t_nominal_mm, d.t_medida_atual) * 1.2;
  const yMaxR = Math.max(Math.ceil(yMax / 2) * 2, 6);
  const toY = (t: number) => MT + plotH * (1 - t / yMaxR);

  // Intersecção tendência × MAST (ano decimal)
  const anoIntersecao =
    d.CR_mm_ano > 0 && d.RUL_anos != null
      ? d.anoAtual + d.RUL_anos
      : null;

  // Escala X: anoMin..anoMax
  const anoFirst = d.pontos.length > 0 ? d.pontos[0].ano : d.anoAtual;
  const anoMin = anoFirst - 0.5;
  const anoMaxRaw =
    anoIntersecao != null
      ? anoIntersecao + 1.5
      : d.anoAtual + 8;
  const anoMax = Math.max(anoMaxRaw, d.anoAtual + 2.5);
  const xSpan = anoMax - anoMin;
  const toX = (ano: number) => ML + ((ano - anoMin) / xSpan) * plotW;

  // Ticks Y: a cada 2 mm
  const yTicks: number[] = [];
  for (let t = 0; t <= yMaxR; t += 2) yTicks.push(t);

  // Ticks X: intervalo automático para ~4-5 labels
  const xSpanYears = Math.ceil(xSpan);
  const xStep =
    xSpanYears <= 6  ? 1  :
    xSpanYears <= 12 ? 2  :
    xSpanYears <= 25 ? 5  : 10;
  const xTickStart = Math.ceil(anoMin / xStep) * xStep;
  const xTicks: number[] = [];
  for (let t = xTickStart; t <= anoMax; t += xStep) xTicks.push(t);

  // Caminho dos dados históricos (linha sólida)
  const dataPath =
    d.pontos.length >= 2
      ? d.pontos
          .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.ano).toFixed(1)} ${toY(p.t_mm).toFixed(1)}`)
          .join(" ")
      : null;

  // Caminho de tendência (linha tracejada, do ponto atual ao ponto de falha)
  const trendPath =
    anoIntersecao != null && d.CR_mm_ano > 0
      ? `M ${toX(d.anoAtual).toFixed(1)} ${toY(d.t_medida_atual).toFixed(1)} L ${toX(anoIntersecao).toFixed(1)} ${toY(d.t_min_mm).toFixed(1)}`
      : null;

  const badgeEmoji =
    d.status === "APROVADO" ? "✅" : d.status === "CRITICO" ? "⚠️" : "🔴";
  const rulLabel =
    d.RUL_anos != null ? `${d.RUL_anos.toFixed(1)} anos` : "∞ (vida infinita)";

  return (
    <div className="rounded-md border border-carbono-200 bg-white p-2">
      <p className="mb-1 text-center text-[11px] font-bold text-carbono-700 leading-tight">
        {badgeEmoji} {d.label}
        <span className="font-normal text-carbono-500"> · RUL: {rulLabel}</span>
      </p>
      <svg width={W} height={H} className="select-none overflow-visible">
        {/* Eixo Y — gridlines + labels */}
        {yTicks.map((t) => {
          const y = toY(t);
          return (
            <g key={t}>
              <line
                x1={ML} y1={y} x2={ML + plotW} y2={y}
                stroke={t === 0 ? "#374151" : "#e5e7eb"}
                strokeWidth={t === 0 ? 1 : 0.6}
                strokeDasharray={t > 0 ? "3 3" : undefined}
              />
              <text x={ML - 4} y={y + 3.5} fontSize={7.5} fill="#6b7280" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}

        {/* Label do eixo Y */}
        <text
          x={9}
          y={MT + plotH / 2}
          fontSize={7}
          fill="#9ca3af"
          textAnchor="middle"
          transform={`rotate(-90, 9, ${MT + plotH / 2})`}
        >
          mm
        </text>

        {/* Eixo X — ticks + labels */}
        {xTicks.map((ano) => {
          const x = toX(ano);
          if (x < ML - 2 || x > ML + plotW + 2) return null;
          return (
            <g key={ano}>
              <line x1={x} y1={MT + plotH} x2={x} y2={MT + plotH + 4} stroke="#9ca3af" strokeWidth={0.7} />
              <text x={x} y={MT + plotH + 14} fontSize={7.5} fill="#6b7280" textAnchor="middle">
                {ano}
              </text>
            </g>
          );
        })}

        {/* Bordas do gráfico */}
        <line x1={ML} y1={MT + plotH} x2={ML + plotW} y2={MT + plotH} stroke="#374151" strokeWidth={1} />
        <line x1={ML} y1={MT} x2={ML} y2={MT + plotH} stroke="#374151" strokeWidth={1} />

        {/* Linha horizontal MAST */}
        {d.t_min_mm > 0 && d.t_min_mm < yMaxR && (
          <>
            <line
              x1={ML} y1={toY(d.t_min_mm)} x2={ML + plotW} y2={toY(d.t_min_mm)}
              stroke="#dc2626" strokeWidth={1.2} strokeDasharray="5 3"
            />
            <text
              x={ML + 2} y={toY(d.t_min_mm) - 3}
              fontSize={6.5} fill="#dc2626"
            >
              t_mín {d.t_min_mm.toFixed(2)} mm
            </text>
          </>
        )}

        {/* Linha vertical na intersecção + label do ano */}
        {anoIntersecao != null &&
          toX(anoIntersecao) >= ML &&
          toX(anoIntersecao) <= ML + plotW && (
            <>
              <line
                x1={toX(anoIntersecao)} y1={MT}
                x2={toX(anoIntersecao)} y2={MT + plotH}
                stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="2 3"
              />
              <text
                x={toX(anoIntersecao)}
                y={MT + plotH + 28}
                fontSize={7.5}
                fill="#dc2626"
                textAnchor="middle"
                fontWeight="bold"
              >
                {Math.round(anoIntersecao)}
              </text>
            </>
          )}

        {/* Linha de tendência (tracejada) — projeção futura */}
        {trendPath && (
          <path
            d={trendPath}
            fill="none"
            stroke={cor}
            strokeWidth={1.2}
            strokeDasharray="5 4"
            opacity={0.75}
          />
        )}

        {/* Linha dos dados reais (sólida) */}
        {dataPath && (
          <path
            d={dataPath}
            fill="none"
            stroke={cor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Pontos históricos */}
        {d.pontos.map((pt, i) => {
          const isAtual = i === d.pontos.length - 1;
          const cx = toX(pt.ano);
          const cy = toY(pt.t_mm);
          if (cx < ML - 6 || cx > ML + plotW + 6) return null;
          return (
            <circle
              key={i}
              cx={cx} cy={cy}
              r={isAtual ? 4 : 3}
              fill={isAtual ? cor : "white"}
              stroke={cor}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Marcador da intersecção (falha projetada) */}
        {anoIntersecao != null &&
          toX(anoIntersecao) >= ML &&
          toX(anoIntersecao) <= ML + plotW && (
            <circle
              cx={toX(anoIntersecao)}
              cy={toY(d.t_min_mm)}
              r={4}
              fill="#dc2626"
              stroke="white"
              strokeWidth={1.5}
            />
          )}
      </svg>
    </div>
  );
}

/** Grade responsiva de mini-gráficos, um por componente. */
function GraficoEspessura({ dados }: { dados: DadosGraficoAnel[] }) {
  if (dados.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dados.map((d) => (
        <GraficoMiniAnel key={d.label} d={d} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memorial de cálculo expansível por anel
// ---------------------------------------------------------------------------

function MemorialAnel({ r, D_m, G, S_MPa, E }: {
  r: ResultadoVerificacaoCurso;
  D_m: number;
  G: number;
  S_MPa: number;
  E: number;
}) {
  const [aberto, setAberto] = useState(false);

  const temHistorico = r.CR_historica_mm_ano != null && r.anos_entre_inspecoes != null;

  return (
    <div className="border-t border-carbono-100 pt-2">
      <button
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-1 text-xs text-carbono-500 hover:text-carbono-700 transition-colors"
      >
        <span className="font-mono">{aberto ? "▼" : "▶"}</span>
        Memorial de cálculo — Anel {r.numero}
        {r.n_medicoes > 1 && (
          <span className="ml-1 rounded bg-carbono-100 px-1.5 py-0.5 text-carbono-500">
            {r.n_medicoes} campanhas
          </span>
        )}
      </button>

      {aberto && (
        <div className="mt-3 space-y-4 rounded-md bg-creme p-4 text-xs font-mono text-carbono-700">
          {/* --- MAST --- */}
          <div>
            <p className="mb-1 font-bold font-sans text-carbono-800 not-italic">
              1. Espessura mínima aceitável — MAST (API 653 §4.3.2)
            </p>
            <p className="leading-relaxed">
              t_mín = 2,6 × D × H_liq × G / (S × E)
            </p>
            <p className="leading-relaxed text-carbono-500">onde:</p>
            <p className="leading-relaxed">&nbsp;&nbsp;D = {D_m.toFixed(3)} m</p>
            <p className="leading-relaxed">&nbsp;&nbsp;H_liq = H_total − cota_base − 0,3 = {r.H_liq_acima_m.toFixed(3)} m</p>
            <p className="leading-relaxed">&nbsp;&nbsp;G = {G} (densidade relativa)</p>
            <p className="leading-relaxed">&nbsp;&nbsp;S = {S_MPa} MPa</p>
            <p className="leading-relaxed">&nbsp;&nbsp;E = {E}</p>
            <p className="mt-1 font-semibold leading-relaxed text-carbono-800">
              t_mín = 2,6 × {D_m.toFixed(3)} × {r.H_liq_acima_m.toFixed(3)} × {G} / ({S_MPa} × {E})
              {" = "}<span className="text-verde-700">{fmtMm(r.t_min_mm, 3)}</span>
            </p>
            <p className={`mt-1 font-semibold ${r.t_medida_mm >= r.t_min_mm ? "text-green-700" : "text-red-700"}`}>
              t_medida ({fmtMm(r.t_medida_mm, 2)}) {r.t_medida_mm >= r.t_min_mm ? "≥" : "<"} t_mín ({fmtMm(r.t_min_mm, 3)})
              → {r.t_medida_mm >= r.t_min_mm ? "APROVADO" : "REPROVADO"}
            </p>
          </div>

          {/* --- Taxa de corrosão --- */}
          <div>
            <p className="mb-1 font-bold font-sans text-carbono-800 not-italic">
              2. Taxa de corrosão (CR){r.n_medicoes > 2 ? ` — regressão linear (${r.n_medicoes} campanhas)` : ""}
            </p>
            {temHistorico ? (
              <>
                {r.n_medicoes > 2 ? (
                  <p className="leading-relaxed text-carbono-500">
                    CR calculada por regressão linear dos mínimos quadrados sobre {r.n_medicoes} campanhas
                    (span total: {r.anos_entre_inspecoes?.toFixed(2)} anos).
                  </p>
                ) : (
                  <>
                    <p className="leading-relaxed">CR_histórica = (t_anterior − t_medida) / Δt</p>
                    <p className="leading-relaxed text-carbono-500">
                      &nbsp;&nbsp;t_anterior = {fmtMm(r.t_anterior_mm)}
                    </p>
                    <p className="leading-relaxed text-carbono-500">
                      &nbsp;&nbsp;t_medida = {fmtMm(r.t_medida_mm)}
                    </p>
                    <p className="leading-relaxed text-carbono-500">
                      &nbsp;&nbsp;Δt = {r.anos_entre_inspecoes?.toFixed(2)} anos ({fmtData(r.data_anterior)} → data inspeção)
                    </p>
                    <p className="mt-1 leading-relaxed font-semibold">
                      CR_histórica = ({fmtMm(r.t_anterior_mm)} − {fmtMm(r.t_medida_mm)}) / {r.anos_entre_inspecoes?.toFixed(2)} anos
                      {" = "}{(r.CR_historica_mm_ano ?? 0).toFixed(3)} mm/ano
                    </p>
                  </>
                )}
                <p className="mt-1 leading-relaxed">
                  CR_histórica = {(r.CR_historica_mm_ano ?? 0).toFixed(3)} mm/ano
                </p>
                <p className="leading-relaxed">
                  CR_assumida = {r.CR_assumida_mm_ano.toFixed(3)} mm/ano
                </p>
                <p className="font-semibold text-carbono-800">
                  CR_adotada = max(CR_histórica, CR_assumida) = {r.CR_mm_ano.toFixed(3)} mm/ano
                </p>
              </>
            ) : (
              <>
                <p className="leading-relaxed text-carbono-500">
                  Sem histórico de inspeção anterior. Taxa assumida pelo operador.
                </p>
                <p className="font-semibold">CR_adotada = {r.CR_mm_ano.toFixed(3)} mm/ano</p>
              </>
            )}
          </div>

          {/* --- RUL --- */}
          <div>
            <p className="mb-1 font-bold font-sans text-carbono-800 not-italic">
              3. Vida útil restante — RUL (Remaining Useful Life)
            </p>
            {r.t_medida_mm < r.t_min_mm ? (
              <p className="font-semibold text-red-700">
                t_medida &lt; t_mín → anel REPROVADO — RUL = 0
              </p>
            ) : r.CR_mm_ano <= 0 ? (
              <p className="font-semibold text-green-700">
                CR = 0 → Vida útil indeterminada (sem taxa de corrosão)
              </p>
            ) : (
              <>
                <p className="leading-relaxed">RUL = (t_medida − t_mín) / CR</p>
                <p className="leading-relaxed text-carbono-500">
                  &nbsp;&nbsp;t_sobra = {fmtMm(r.t_medida_mm)} − {fmtMm(r.t_min_mm, 3)} = {fmtMm(r.t_sobra_mm)}
                </p>
                <p className="mt-1 font-semibold text-carbono-800">
                  RUL = {fmtMm(r.t_sobra_mm)} / {r.CR_mm_ano.toFixed(3)} mm/ano
                  {" = "}<span className="text-verde-700">{r.RUL_anos != null ? r.RUL_anos.toFixed(2) : "∞"} anos</span>
                </p>
              </>
            )}
            <p className={`mt-1 font-semibold font-sans ${
              r.status === "APROVADO" ? "text-green-700" :
              r.status === "CRITICO"  ? "text-yellow-700" : "text-red-700"
            }`}>
              Status: {r.status}
            </p>
          </div>

          {r.alertas.length > 0 && (
            <div className="space-y-1 font-sans">
              {r.alertas.map((a, i) => (
                <div key={i} className={`rounded border px-2 py-1 text-xs ${
                  a.nivel === "CRITICO" ? "border-red-200 bg-red-50 text-red-800" :
                  a.nivel === "ALERTA"  ? "border-yellow-200 bg-yellow-50 text-yellow-800" :
                  "border-blue-200 bg-blue-50 text-blue-800"
                }`}>
                  <span className="font-bold">[{a.code}]</span> {a.mensagem}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histórico inline por anel
// ---------------------------------------------------------------------------

/**
 * Componente genérico de histórico de medições.
 * Reutilizado por anéis, fundo e teto.
 */
function HistoricoMedicoes({
  titulo,
  historico,
  tMedidaAtual,
  dataInspecao,
  onChange,
}: {
  titulo: string;
  historico: MedicaoHistorica[];
  tMedidaAtual: number;
  dataInspecao: string;
  onChange: (novoHistorico: MedicaoHistorica[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [novoT, setNovoT] = useState("");
  const [novaData, setNovaData] = useState("");

  function adicionarMedicao() {
    const t = parseFloat(novoT);
    if (!t || !novaData) return;
    const novas = [{ t_mm: t, data: novaData }, ...historico]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    onChange(novas);
    setNovoT("");
    setNovaData("");
  }

  function removerMedicao(i: number) {
    onChange(historico.filter((_, j) => j !== i));
  }

  const count = historico.length;

  return (
    <div>
      <button
        onClick={() => setAberto((a) => !a)}
        className={`flex items-center gap-1 text-xs transition-colors ${
          count > 0 ? "text-blue-600 hover:text-blue-800" : "text-carbono-400 hover:text-carbono-600"
        }`}
      >
        📊 {count === 0 ? "sem histórico" : `${count} anterior${count > 1 ? "es" : ""}`}
      </button>

      {aberto && (
        <div className="mt-2 rounded border border-carbono-200 bg-creme p-3 space-y-2 min-w-[280px]">
          <p className="text-xs font-bold text-carbono-600 uppercase tracking-wide">
            Campanhas anteriores — {titulo}
          </p>
          {historico.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-carbono-400 uppercase">
                  <th className="text-left pb-1">Data</th>
                  <th className="text-right pb-1">t (mm)</th>
                  <th className="pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {historico.map((m, i) => (
                  <tr key={i} className="border-t border-carbono-100">
                    <td className="py-1">{fmtData(m.data)}</td>
                    <td className="py-1 text-right tabular font-semibold">{m.t_mm.toFixed(2)}</td>
                    <td className="py-1 text-right">
                      <button onClick={() => removerMedicao(i)} className="text-red-500 hover:text-red-700 ml-2">✕</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-carbono-100 text-carbono-400 italic">
                  <td className="py-1">{fmtData(dataInspecao)} (atual)</td>
                  <td className="py-1 text-right tabular">{tMedidaAtual.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-carbono-400 italic">Nenhuma campanha anterior cadastrada.</p>
          )}
          <div className="flex gap-2 items-center pt-1 border-t border-carbono-200">
            <input
              type="date"
              value={novaData}
              max={dataInspecao}
              onChange={(e) => setNovaData(e.target.value)}
              className="rounded border border-carbono-300 bg-white px-2 py-1 text-xs outline-none focus:border-verde"
            />
            <input
              type="number"
              placeholder="t (mm)"
              value={novoT}
              step={0.1}
              min={0}
              onChange={(e) => setNovoT(e.target.value)}
              className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-xs outline-none focus:border-verde"
            />
            <Button size="sm" onClick={adicionarMedicao}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrapper de HistoricoMedicoes específico para anéis do costado. */
function HistoricoAnel({
  curso,
  idx,
  dataInspecao,
  onChange,
}: {
  curso: CursoMedido;
  idx: number;
  dataInspecao: string;
  onChange: (historico: MedicaoHistorica[]) => void;
}) {
  // Compatibilidade: se só tem t_anterior_mm/data_anterior, inicializa historico a partir deles
  const historico: MedicaoHistorica[] = curso.historico ?? (
    curso.t_anterior_mm != null && curso.data_anterior
      ? [{ t_mm: curso.t_anterior_mm, data: curso.data_anterior }]
      : []
  );

  // Suprime warning de idx não usado (mantido na API por compatibilidade com TabelaAneis)
  void idx;

  return (
    <HistoricoMedicoes
      titulo={`Anel ${curso.numero}`}
      historico={historico}
      tMedidaAtual={curso.t_medida_mm}
      dataInspecao={dataInspecao}
      onChange={onChange}
    />
  );
}

// ---------------------------------------------------------------------------
// Tabela de anéis com edição inline
// ---------------------------------------------------------------------------

function TabelaAneis({
  p,
  atualizar,
}: {
  p: ProjetoAPI653;
  atualizar: (upd: Partial<ProjetoAPI653>) => void;
}) {
  const resultado = useMemo(
    () =>
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
        : null,
    [p],
  );

  function setCursoNumerico(idx: number, campo: keyof CursoMedido, valor: number | null) {
    const novos = p.cursos.map((c, i) => i === idx ? { ...c, [campo]: valor } : c);
    atualizar({ cursos: novos });
  }

  function setCursoHistorico(idx: number, historico: MedicaoHistorica[]) {
    const novos = p.cursos.map((c, i) =>
      i === idx ? { ...c, historico, t_anterior_mm: historico[0]?.t_mm ?? null, data_anterior: historico[0]?.data ?? null } : c
    );
    atualizar({ cursos: novos });
  }

  return (
    <div className="space-y-3">
      {resultado && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-carbono-500">Status geral: </span>
            <span className={`font-bold ${resultado.costadoAprovado ? "text-green-700" : "text-red-700"}`}>
              {resultado.costadoAprovado ? "APROVADO" : "REPROVADO / CRÍTICO"}
            </span>
          </div>
          <div>
            <span className="text-carbono-500">RUL costado: </span>
            <span className="font-bold tabular">{fmtAnos(resultado.RUL_costado_anos)}</span>
          </div>
          {resultado.cursoCritico && (
            <div>
              <span className="text-carbono-500">Anel crítico: </span>
              <span className="font-bold tabular">#{resultado.cursoCritico.numero}</span>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-carbono-200 text-left text-xs text-carbono-500 uppercase">
              <th className="pb-2 pr-3 font-semibold">Anel</th>
              <th className="pb-2 pr-3 font-semibold">Altura (m)</th>
              <th className="pb-2 pr-3 font-semibold">t nom. (mm)</th>
              <th className="pb-2 pr-3 font-semibold">t med. (mm)</th>
              <th className="pb-2 pr-3 font-semibold">Histórico</th>
              <th className="pb-2 pr-3 font-semibold">t mín. (mm)</th>
              <th className="pb-2 pr-3 font-semibold">CR (mm/a)</th>
              <th className="pb-2 pr-3 font-semibold">RUL (anos)</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {p.cursos.map((c, idx) => {
              const r = resultado?.cursos[idx];
              const semaforo = r ? semaforoStatus(r.status) : "amarelo";
              return (
                <tr key={c.numero} className="border-b border-carbono-100 align-top">
                  <td className="py-2 pr-3">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                      semaforo === "verde" ? "bg-green-600" :
                      semaforo === "amarelo" ? "bg-yellow-500" : "bg-red-600"
                    }`}>
                      {c.numero}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.altura_m}
                      min={0.1}
                      step={0.01}
                      onChange={(e) => setCursoNumerico(idx, "altura_m", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.t_nominal_mm}
                      min={0}
                      step={0.1}
                      onChange={(e) => setCursoNumerico(idx, "t_nominal_mm", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.t_medida_mm}
                      min={0}
                      step={0.1}
                      onChange={(e) => setCursoNumerico(idx, "t_medida_mm", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <HistoricoAnel
                      curso={c}
                      idx={idx}
                      dataInspecao={p.dataInspecao}
                      onChange={(h) => setCursoHistorico(idx, h)}
                    />
                  </td>
                  <td className="py-2 pr-3 tabular text-carbono-600">
                    {r ? fmtMm(r.t_min_mm) : "—"}
                  </td>
                  <td className="py-2 pr-3 tabular text-carbono-600">
                    {r ? (
                      <span title={r.CR_historica_mm_ano != null ? `Histórica: ${r.CR_historica_mm_ano.toFixed(3)}` : "Sem histórico"}>
                        {r.CR_mm_ano > 0 ? r.CR_mm_ano.toFixed(3) : "0"}
                        {r.n_medicoes > 1 && (
                          <span className="ml-1 text-blue-500 text-xs" title={`${r.n_medicoes} campanhas`}>●</span>
                        )}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3 tabular font-semibold">
                    {r ? fmtAnos(r.RUL_anos) : "—"}
                  </td>
                  <td className="py-2">
                    {r ? <CorSemaforo cor={semaforo} /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Memoriais expansíveis por anel */}
      {resultado && resultado.cursos.length > 0 && (
        <div className="mt-4 space-y-2">
          {resultado.cursos.map((r) => (
            <MemorialAnel
              key={r.numero}
              r={r}
              D_m={p.geometria.D_m}
              G={p.produto.G}
              S_MPa={p.material.S_MPa}
              E={p.material.E}
            />
          ))}
        </div>
      )}

      {resultado && resultado.alertas.length > 0 && (
        <div className="space-y-1">
          {resultado.alertas.map((a, i) => (
            <div key={i} className={`rounded-md border px-3 py-2 text-xs ${
              a.nivel === "CRITICO" ? "border-red-200 bg-red-50 text-red-800" :
              a.nivel === "ALERTA"  ? "border-yellow-200 bg-yellow-50 text-yellow-800" :
              "border-blue-200 bg-blue-50 text-blue-800"
            }`}>
              <span className="font-bold">[{a.code}] </span>
              {a.mensagem}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAOLL
// ---------------------------------------------------------------------------

function SecaoMAOLL({ p }: { p: ProjetoAPI653 }) {
  const resultado = useMemo(
    () =>
      p.cursos.length > 0
        ? calcularMAOLL(p.geometria.D_m, p.H_liq_m, p.produto.G, p.material.S_MPa, p.material.E, p.cursos)
        : null,
    [p],
  );

  if (!resultado)
    return <p className="text-sm text-carbono-500">Insira os anéis para calcular o MAOLL.</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-carbono-500">H projeto (m)</p>
          <p className="text-xl font-bold tabular">{p.H_liq_m.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">MAOLL (m)</p>
          <p className={`text-xl font-bold tabular ${resultado.reratingNecessario ? "text-yellow-700" : "text-green-700"}`}>
            {resultado.MAOLL_m.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">Volume disponível</p>
          <p className="text-xl font-bold tabular">{resultado.pct_volume_disponivel.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">Re-rating</p>
          <p className={`text-xl font-bold ${resultado.reratingNecessario ? "text-yellow-700" : "text-green-700"}`}>
            {resultado.reratingNecessario ? "Necessário" : "Não necessário"}
          </p>
        </div>
      </div>
      {resultado.alertas.map((a, i) => (
        <div key={i} className={`rounded-md border px-3 py-2 text-xs ${
          a.nivel === "CRITICO" ? "border-red-200 bg-red-50 text-red-800" :
          "border-yellow-200 bg-yellow-50 text-yellow-800"
        }`}>
          <span className="font-bold">[{a.code}] </span>{a.mensagem}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fundo
// ---------------------------------------------------------------------------

function SecaoFundo({ p, atualizar }: { p: ProjetoAPI653; atualizar: (upd: Partial<ProjetoAPI653>) => void }) {
  const fundo = p.fundo;
  const resultado = useMemo(() => fundo ? avaliarFundo(fundo, p.dataInspecao) : null, [fundo, p.dataInspecao]);

  function setFundoCampo(campo: keyof FundoMedido, valor: number | null) {
    atualizar({
      fundo: fundo
        ? { ...fundo, [campo]: valor }
        : { t_nominal_mm: 0, t_medida_mm: 0, CR_assumida_mm_ano: p.CR_global_mm_ano, [campo]: valor },
    });
  }

  function setFundoHistorico(historico: MedicaoHistorica[]) {
    if (!fundo) return;
    atualizar({
      fundo: {
        ...fundo,
        historico,
        // mantém compatibilidade: sincroniza t_anterior/data_anterior com o mais recente
        t_anterior_mm: historico[0]?.t_mm ?? null,
        data_anterior: historico[0]?.data ?? null,
      },
    });
  }

  if (!fundo) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-carbono-500">Dados do fundo não inseridos.</p>
        <Button variant="secondary" size="sm" onClick={() =>
          atualizar({ fundo: { t_nominal_mm: 6, t_medida_mm: 0, CR_assumida_mm_ano: p.CR_global_mm_ano } })
        }>
          + Adicionar dados do fundo
        </Button>
      </div>
    );
  }

  const semaforo = resultado ? semaforoStatus(resultado.status) : "amarelo";
  const historicoFundo: MedicaoHistorica[] = fundo.historico ?? (
    fundo.t_anterior_mm != null && fundo.data_anterior
      ? [{ t_mm: fundo.t_anterior_mm, data: fundo.data_anterior }]
      : []
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberField label="t nominal (mm)" value={fundo.t_nominal_mm} onChange={(v) => setFundoCampo("t_nominal_mm", v)} min={0} step={0.1} />
        <NumberField label="t medida (mm)" value={fundo.t_medida_mm} onChange={(v) => setFundoCampo("t_medida_mm", v)} min={0} step={0.1} />
        <NumberField label="t anelar (mm) — opc." value={fundo.t_anelar_mm ?? ""} onChange={(v) => setFundoCampo("t_anelar_mm", v || null)} min={0} step={0.1} />
        <NumberField label="CR assumida (mm/ano)" value={fundo.CR_assumida_mm_ano ?? p.CR_global_mm_ano} onChange={(v) => setFundoCampo("CR_assumida_mm_ano", v)} min={0} step={0.01} />
      </div>
      <HistoricoMedicoes
        titulo="Fundo"
        historico={historicoFundo}
        tMedidaAtual={fundo.t_medida_mm}
        dataInspecao={p.dataInspecao}
        onChange={setFundoHistorico}
      />
      {resultado && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-md bg-creme p-4">
          <div><p className="text-xs text-carbono-500">t mín. API 653</p><p className="font-bold tabular">{T_MIN_FUNDO_MM} mm</p></div>
          <div><p className="text-xs text-carbono-500">CR adotada</p><p className="font-bold tabular">{resultado.CR_mm_ano.toFixed(3)} mm/ano</p></div>
          <div><p className="text-xs text-carbono-500">RUL fundo</p><p className="font-bold tabular">{fmtAnos(resultado.RUL_anos)}</p></div>
          <div>
            <p className="text-xs text-carbono-500">Status</p>
            <div className="flex items-center gap-2">
              <CorSemaforo cor={semaforo} />
              <span className="font-bold">{resultado.status}</span>
            </div>
          </div>
          {resultado.anelarAprovado != null && (
            <div>
              <p className="text-xs text-carbono-500">Anelar ≥ {T_MIN_ANELAR_MM} mm</p>
              <p className={`font-bold ${resultado.anelarAprovado ? "text-green-700" : "text-red-700"}`}>
                {resultado.anelarAprovado ? "OK" : "ABAIXO DO MÍNIMO"}
              </p>
            </div>
          )}
        </div>
      )}
      {resultado?.alertas.map((a, i) => (
        <div key={i} className={`rounded-md border px-3 py-2 text-xs ${
          a.nivel === "CRITICO" ? "border-red-200 bg-red-50 text-red-800" :
          a.nivel === "ALERTA"  ? "border-yellow-200 bg-yellow-50 text-yellow-800" :
          "border-blue-200 bg-blue-50 text-blue-800"
        }`}><span className="font-bold">[{a.code}] </span>{a.mensagem}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teto
// ---------------------------------------------------------------------------

function SecaoTeto({ p, atualizar }: { p: ProjetoAPI653; atualizar: (upd: Partial<ProjetoAPI653>) => void }) {
  const teto = p.teto;
  const resultado = useMemo(() => teto ? avaliarTeto(teto, p.dataInspecao) : null, [teto, p.dataInspecao]);

  function setTetoCampo(campo: keyof TetoMedido, valor: number | string | null) {
    atualizar({
      teto: teto
        ? { ...teto, [campo]: valor }
        : { t_nominal_mm: 6, t_medida_mm: 0, CR_assumida_mm_ano: p.CR_global_mm_ano, [campo]: valor },
    });
  }

  function setTetoHistorico(historico: MedicaoHistorica[]) {
    if (!teto) return;
    atualizar({
      teto: {
        ...teto,
        historico,
        // mantém compatibilidade: sincroniza t_anterior/data_anterior com o mais recente
        t_anterior_mm: historico[0]?.t_mm ?? null,
        data_anterior: historico[0]?.data ?? null,
      },
    });
  }

  if (!teto) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-carbono-500">Dados do teto não inseridos.</p>
        <Button variant="secondary" size="sm" onClick={() =>
          atualizar({ teto: { t_nominal_mm: 6, t_medida_mm: 0, CR_assumida_mm_ano: p.CR_global_mm_ano } })
        }>
          + Adicionar dados do teto
        </Button>
      </div>
    );
  }

  const semaforo = resultado ? semaforoStatus(resultado.status) : "amarelo";
  const historicoTeto: MedicaoHistorica[] = teto.historico ?? (
    teto.t_anterior_mm != null && teto.data_anterior
      ? [{ t_mm: teto.t_anterior_mm, data: teto.data_anterior }]
      : []
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberField label="t nominal (mm)" value={teto.t_nominal_mm} onChange={(v) => setTetoCampo("t_nominal_mm", v)} min={0} step={0.1} />
        <NumberField label="t medida (mm)" value={teto.t_medida_mm} onChange={(v) => setTetoCampo("t_medida_mm", v)} min={0} step={0.1} />
        <NumberField label="CR assumida (mm/ano)" value={teto.CR_assumida_mm_ano} onChange={(v) => setTetoCampo("CR_assumida_mm_ano", v)} min={0} step={0.01} />
      </div>
      <HistoricoMedicoes
        titulo="Teto"
        historico={historicoTeto}
        tMedidaAtual={teto.t_medida_mm}
        dataInspecao={p.dataInspecao}
        onChange={setTetoHistorico}
      />

      {resultado && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-md bg-creme p-4">
          <div><p className="text-xs text-carbono-500">t mín. (3/16")</p><p className="font-bold tabular">{T_MIN_TETO_MM} mm</p></div>
          <div><p className="text-xs text-carbono-500">CR adotada</p><p className="font-bold tabular">{resultado.CR_mm_ano.toFixed(3)} mm/ano</p></div>
          <div><p className="text-xs text-carbono-500">RUL teto</p><p className="font-bold tabular">{fmtAnos(resultado.RUL_anos)}</p></div>
          <div>
            <p className="text-xs text-carbono-500">Status</p>
            <div className="flex items-center gap-2">
              <CorSemaforo cor={semaforo} />
              <span className="font-bold">{resultado.status}</span>
            </div>
          </div>
        </div>
      )}
      {resultado?.alertas.map((a, i) => (
        <div key={i} className={`rounded-md border px-3 py-2 text-xs ${
          a.nivel === "CRITICO" ? "border-red-200 bg-red-50 text-red-800" :
          a.nivel === "ALERTA"  ? "border-yellow-200 bg-yellow-50 text-yellow-800" :
          "border-blue-200 bg-blue-50 text-blue-800"
        }`}><span className="font-bold">[{a.code}] </span>{a.mensagem}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Próxima Inspeção
// ---------------------------------------------------------------------------

function SecaoProximaInspecao({ p }: { p: ProjetoAPI653 }) {
  const RUL_costado = useMemo(() => {
    if (p.cursos.length === 0) return null;
    return avaliarCostado({
      D_m: p.geometria.D_m, H_m: p.geometria.H_m, H_liq_m: p.H_liq_m,
      G: p.produto.G, S_MPa: p.material.S_MPa, E: p.material.E,
      cursos: p.cursos, CR_assumida_mm_ano: p.CR_global_mm_ano, dataInspecao: p.dataInspecao,
    }).RUL_costado_anos;
  }, [p]);

  const RUL_fundo = useMemo(() => p.fundo ? avaliarFundo(p.fundo, p.dataInspecao).RUL_anos : null, [p]);
  const RUL_teto  = useMemo(() => p.teto  ? avaliarTeto(p.teto, p.dataInspecao).RUL_anos   : null, [p]);

  // RUL crítico: menor entre todos os componentes
  const RULs = [RUL_costado, RUL_fundo, RUL_teto].filter((v) => v !== null) as number[];
  const RUL_critico = RULs.length > 0 ? Math.min(...RULs) : null;

  const resultado = useMemo(
    () => calcularProximaInspecao(p.dataInspecao, RUL_critico, null),
    [p.dataInspecao, RUL_critico],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-carbono-500">Data da inspeção atual</p>
          <p className="font-bold tabular">{fmtData(resultado.dataInspecao)}</p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">RUL crítico</p>
          <p className="font-bold tabular text-lg">{fmtAnos(resultado.RUL_critico_anos)}</p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">Próxima inspeção INTERNA</p>
          <p className="font-bold tabular text-lg">{fmtData(resultado.dataProximaInterna)}</p>
          <p className="text-xs text-carbono-400">em {fmtAnos(resultado.intervaloInterno_anos)} — (RUL/4, máx 20 anos)</p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">Próxima inspeção EXTERNA</p>
          <p className="font-bold tabular text-lg">{fmtData(resultado.dataProximaExterna)}</p>
          <p className="text-xs text-carbono-400">em {fmtAnos(resultado.intervaloExterno_anos)} — (RUL/2, máx 10 anos)</p>
        </div>
      </div>
      {resultado.alertas.map((a, i) => (
        <div key={i} className={`rounded-md border px-3 py-2 text-xs ${
          a.nivel === "CRITICO" ? "border-red-200 bg-red-50 text-red-800" :
          a.nivel === "ALERTA"  ? "border-yellow-200 bg-yellow-50 text-yellow-800" :
          "border-blue-200 bg-blue-50 text-blue-800"
        }`}><span className="font-bold">[{a.code}] </span>{a.mensagem}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nova campanha de medição
// ---------------------------------------------------------------------------

function NovaCampanha({ p, atualizar }: { p: ProjetoAPI653; atualizar: (upd: Partial<ProjetoAPI653>) => void }) {
  const [aberto, setAberto] = useState(false);
  const [novaData, setNovaData] = useState("");

  function confirmar() {
    if (!novaData) return;
    // Mover cada medição atual para o histórico de cada anel
    const novosAneis = p.cursos.map((c) => {
      const entradaAtual: MedicaoHistorica = { t_mm: c.t_medida_mm, data: p.dataInspecao };
      const historicoExistente: MedicaoHistorica[] = c.historico ?? (
        c.t_anterior_mm != null && c.data_anterior
          ? [{ t_mm: c.t_anterior_mm, data: c.data_anterior }]
          : []
      );
      const novoHistorico = [entradaAtual, ...historicoExistente]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      return {
        ...c,
        t_medida_mm: 0,              // limpar para o usuário digitar os novos valores
        historico: novoHistorico,
        t_anterior_mm: entradaAtual.t_mm,
        data_anterior: entradaAtual.data,
      };
    });

    // Mover fundo atual para histórico (se existir)
    const novoFundo = p.fundo
      ? { ...p.fundo, t_anterior_mm: p.fundo.t_medida_mm, data_anterior: p.dataInspecao, t_medida_mm: 0 }
      : undefined;

    // Mover teto atual para histórico (se existir)
    const novoTeto = p.teto
      ? { ...p.teto, t_anterior_mm: p.teto.t_medida_mm, data_anterior: p.dataInspecao, t_medida_mm: 0 }
      : undefined;

    atualizar({
      dataInspecao: novaData,
      cursos: novosAneis,
      fundo: novoFundo,
      teto: novoTeto,
    });
    setAberto(false);
    setNovaData("");
  }

  if (!aberto) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setAberto(true)}>
        📅 Nova campanha de medição
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-carbono-200 bg-creme p-4 space-y-3 max-w-md">
      <p className="text-sm font-bold text-carbono-800">Nova campanha de medição</p>
      <p className="text-xs text-carbono-600">
        As medições atuais ({fmtData(p.dataInspecao)}) serão movidas para o histórico de cada componente.
        Você inserirá os novos valores para esta data.
      </p>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-carbono-700">Data da nova inspeção *</label>
        <input
          type="date"
          value={novaData}
          min={p.dataInspecao}
          onChange={(e) => setNovaData(e.target.value)}
          className="rounded border border-carbono-300 bg-white px-3 py-2 text-sm outline-none focus:border-verde"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={confirmar} disabled={!novaData}>Iniciar nova campanha</Button>
        <Button size="sm" variant="ghost" onClick={() => { setAberto(false); setNovaData(""); }}>Cancelar</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function InspecaoAPI653Page({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useApi653Projeto(id);

  // Hooks DEVEM vir antes de qualquer return condicional (Rules of Hooks)
  const [gerando, setGerando] = useState(false);

  const baixarPDF = useCallback(async () => {
    if (estado.status !== "ok") return;
    if (gerando) return;
    const projeto = estado.projeto;
    setGerando(true);
    try {
      const [{ pdf }, mod] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/MemoriaAPI653PDF"),
      ]);
      const MemoriaAPI653PDF = mod.MemoriaAPI653PDF;
      const blob = await pdf(<MemoriaAPI653PDF projeto={projeto} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `API653_${projeto.tagTanque}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF. Verifique o console.");
    } finally {
      setGerando(false);
    }
  }, [gerando, estado]);

  // useMemo DEVE vir antes dos early returns — Rules of Hooks
  const dadosGrafico = useMemo((): DadosGraficoAnel[] => {
    if (estado.status !== "ok") return [];
    const proj = estado.projeto;
    const anoAtual = parseInt(proj.dataInspecao.slice(0, 4), 10);

    /** Constrói array de pontos {ano, t_mm} a partir do histórico + medição atual. */
    function pontosDe(
      historico: Array<{ t_mm: number; data: string }> | null | undefined,
      tAtual: number,
      dataAtual: string,
    ): Array<{ ano: number; t_mm: number }> {
      const hist = historico ?? [];
      const todos = [
        ...hist.map((m) => ({ ano: parseInt(m.data.slice(0, 4), 10), t_mm: m.t_mm })),
        { ano: parseInt(dataAtual.slice(0, 4), 10), t_mm: tAtual },
      ];
      return todos
        .sort((a, b) => a.ano - b.ano)
        .filter((pt, i, arr) => i === 0 || pt.ano !== arr[i - 1].ano);
    }

    const dados: DadosGraficoAnel[] = [];

    // Anéis do costado
    if (proj.cursos.length > 0) {
      const costado = avaliarCostado({
        D_m: proj.geometria.D_m, H_m: proj.geometria.H_m, H_liq_m: proj.H_liq_m,
        G: proj.produto.G, S_MPa: proj.material.S_MPa, E: proj.material.E,
        cursos: proj.cursos, CR_assumida_mm_ano: proj.CR_global_mm_ano, dataInspecao: proj.dataInspecao,
      });
      for (const c of costado.cursos) {
        const curso = proj.cursos.find((cs) => cs.numero === c.numero);
        const hist = curso?.historico ?? (
          curso?.t_anterior_mm != null && curso?.data_anterior
            ? [{ t_mm: curso.t_anterior_mm, data: curso.data_anterior }]
            : []
        );
        dados.push({
          label: `A${c.numero}`,
          status: c.status,
          t_nominal_mm: c.t_nominal_mm,
          t_min_mm: c.t_min_mm,
          CR_mm_ano: c.CR_mm_ano,
          RUL_anos: c.RUL_anos,
          pontos: pontosDe(hist, c.t_medida_mm, proj.dataInspecao),
          anoAtual,
          t_medida_atual: c.t_medida_mm,
        });
      }
    }

    // Fundo
    if (proj.fundo) {
      const rf = avaliarFundo(proj.fundo, proj.dataInspecao);
      const hist = proj.fundo.historico ?? (
        proj.fundo.t_anterior_mm != null && proj.fundo.data_anterior
          ? [{ t_mm: proj.fundo.t_anterior_mm, data: proj.fundo.data_anterior }]
          : []
      );
      dados.push({
        label: "Fundo",
        status: rf.status,
        t_nominal_mm: proj.fundo.t_nominal_mm,
        t_min_mm: rf.t_min_aceitavel_mm,
        CR_mm_ano: rf.CR_mm_ano,
        RUL_anos: rf.RUL_anos,
        pontos: pontosDe(hist, proj.fundo.t_medida_mm, proj.dataInspecao),
        anoAtual,
        t_medida_atual: proj.fundo.t_medida_mm,
      });
    }

    // Teto
    if (proj.teto) {
      const rt = avaliarTeto(proj.teto, proj.dataInspecao);
      const hist = proj.teto.historico ?? (
        proj.teto.t_anterior_mm != null && proj.teto.data_anterior
          ? [{ t_mm: proj.teto.t_anterior_mm, data: proj.teto.data_anterior }]
          : []
      );
      dados.push({
        label: "Teto",
        status: rt.status,
        t_nominal_mm: proj.teto.t_nominal_mm,
        t_min_mm: rt.t_min_mm,
        CR_mm_ano: rt.CR_mm_ano,
        RUL_anos: rt.RUL_anos,
        pontos: pontosDe(hist, proj.teto.t_medida_mm, proj.dataInspecao),
        anoAtual,
        t_medida_atual: proj.teto.t_medida_mm,
      });
    }

    return dados;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // Early returns APÓS todos os hooks
  if (estado.status === "carregando") {
    return <div className="space-y-4"><Card><p className="text-sm text-carbono-500">Carregando inspeção…</p></Card></div>;
  }
  if (estado.status === "ausente") {
    return (
      <div className="space-y-4">
        <Card title="Inspeção não encontrada">
          <p className="text-sm text-carbono-600">O projeto não foi encontrado no banco local.</p>
          <div className="mt-4"><Link href="/api653/projetos"><Button>← Voltar às inspeções</Button></Link></div>
        </Card>
      </div>
    );
  }
  if (estado.status === "erro") {
    return <div className="space-y-4"><Card title="Erro ao carregar"><p className="text-sm text-red-700">{estado.mensagem}</p></Card></div>;
  }

  const p = estado.projeto;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/api653/projetos" className="text-xs text-carbono-500 hover:text-carbono-700">
            ← Inspeções
          </Link>
          <h1 className="mt-1 font-title text-2xl font-extrabold tracking-tight">{p.nome}</h1>
          <p className="text-sm text-carbono-500">
            {p.tagTanque && <span className="font-semibold">{p.tagTanque} · </span>}
            D = {p.geometria.D_m.toFixed(2)} m · H = {p.geometria.H_m.toFixed(2)} m ·{" "}
            {p.produto.nome || "produto"} (G = {p.produto.G}) ·{" "}
            Inspecionado em {fmtData(p.dataInspecao)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge cor="verde">{p.cursos.length} {p.cursos.length !== 1 ? "anéis" : "anel"}</Badge>
          <Button variant="secondary" size="sm" onClick={baixarPDF} disabled={gerando}>
            {gerando ? "⏳ Gerando…" : "↓ Baixar memória (PDF)"}
          </Button>
        </div>
      </section>

      {/* Nova campanha */}
      <NovaCampanha p={p} atualizar={atualizar} />

      {/* Parâmetros rápidos */}
      <Card title="Parâmetros de cálculo">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <NumberField label="D (m)" value={p.geometria.D_m} onChange={(v) => atualizar({ geometria: { ...p.geometria, D_m: v } })} min={0.5} step={0.01} />
          <NumberField label="H (m)" value={p.geometria.H_m} onChange={(v) => atualizar({ geometria: { ...p.geometria, H_m: v } })} min={0.5} step={0.1} />
          <NumberField label="H liq (m)" value={p.H_liq_m} onChange={(v) => atualizar({ H_liq_m: v })} min={0.1} step={0.1} hint="Nível de projeto" />
          <NumberField label="G" value={p.produto.G} onChange={(v) => atualizar({ produto: { ...p.produto, G: v } })} min={0.1} step={0.01} />
          <NumberField label="S (MPa)" value={p.material.S_MPa} onChange={(v) => atualizar({ material: { ...p.material, S_MPa: v } })} min={1} step={0.1} />
          <NumberField label="CR global (mm/a)" value={p.CR_global_mm_ano} onChange={(v) => atualizar({ CR_global_mm_ano: v })} min={0} step={0.01} hint="Taxa global assumida" />
        </div>
      </Card>

      {/* Gráfico de espessura ao longo do tempo */}
      {dadosGrafico.length > 0 && (
        <Card title="Gráfico — Evolução da Espessura e Projeção de Vida Útil">
          <p className="mb-4 text-xs text-carbono-500">
            Linha sólida = espessuras medidas nas campanhas históricas. Linha tracejada = projeção de tendência (CR adotada).
            Linha vermelha horizontal = espessura mínima normativa (MAST). Círculo vermelho = ano projetado de falha.
          </p>
          <GraficoEspessura dados={dadosGrafico} />
        </Card>
      )}

      {/* Anéis do costado */}
      <Card title="Costado — Espessuras e Vida Útil por Anel">
        <TabelaAneis p={p} atualizar={atualizar} />
      </Card>

      {/* MAOLL */}
      <Card title="MAOLL — Nível Máximo de Operação Permitido">
        <SecaoMAOLL p={p} />
      </Card>

      {/* Fundo */}
      <Card title="Fundo — Vida Útil">
        <SecaoFundo p={p} atualizar={atualizar} />
      </Card>

      {/* Teto */}
      <Card title="Teto — Vida Útil">
        <SecaoTeto p={p} atualizar={atualizar} />
      </Card>

      {/* Próxima inspeção */}
      <Card title="Próxima Inspeção Recomendada — API 653 §6">
        <SecaoProximaInspecao p={p} />
      </Card>

      {/* Nota técnica */}
      <Card>
        <p className="text-xs text-carbono-400">
          <strong>Nota:</strong> Os cálculos seguem a metodologia API 653. MAST calculado pela fórmula
          1-Foot Method (API 650 §5.6.3). RUL = (t<sub>medida</sub> − t<sub>mín</sub>) / CR. Taxa de
          corrosão por regressão linear quando há 3+ campanhas históricas. Intervalos de inspeção: interno
          ≤ min(RUL/4, 20 anos); externo ≤ min(RUL/2, 10 anos). Esta ferramenta não substitui o julgamento
          do engenheiro inspetor responsável (ART/RRT).
        </p>
      </Card>

      {/* CTA — NTN Engenharia */}
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <h3 className="font-title text-lg font-bold">Precisa de suporte técnico para este tanque?</h3>
            <p className="mt-1 text-sm text-carbono-600">
              A <strong>NTN Engenharia</strong> realiza inspeções, laudos técnicos, reparo e montagem
              de tanques de armazenamento de combustíveis — da inspeção ao start-up. Entre em contato
              e receba uma proposta personalizada.
            </p>
          </div>
          <a
            href={`https://wa.me/5519997514035?text=${encodeURIComponent("Preciso de suporte técnico para inspeção e manutenção de tanque (API 653)")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-5 py-3 font-bold text-white shadow transition hover:bg-[#1ebe5c] whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar com a NTN Engenharia
          </a>
        </div>
      </Card>
    </div>
  );
}
