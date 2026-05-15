"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, TextField } from "@/components/Field";
import { useBaciaProjeto } from "@/lib/useBaciaProjeto";
import { criarTanqueBacia, recalcularVolume } from "@/lib/bacia-projeto";
import {
  verificarBacia,
  dimensionarBacia,
  distMinTanqueMuro,
  distMinEntreATanques,
  ALTURA_MAX_DIQUE_M,
  FREEBOARD_MINIMO_M,
} from "@ntank/calc-core";
import type {
  TanqueBacia,
  ResultadoVerificarBacia,
  ResultadoDimensionarBacia,
} from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// SVG — Layout interativo da bacia
// ---------------------------------------------------------------------------

/** Retorna o layout automático dos tanques em fileiras. */
function calcularPosicoesTanques(
  tanques: TanqueBacia[],
  baciaCoordenadas: { L: number; W: number },
): Array<{ id: string; cx: number; cy: number; r: number }> {
  if (tanques.length === 0) return [];

  const { L, W } = baciaCoordenadas;
  const sorted = [...tanques].sort((a, b) => b.D_m - a.D_m);

  // Disposição em fila única (≤3 tanques) ou dupla
  const emFilaUnica = sorted.length <= 3;
  const cols = emFilaUnica ? sorted.length : Math.ceil(sorted.length / 2);
  const rows = emFilaUnica ? 1 : 2;

  const posicoes: Array<{ id: string; cx: number; cy: number; r: number }> = [];
  const cellW = L / cols;
  const cellH = W / rows;

  sorted.forEach((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    posicoes.push({
      id: t.id,
      cx: cellW * col + cellW / 2,
      cy: cellH * row + cellH / 2,
      r: t.D_m / 2,
    });
  });

  return posicoes;
}

interface BaciaVisualProps {
  tanques: TanqueBacia[];
  /** Dimensões internas da bacia [m] — null se modo dimensionar sem resultado ainda */
  L_m: number;
  W_m: number;
  onAdicionarTanque: () => void;
  onRemoverTanque: (id: string) => void;
}

function BaciaVisual({
  tanques,
  L_m,
  W_m,
  onAdicionarTanque,
  onRemoverTanque,
}: BaciaVisualProps) {
  const PADDING = 2.5; // m de margem no SVG ao redor da bacia

  const viewW = L_m + 2 * PADDING;
  const viewH = W_m + 2 * PADDING + 3; // +3 para botão "+"

  const posicoes = useMemo(
    () => calcularPosicoesTanques(tanques, { L: L_m, W: W_m }),
    [tanques, L_m, W_m],
  );

  // Escala SVG: trabalhar em metros, deixar o viewBox normalizar
  const baciX = PADDING;
  const baciY = PADDING;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="w-full rounded border border-carbono-200 bg-white"
      style={{ maxHeight: 420 }}
      aria-label="Layout da bacia de contenção"
    >
      {/* Definições: padrão de hachurado para o muro */}
      <defs>
        <pattern
          id="hachura"
          patternUnits="userSpaceOnUse"
          width="0.4"
          height="0.4"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="0.4" stroke="#94a3b8" strokeWidth="0.08" />
        </pattern>
      </defs>

      {/* Muro da bacia — borda hachurada */}
      <rect
        x={baciX - 0.3}
        y={baciY - 0.3}
        width={L_m + 0.6}
        height={W_m + 0.6}
        fill="url(#hachura)"
        stroke="#475569"
        strokeWidth="0.12"
        rx="0.15"
      />
      {/* Interior da bacia — fundo claro */}
      <rect
        x={baciX}
        y={baciY}
        width={L_m}
        height={W_m}
        fill="#f0fdf4"
        stroke="none"
      />

      {/* Dimensões da bacia */}
      {/* Comprimento (horizontal, topo) */}
      <g stroke="#64748b" strokeWidth="0.06" fill="#64748b">
        <line
          x1={baciX}
          y1={baciY - 0.7}
          x2={baciX + L_m}
          y2={baciY - 0.7}
          markerStart="url(#arrow)"
          markerEnd="url(#arrow)"
        />
        <text
          x={baciX + L_m / 2}
          y={baciY - 0.85}
          fontSize="0.4"
          textAnchor="middle"
          fontFamily="monospace"
          fill="#334155"
        >
          {L_m.toFixed(1)} m
        </text>
      </g>
      {/* Largura (vertical, lado esquerdo) */}
      <g stroke="#64748b" strokeWidth="0.06" fill="#64748b">
        <line
          x1={baciX - 0.7}
          y1={baciY}
          x2={baciX - 0.7}
          y2={baciY + W_m}
        />
        <text
          x={baciX - 1.1}
          y={baciY + W_m / 2}
          fontSize="0.4"
          textAnchor="middle"
          fontFamily="monospace"
          fill="#334155"
          transform={`rotate(-90, ${baciX - 1.1}, ${baciY + W_m / 2})`}
        >
          {W_m.toFixed(1)} m
        </text>
      </g>

      {/* Tanques */}
      {posicoes.map((pos) => {
        const tanque = tanques.find((t) => t.id === pos.id);
        if (!tanque) return null;

        const svgCx = baciX + pos.cx;
        const svgCy = baciY + pos.cy;
        const svgR = pos.r;

        // Verificar distância mínima ao muro
        const dMinMuro = distMinTanqueMuro(tanque.D_m);
        const dAtualMuro = Math.min(
          pos.cx,
          L_m - pos.cx,
          pos.cy,
          W_m - pos.cy,
        ) - svgR;
        const muroOk = dAtualMuro >= dMinMuro - 0.01;

        return (
          <g key={pos.id}>
            {/* Círculo do tanque */}
            <circle
              cx={svgCx}
              cy={svgCy}
              r={svgR}
              fill={muroOk ? "#dcfce7" : "#fee2e2"}
              stroke={muroOk ? "#16a34a" : "#dc2626"}
              strokeWidth="0.08"
            />
            {/* TAG do tanque */}
            <text
              x={svgCx}
              y={svgCy}
              fontSize={Math.max(0.3, Math.min(0.5, svgR * 0.5))}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="monospace"
              fontWeight="bold"
              fill="#1e293b"
            >
              {tanque.tag}
            </text>
            {/* Diâmetro */}
            <text
              x={svgCx}
              y={svgCy + svgR * 0.45}
              fontSize={Math.max(0.22, Math.min(0.35, svgR * 0.35))}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="monospace"
              fill="#475569"
            >
              D={tanque.D_m.toFixed(1)}m
            </text>
            {/* Botão remover */}
            <g
              onClick={() => onRemoverTanque(pos.id)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={svgCx + svgR * 0.72}
                cy={svgCy - svgR * 0.72}
                r={0.25}
                fill="#ef4444"
                stroke="white"
                strokeWidth="0.05"
              />
              <text
                x={svgCx + svgR * 0.72}
                y={svgCy - svgR * 0.72}
                fontSize="0.3"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontWeight="bold"
              >
                ×
              </text>
            </g>
          </g>
        );
      })}

      {/* Linha de distância mínima tanque→muro (primeiro tanque) */}
      {posicoes[0] && tanques[0] && (() => {
        const pos = posicoes[0];
        const t = tanques.find((x) => x.id === pos.id) ?? tanques[0];
        const dMin = distMinTanqueMuro(t.D_m);
        const svgCx = baciX + pos.cx;
        const svgCy = baciY + pos.cy;
        const svgR = pos.r;
        return (
          <g stroke="#f59e0b" strokeWidth="0.05" strokeDasharray="0.2 0.1" fill="#f59e0b">
            <line x1={svgCx - svgR} y1={svgCy} x2={baciX} y2={svgCy} />
            <text
              x={(svgCx - svgR + baciX) / 2}
              y={svgCy - 0.15}
              fontSize="0.28"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {dMin.toFixed(2)}m
            </text>
          </g>
        );
      })()}

      {/* Botão "Adicionar tanque" */}
      <g
        onClick={onAdicionarTanque}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={baciX + L_m + PADDING * 0.5}
          cy={baciY + W_m / 2}
          r={0.6}
          fill="#ADD91C"
          stroke="white"
          strokeWidth="0.08"
        />
        <text
          x={baciX + L_m + PADDING * 0.5}
          y={baciY + W_m / 2}
          fontSize="0.7"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1a1a1a"
          fontWeight="bold"
        >
          +
        </text>
      </g>

      {/* Legenda */}
      <g>
        <circle cx={baciX + 0.3} cy={baciY + W_m + 0.5} r={0.15} fill="#dcfce7" stroke="#16a34a" strokeWidth="0.05" />
        <text x={baciX + 0.55} y={baciY + W_m + 0.5} fontSize="0.28" dominantBaseline="middle" fill="#475569" fontFamily="monospace">Distâncias OK</text>
        <circle cx={baciX + 2.5} cy={baciY + W_m + 0.5} r={0.15} fill="#fee2e2" stroke="#dc2626" strokeWidth="0.05" />
        <text x={baciX + 2.75} y={baciY + W_m + 0.5} fontSize="0.28" dominantBaseline="middle" fill="#475569" fontFamily="monospace">Distância insuficiente</text>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Modal de adição de tanque
// ---------------------------------------------------------------------------

interface ModalTanqueProps {
  onConfirmar: (t: TanqueBacia) => void;
  onCancelar: () => void;
  totalTanques: number;
}

function ModalAdicionarTanque({ onConfirmar, onCancelar, totalTanques }: ModalTanqueProps) {
  const [tag, setTag] = useState(`TQ-${String(totalTanques + 1).padStart(2, "0")}`);
  const [D, setD] = useState(10);
  const [H, setH] = useState(10);

  const volume = (Math.PI / 4) * D * D * H;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
        <h3 className="font-title text-xl font-bold">Adicionar tanque</h3>
        <div className="grid gap-4">
          <TextField label="TAG" value={tag} onChange={setTag} placeholder="Ex.: TQ-01" />
          <NumberField
            label="Diâmetro externo"
            unit="m"
            value={D}
            onChange={(v) => setD(v ?? 10)}
            min={0.1}
            step={0.1}
          />
          <NumberField
            label="Altura operacional"
            unit="m"
            value={H}
            onChange={(v) => setH(v ?? 10)}
            min={0.1}
            step={0.1}
          />
          <p className="text-sm text-carbono-600">
            Volume: <strong>{volume.toFixed(1)} m³</strong>{" "}
            <span className="text-xs text-carbono-400">(π/4 × D² × H)</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onConfirmar(criarTanqueBacia({ tag, D_m: D, H_m: H, volume_m3: volume }))}>
            Adicionar
          </Button>
          <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers de UI
// ---------------------------------------------------------------------------

function fmt2(n: number): string {
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  return n.toFixed(1);
}

function BadgeStatus({ aprovado, alturaExcede }: { aprovado: boolean; alturaExcede: boolean }) {
  if (alturaExcede) return <Badge cor="vermelho">Muro excede 3,0 m</Badge>;
  if (!aprovado) return <Badge cor="vermelho">Insuficiente</Badge>;
  return <Badge cor="verde">Adequada</Badge>;
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function BaciaCalculadoraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { estado, atualizar } = useBaciaProjeto(id);
  const [modalAberto, setModalAberto] = useState(false);

  const resultado = useMemo(() => {
    if (estado.status !== "ok") return null;
    const p = estado.projeto;

    if (p.modo === "verificar" && p.baciaDims) {
      return {
        tipo: "verificar" as const,
        data: verificarBacia({
          tanques: p.tanques,
          comprimento_m: p.baciaDims.comprimento_m,
          largura_m: p.baciaDims.largura_m,
          alturaTotal_m: p.baciaDims.alturaTotal_m,
          freeboard_m: p.freeboard_m,
        }),
      };
    } else {
      return {
        tipo: "dimensionar" as const,
        data: dimensionarBacia({
          tanques: p.tanques,
          alturaMaxMuro_m: p.alturaMaxMuro_m,
          freeboard_m: p.freeboard_m,
          relacaoLC: p.relacaoLC,
        }),
      };
    }
  }, [estado]);

  if (estado.status === "carregando") {
    return <p className="text-sm text-carbono-500">Carregando projeto…</p>;
  }
  if (estado.status === "ausente") {
    return (
      <Card>
        <p className="text-sm text-carbono-600">Projeto não encontrado.</p>
        <Link href="/bacia/projetos">
          <Button className="mt-3" size="sm">← Voltar</Button>
        </Link>
      </Card>
    );
  }
  if (estado.status === "erro") {
    return (
      <Card>
        <p className="text-sm text-red-700">{estado.mensagem}</p>
      </Card>
    );
  }

  const { projeto } = estado;

  // Dimensões SVG: usar resultado do dimensionamento ou bacia existente
  const svgL =
    projeto.modo === "verificar" && projeto.baciaDims
      ? projeto.baciaDims.comprimento_m
      : resultado?.tipo === "dimensionar"
        ? (resultado.data as ResultadoDimensionarBacia).comprimentoSugerido_m || 20
        : 20;
  const svgW =
    projeto.modo === "verificar" && projeto.baciaDims
      ? projeto.baciaDims.largura_m
      : resultado?.tipo === "dimensionar"
        ? (resultado.data as ResultadoDimensionarBacia).larguraSugerida_m || 15
        : 15;

  const aprovado =
    resultado?.tipo === "verificar"
      ? (resultado.data as ResultadoVerificarBacia).aprovado
      : !(resultado?.data as ResultadoDimensionarBacia | null)?.alturaExcedeLimite;

  const alturaExcede =
    resultado?.tipo === "verificar"
      ? (resultado.data as ResultadoVerificarBacia).alturaExcedeMuro
      : (resultado?.data as ResultadoDimensionarBacia | null)?.alturaExcedeLimite ?? false;

  function adicionarTanque(t: TanqueBacia) {
    atualizar((p) => ({ ...p, tanques: [...p.tanques, t] }));
    setModalAberto(false);
  }

  function removerTanque(id: string) {
    atualizar((p) => ({ ...p, tanques: p.tanques.filter((t) => t.id !== id) }));
  }

  function atualizarTanque(id: string, campo: Partial<TanqueBacia>) {
    atualizar((p) => ({
      ...p,
      tanques: p.tanques.map((t) => {
        if (t.id !== id) return t;
        const atualizado = { ...t, ...campo };
        // Recalcular volume automaticamente
        if ("D_m" in campo || "H_m" in campo) {
          atualizado.volume_m3 = recalcularVolume(atualizado);
        }
        return atualizado;
      }),
    }));
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bacia/projetos" className="text-xs text-carbono-500 hover:text-carbono-700">
            ← Bacias de Contenção
          </Link>
          <h1 className="mt-1 font-title text-2xl font-extrabold tracking-tight">
            {projeto.nome}
          </h1>
          <p className="text-xs text-carbono-500">
            {projeto.cliente && <>{projeto.cliente} · </>}
            {projeto.local && <>{projeto.local} · </>}
            NBR 17505-2 §5.9.2
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {resultado && (
            <BadgeStatus aprovado={aprovado} alturaExcede={alturaExcede} />
          )}
        </div>
      </section>

      {/* Seção A — Tanques */}
      <Card title="Tanques na bacia">
        {projeto.tanques.length === 0 ? (
          <p className="text-sm text-carbono-500 mb-3">
            Nenhum tanque adicionado. Clique em "+ Adicionar tanque" para começar.
          </p>
        ) : (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-carbono-200 text-carbono-500 text-xs uppercase tracking-wider">
                  <th className="py-2 pr-3 text-left font-medium">TAG</th>
                  <th className="py-2 pr-3 text-right font-medium">D (m)</th>
                  <th className="py-2 pr-3 text-right font-medium">H (m)</th>
                  <th className="py-2 pr-3 text-right font-medium">Volume (m³)</th>
                  <th className="py-2 pr-3 text-right font-medium">d min → muro</th>
                  <th className="py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {projeto.tanques.map((t) => (
                  <tr key={t.id} className="border-b border-carbono-100 hover:bg-creme/50">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={t.tag}
                        onChange={(e) => atualizarTanque(t.id, { tag: e.target.value })}
                        className="w-20 rounded border border-carbono-200 bg-white px-2 py-1 text-sm font-mono outline-none focus:border-verde"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={t.D_m}
                        step={0.1}
                        min={0.1}
                        onChange={(e) =>
                          atualizarTanque(t.id, { D_m: parseFloat(e.target.value) || t.D_m })
                        }
                        className="w-20 rounded border border-carbono-200 bg-white px-2 py-1 text-sm font-mono text-right outline-none focus:border-verde"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={t.H_m}
                        step={0.1}
                        min={0.1}
                        onChange={(e) =>
                          atualizarTanque(t.id, { H_m: parseFloat(e.target.value) || t.H_m })
                        }
                        className="w-20 rounded border border-carbono-200 bg-white px-2 py-1 text-sm font-mono text-right outline-none focus:border-verde"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-semibold">
                      {t.volume_m3.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-carbono-600">
                      {distMinTanqueMuro(t.D_m).toFixed(2)} m
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => removerTanque(t.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {projeto.tanques.length > 0 && (
                <tfoot>
                  <tr className="border-t border-carbono-300 text-carbono-700 font-semibold">
                    <td className="py-2 pr-3 text-xs uppercase tracking-wider">
                      {projeto.tanques.length} tanque{projeto.tanques.length !== 1 ? "s" : ""}
                    </td>
                    <td colSpan={2} />
                    <td className="py-2 pr-3 text-right font-mono">
                      {projeto.tanques.reduce((s, t) => s + t.volume_m3, 0).toFixed(1)} m³
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <Button size="sm" variant="secondary" onClick={() => setModalAberto(true)}>
          + Adicionar tanque
        </Button>
      </Card>

      {/* Seção B — Configuração da bacia */}
      <Card title="Configuração da bacia">
        {/* Toggle modo */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => atualizar({ modo: "dimensionar" })}
            className={`flex-1 rounded-lg border-2 py-2 px-3 text-sm font-semibold transition ${
              projeto.modo === "dimensionar"
                ? "border-verde bg-verde/10 text-carbono"
                : "border-carbono-200 text-carbono-500 hover:border-carbono-400"
            }`}
          >
            🏗️ Dimensionar nova bacia
          </button>
          <button
            onClick={() => atualizar({ modo: "verificar" })}
            className={`flex-1 rounded-lg border-2 py-2 px-3 text-sm font-semibold transition ${
              projeto.modo === "verificar"
                ? "border-verde bg-verde/10 text-carbono"
                : "border-carbono-200 text-carbono-500 hover:border-carbono-400"
            }`}
          >
            ✅ Verificar bacia existente
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Parâmetros comuns */}
          <NumberField
            label="Freeboard (sobrealtura)"
            unit="m"
            value={projeto.freeboard_m}
            onChange={(v) => atualizar({ freeboard_m: Math.max(v ?? FREEBOARD_MINIMO_M, FREEBOARD_MINIMO_M) })}
            min={FREEBOARD_MINIMO_M}
            step={0.05}
            hint={`Mín. ${FREEBOARD_MINIMO_M} m — NBR 17505-2 §5.9.2.2.1`}
            norma="§5.9.2.2.1"
          />
          <NumberField
            label="Altura máxima do muro"
            unit="m"
            value={projeto.alturaMaxMuro_m}
            onChange={(v) => atualizar({ alturaMaxMuro_m: Math.min(v ?? ALTURA_MAX_DIQUE_M, ALTURA_MAX_DIQUE_M) })}
            min={0.3}
            max={ALTURA_MAX_DIQUE_M}
            step={0.1}
            hint={`Máx. ${ALTURA_MAX_DIQUE_M.toFixed(1)} m — NBR 17505-2 §5.9.2.2`}
            norma="§5.9.2.2"
          />

          {projeto.modo === "dimensionar" && (
            <NumberField
              label="Relação L/W desejada"
              value={projeto.relacaoLC}
              onChange={(v) => atualizar({ relacaoLC: v ?? 1.5 })}
              min={1.0}
              max={5.0}
              step={0.1}
              hint="Ex.: 1,5 → bacia mais longa que larga"
            />
          )}

          {/* Campos da bacia existente */}
          {projeto.modo === "verificar" && (
            <>
              <NumberField
                label="Comprimento interno (L)"
                unit="m"
                value={projeto.baciaDims?.comprimento_m ?? 0}
                onChange={(v) =>
                  atualizar((p) => ({
                    ...p,
                    baciaDims: { ...(p.baciaDims ?? { comprimento_m: 0, largura_m: 0, alturaTotal_m: 2.0 }), comprimento_m: v ?? 0 },
                  }))
                }
                min={1}
                step={0.1}
              />
              <NumberField
                label="Largura interna (W)"
                unit="m"
                value={projeto.baciaDims?.largura_m ?? 0}
                onChange={(v) =>
                  atualizar((p) => ({
                    ...p,
                    baciaDims: { ...(p.baciaDims ?? { comprimento_m: 0, largura_m: 0, alturaTotal_m: 2.0 }), largura_m: v ?? 0 },
                  }))
                }
                min={1}
                step={0.1}
              />
              <NumberField
                label="Altura total do muro"
                unit="m"
                value={projeto.baciaDims?.alturaTotal_m ?? 2.0}
                onChange={(v) =>
                  atualizar((p) => ({
                    ...p,
                    baciaDims: { ...(p.baciaDims ?? { comprimento_m: 0, largura_m: 0, alturaTotal_m: 2.0 }), alturaTotal_m: Math.min(v ?? 2.0, ALTURA_MAX_DIQUE_M) },
                  }))
                }
                min={0.3}
                max={ALTURA_MAX_DIQUE_M}
                step={0.1}
                hint={`Medida internamente. Máx. ${ALTURA_MAX_DIQUE_M.toFixed(1)} m`}
                norma="§5.9.2.2"
              />
            </>
          )}
        </div>
      </Card>

      {/* Seção C — Resultados */}
      {resultado && (
        <>
          {/* Alertas */}
          {resultado.data.alertas.length > 0 && (
            <div className="space-y-2">
              {resultado.data.alertas.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-md px-4 py-3 text-sm ${
                    a.nivel === "CRITICO"
                      ? "bg-red-50 border border-red-200 text-red-900"
                      : a.nivel === "ALERTA"
                        ? "bg-amber-50 border border-amber-200 text-amber-900"
                        : "bg-blue-50 border border-blue-200 text-blue-900"
                  }`}
                >
                  <span className="font-bold">[{a.code}]</span> {a.mensagem}
                </div>
              ))}
            </div>
          )}

          {/* Card resumo de volumes */}
          <Card title="Resumo — Volume de contenção">
            {resultado.tipo === "verificar" ? (() => {
              const d = resultado.data as ResultadoVerificarBacia;
              const util = d.utilizacao_pct;
              const barraW = Math.min(util, 100);
              const barraColor = d.aprovado ? "#ADD91C" : "#ef4444";
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Volume requerido</p>
                      <p className="font-mono text-lg font-bold">{fmtVol(d.volumeRequerido_m3)} m³</p>
                      <p className="text-xs text-carbono-400">Maior tanque cheio (§5.9.2.2.1)</p>
                    </div>
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Volume disponível</p>
                      <p className="font-mono text-lg font-bold">{fmtVol(d.volumeDisponivel_m3)} m³</p>
                      <p className="text-xs text-carbono-400">(L×W − ΣA_bases) × h_efetiva</p>
                    </div>
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Altura efetiva</p>
                      <p className="font-mono text-lg font-bold">{fmt2(d.alturaEfetiva_m)} m</p>
                      <p className="text-xs text-carbono-400">h_total − freeboard</p>
                    </div>
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Utilização</p>
                      <p className="font-mono text-lg font-bold">{util.toFixed(1)} %</p>
                      <div className="mt-1 h-2 w-full rounded bg-carbono-100 overflow-hidden">
                        <div
                          className="h-2 rounded transition-all"
                          style={{ width: `${barraW}%`, backgroundColor: barraColor }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BadgeStatus aprovado={d.aprovado} alturaExcede={d.alturaExcedeMuro} />
                    {d.aprovado && !d.alturaExcedeMuro && (
                      <p className="text-sm text-green-800">
                        Bacia atende ao volume requerido. Capacidade líquida disponível suficiente.
                      </p>
                    )}
                    {!d.aprovado && (
                      <p className="text-sm text-red-800">
                        Déficit: {fmtVol(d.volumeRequerido_m3 - d.volumeDisponivel_m3)} m³.
                        Ampliar a bacia ou reduzir o volume dos tanques.
                      </p>
                    )}
                  </div>
                  {/* Memória de cálculo */}
                  <details className="rounded border border-carbono-200 bg-creme p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-carbono-700">
                      Memória de cálculo
                    </summary>
                    <div className="mt-3 space-y-1 font-mono text-carbono-700">
                      <p>V_req = volume do maior tanque vertical = {fmtVol(d.volumeRequerido_m3)} m³</p>
                      <p>ΣA_bases = {fmt2(d.areaBasesTanques_m2)} m²  (π/4 × D² para cada tanque)</p>
                      <p>h_efetiva = {fmt2(d.alturaEfetiva_m)} m  (h_total − freeboard = {fmt2(d.alturaEfetiva_m + d.freeboard_m)} − {fmt2(d.freeboard_m)})</p>
                      <p>V_disp = (L×W − ΣA_bases) × h_efetiva</p>
                      <p>       = ({projeto.baciaDims?.comprimento_m.toFixed(1)} × {projeto.baciaDims?.largura_m.toFixed(1)} − {fmt2(d.areaBasesTanques_m2)}) × {fmt2(d.alturaEfetiva_m)}</p>
                      <p>       = {fmtVol(d.volumeDisponivel_m3)} m³</p>
                      <p>Referência: NBR 17505-2:2024 §5.9.2.2.1</p>
                    </div>
                  </details>
                </div>
              );
            })() : (() => {
              const d = resultado.data as ResultadoDimensionarBacia;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Volume requerido</p>
                      <p className="font-mono text-lg font-bold">{fmtVol(d.volumeRequerido_m3)} m³</p>
                      <p className="text-xs text-carbono-400">Maior tanque cheio (§5.9.2.2.1)</p>
                    </div>
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Dimensões sugeridas</p>
                      <p className="font-mono text-lg font-bold">{d.comprimentoSugerido_m.toFixed(1)} × {d.larguraSugerida_m.toFixed(1)} m</p>
                      <p className="text-xs text-carbono-400">Comprimento × Largura</p>
                    </div>
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Altura da parede</p>
                      <p className={`font-mono text-lg font-bold ${d.alturaExcedeLimite ? "text-red-700" : ""}`}>
                        {fmt2(d.alturaParede_m)} m
                      </p>
                      <p className="text-xs text-carbono-400">h_calculada + {fmt2(d.freeboard_m)} m freeboard</p>
                    </div>
                    <div>
                      <p className="text-carbono-500 text-xs uppercase tracking-wider">Área líquida mín.</p>
                      <p className="font-mono text-lg font-bold">{fmt2(d.areaLiquidaMinima_m2)} m²</p>
                      <p className="text-xs text-carbono-400">V_req / h_efetiva</p>
                    </div>
                  </div>
                  {d.alturaExcedeLimite && (
                    <div className="rounded bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
                      A altura calculada ({fmt2(d.alturaParede_m)} m) excede o limite de {ALTURA_MAX_DIQUE_M.toFixed(1)} m.
                      Aumente a relação L/W ou amplie a área disponível.
                    </div>
                  )}
                  {/* Memória de cálculo */}
                  <details className="rounded border border-carbono-200 bg-creme p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-carbono-700">
                      Memória de cálculo
                    </summary>
                    <div className="mt-3 space-y-1 font-mono text-carbono-700">
                      <p>V_req = volume do maior tanque vertical = {fmtVol(d.volumeRequerido_m3)} m³</p>
                      <p>h_max_muro = {fmt2(projeto.alturaMaxMuro_m)} m  (limite: {ALTURA_MAX_DIQUE_M.toFixed(1)} m)</p>
                      <p>h_efetiva = h_max − freeboard = {fmt2(d.alturaEfetiva_m)} m</p>
                      <p>A_liq_min = V_req / h_efetiva = {fmtVol(d.volumeRequerido_m3)} / {fmt2(d.alturaEfetiva_m)} = {fmt2(d.areaLiquidaMinima_m2)} m²</p>
                      <p>A_total = A_liq_min + ΣA_bases + bordas = {fmt2(d.areaTotalSugerida_m2)} m²</p>
                      <p>L = {d.comprimentoSugerido_m.toFixed(1)} m   W = {d.larguraSugerida_m.toFixed(1)} m  (relação L/W = {projeto.relacaoLC.toFixed(1)})</p>
                      <p>h_parede = h_efetiva + freeboard = {fmt2(d.alturaEfetiva_m)} + {fmt2(d.freeboard_m)} = {fmt2(d.alturaParede_m)} m</p>
                      <p>Referência: NBR 17505-2:2024 §5.9.2.2.1</p>
                    </div>
                  </details>
                </div>
              );
            })()}
          </Card>

          {/* Card distanciamentos */}
          {resultado.data.distanciamentos.length > 0 && (
            <Card title="Distanciamentos mínimos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-carbono-200 text-carbono-500 text-xs uppercase tracking-wider">
                      <th className="py-2 pr-4 text-left font-medium">Par</th>
                      <th className="py-2 pr-4 text-left font-medium">Fórmula</th>
                      <th className="py-2 text-right font-medium">Distância mínima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.data.distanciamentos.map((d, i) => (
                      <tr key={i} className="border-b border-carbono-100 hover:bg-creme/50">
                        <td className="py-2 pr-4 font-mono font-semibold">
                          {d.tagA} → {d.tagB}
                        </td>
                        <td className="py-2 pr-4 text-carbono-600 text-xs">{d.formula}</td>
                        <td className="py-2 text-right font-mono font-bold">
                          {d.distanciaMinima_m.toFixed(2)} m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-carbono-400">
                Referência: {resultado.data.distanciamentos[0]?.referenciaNormativa}
              </p>
            </Card>
          )}

          {/* Card layout SVG */}
          <Card title="Layout da bacia">
            <p className="text-xs text-carbono-500 mb-3">
              {resultado.tipo === "dimensionar"
                ? "Disposição automática dos tanques na bacia dimensionada."
                : "Disposição proporcional dos tanques na bacia existente."}
              {" "}Clique em{" "}
              <strong className="text-verde">+</strong> para adicionar tanques ou em{" "}
              <strong>×</strong> para remover.
            </p>
            <BaciaVisual
              tanques={projeto.tanques}
              L_m={Math.max(svgL, 5)}
              W_m={Math.max(svgW, 5)}
              onAdicionarTanque={() => setModalAberto(true)}
              onRemoverTanque={removerTanque}
            />
          </Card>
        </>
      )}

      {/* Observações */}
      <Card title="Observações">
        <textarea
          value={projeto.observacoes ?? ""}
          onChange={(e) => atualizar({ observacoes: e.target.value })}
          placeholder="Observações técnicas, notas de campo, pendências…"
          rows={3}
          className="w-full rounded border border-carbono-200 bg-white px-3 py-2 text-sm outline-none focus:border-verde resize-y"
        />
      </Card>

      {/* Modal de adicionar tanque */}
      {modalAberto && (
        <ModalAdicionarTanque
          totalTanques={projeto.tanques.length}
          onConfirmar={adicionarTanque}
          onCancelar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
