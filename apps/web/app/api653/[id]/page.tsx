"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  avaliarCostado,
  calcularMAOLL,
  avaliarFundo,
  calcularProximaInspecao,
  T_MIN_FUNDO_MM,
  T_MIN_ANELAR_MM,
  type CursoMedido,
  type FundoMedido,
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

function semaforoStatus(
  status: string | boolean | null,
): Semaforo {
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
// Sub-componente: tabela de cursos com edição inline
// ---------------------------------------------------------------------------

function TabelaCursos({
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

  function setCurso(idx: number, campo: keyof CursoMedido, valor: number | null) {
    const novos = p.cursos.map((c, i) =>
      i === idx ? { ...c, [campo]: valor } : c,
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
              <span className="text-carbono-500">Curso crítico: </span>
              <span className="font-bold tabular">#{resultado.cursoCritico.numero}</span>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-carbono-200 text-left text-xs text-carbono-500 uppercase">
              <th className="pb-2 pr-3 font-semibold">Curso</th>
              <th className="pb-2 pr-3 font-semibold">Altura (m)</th>
              <th className="pb-2 pr-3 font-semibold">t nom. (mm)</th>
              <th className="pb-2 pr-3 font-semibold">t med. (mm)</th>
              <th className="pb-2 pr-3 font-semibold">t ant. (mm)</th>
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
                <tr key={c.numero} className="border-b border-carbono-100">
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
                      onChange={(e) => setCurso(idx, "altura_m", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.t_nominal_mm}
                      min={0}
                      step={0.1}
                      onChange={(e) => setCurso(idx, "t_nominal_mm", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.t_medida_mm}
                      min={0}
                      step={0.1}
                      onChange={(e) => setCurso(idx, "t_medida_mm", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.t_anterior_mm ?? ""}
                      min={0}
                      step={0.1}
                      placeholder="—"
                      onChange={(e) =>
                        setCurso(idx, "t_anterior_mm", e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-20 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-3 tabular text-carbono-600">
                    {r ? fmtMm(r.t_min_mm) : "—"}
                  </td>
                  <td className="py-2 pr-3 tabular text-carbono-600">
                    {r ? (r.CR_mm_ano > 0 ? r.CR_mm_ano.toFixed(3) : "0") : "—"}
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

      {/* Alertas do costado */}
      {resultado && resultado.alertas.length > 0 && (
        <div className="space-y-1">
          {resultado.alertas.map((a, i) => (
            <div
              key={i}
              className={`rounded-md border px-3 py-2 text-xs ${
                a.nivel === "CRITICO"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : a.nivel === "ALERTA"
                  ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
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
// Sub-componente: MAOLL
// ---------------------------------------------------------------------------

function SecaoMAOLL({ p }: { p: ProjetoAPI653 }) {
  const resultado = useMemo(
    () =>
      p.cursos.length > 0
        ? calcularMAOLL(
            p.geometria.D_m,
            p.H_liq_m,
            p.produto.G,
            p.material.S_MPa,
            p.material.E,
            p.cursos,
          )
        : null,
    [p],
  );

  if (!resultado) {
    return (
      <p className="text-sm text-carbono-500">Insira os cursos para calcular o MAOLL.</p>
    );
  }

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
          <p className="text-xl font-bold tabular">
            {resultado.pct_volume_disponivel.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">Re-rating</p>
          <p className={`text-xl font-bold ${resultado.reratingNecessario ? "text-yellow-700" : "text-green-700"}`}>
            {resultado.reratingNecessario ? "Necessário" : "Não necessário"}
          </p>
        </div>
      </div>
      {resultado.alertas.map((a, i) => (
        <div
          key={i}
          className={`rounded-md border px-3 py-2 text-xs ${
            a.nivel === "CRITICO"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          <span className="font-bold">[{a.code}] </span>
          {a.mensagem}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: Fundo
// ---------------------------------------------------------------------------

function SecaoFundo({
  p,
  atualizar,
}: {
  p: ProjetoAPI653;
  atualizar: (upd: Partial<ProjetoAPI653>) => void;
}) {
  const fundo = p.fundo;
  const resultado = useMemo(
    () => (fundo ? avaliarFundo(fundo, p.dataInspecao) : null),
    [fundo, p.dataInspecao],
  );

  function setFundoCampo(campo: keyof FundoMedido, valor: number | null) {
    atualizar({
      fundo: fundo
        ? { ...fundo, [campo]: valor }
        : {
            t_nominal_mm: 0,
            t_medida_mm: 0,
            t_anelar_mm: undefined,
            largura_anelar_mm: undefined,
            t_anterior_mm: undefined,
            data_anterior: undefined,
            CR_assumida_mm_ano: p.CR_global_mm_ano,
            [campo]: valor,
          },
    });
  }

  function inicializarFundo() {
    atualizar({
      fundo: {
        t_nominal_mm: 6,
        t_medida_mm: 0,
        CR_assumida_mm_ano: p.CR_global_mm_ano,
      },
    });
  }

  if (!fundo) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-carbono-500">
          Dados do fundo não inseridos. Ative para calcular a vida útil do fundo.
        </p>
        <Button variant="secondary" size="sm" onClick={inicializarFundo}>
          + Adicionar dados do fundo
        </Button>
      </div>
    );
  }

  const semaforo = resultado ? semaforoStatus(resultado.status) : "amarelo";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberField
          label="t nominal (mm)"
          value={fundo.t_nominal_mm}
          onChange={(v) => setFundoCampo("t_nominal_mm", v)}
          min={0} step={0.1}
        />
        <NumberField
          label="t medida (mm)"
          value={fundo.t_medida_mm}
          onChange={(v) => setFundoCampo("t_medida_mm", v)}
          min={0} step={0.1}
        />
        <NumberField
          label="t anelar (mm) — opcional"
          value={fundo.t_anelar_mm ?? ""}
          onChange={(v) => setFundoCampo("t_anelar_mm", v || null)}
          min={0} step={0.1}
        />
        <NumberField
          label="CR assumida (mm/ano)"
          value={fundo.CR_assumida_mm_ano ?? p.CR_global_mm_ano}
          onChange={(v) => setFundoCampo("CR_assumida_mm_ano", v)}
          min={0} step={0.01}
        />
      </div>

      {resultado && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-md bg-creme p-4">
          <div>
            <p className="text-xs text-carbono-500">t mín. API 653</p>
            <p className="font-bold tabular">{T_MIN_FUNDO_MM} mm</p>
          </div>
          <div>
            <p className="text-xs text-carbono-500">CR adotada</p>
            <p className="font-bold tabular">{resultado.CR_mm_ano.toFixed(3)} mm/ano</p>
          </div>
          <div>
            <p className="text-xs text-carbono-500">RUL fundo</p>
            <p className="font-bold tabular">{fmtAnos(resultado.RUL_anos)}</p>
          </div>
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

      {resultado && resultado.alertas.length > 0 && (
        <div className="space-y-1">
          {resultado.alertas.map((a, i) => (
            <div
              key={i}
              className={`rounded-md border px-3 py-2 text-xs ${
                a.nivel === "CRITICO"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : a.nivel === "ALERTA"
                  ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
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
// Sub-componente: Próxima Inspeção
// ---------------------------------------------------------------------------

function SecaoProximaInspecao({ p }: { p: ProjetoAPI653 }) {
  const RUL_costado = useMemo(() => {
    if (p.cursos.length === 0) return null;
    const r = avaliarCostado({
      D_m: p.geometria.D_m,
      H_m: p.geometria.H_m,
      H_liq_m: p.H_liq_m,
      G: p.produto.G,
      S_MPa: p.material.S_MPa,
      E: p.material.E,
      cursos: p.cursos,
      CR_assumida_mm_ano: p.CR_global_mm_ano,
      dataInspecao: p.dataInspecao,
    });
    return r.RUL_costado_anos;
  }, [p]);

  const RUL_fundo = useMemo(() => {
    if (!p.fundo) return null;
    const r = avaliarFundo(p.fundo, p.dataInspecao);
    return r.RUL_anos;
  }, [p]);

  const resultado = useMemo(
    () => calcularProximaInspecao(p.dataInspecao, RUL_costado, RUL_fundo),
    [p.dataInspecao, RUL_costado, RUL_fundo],
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
          <p className="text-xs text-carbono-400">
            em {fmtAnos(resultado.intervaloInterno_anos)} — (RUL/4, máx 20 anos)
          </p>
        </div>
        <div>
          <p className="text-xs text-carbono-500">Próxima inspeção EXTERNA</p>
          <p className="font-bold tabular text-lg">{fmtData(resultado.dataProximaExterna)}</p>
          <p className="text-xs text-carbono-400">
            em {fmtAnos(resultado.intervaloExterno_anos)} — (RUL/2, máx 10 anos)
          </p>
        </div>
      </div>

      {resultado.alertas.map((a, i) => (
        <div
          key={i}
          className={`rounded-md border px-3 py-2 text-xs ${
            a.nivel === "CRITICO"
              ? "border-red-200 bg-red-50 text-red-800"
              : a.nivel === "ALERTA"
              ? "border-yellow-200 bg-yellow-50 text-yellow-800"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          <span className="font-bold">[{a.code}] </span>
          {a.mensagem}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function InspecaoAPI653Page({ params }: PageProps) {
  const { id } = use(params);
  const { estado, atualizar } = useApi653Projeto(id);

  if (estado.status === "carregando") {
    return (
      <div className="space-y-4">
        <Card><p className="text-sm text-carbono-500">Carregando inspeção…</p></Card>
      </div>
    );
  }

  if (estado.status === "ausente") {
    return (
      <div className="space-y-4">
        <Card title="Inspeção não encontrada">
          <p className="text-sm text-carbono-600">O projeto não foi encontrado no banco local.</p>
          <div className="mt-4">
            <Link href="/api653/projetos">
              <Button>← Voltar às inspeções</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (estado.status === "erro") {
    return (
      <div className="space-y-4">
        <Card title="Erro ao carregar">
          <p className="text-sm text-red-700">{estado.mensagem}</p>
        </Card>
      </div>
    );
  }

  const p = estado.projeto;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/api653/projetos"
            className="text-xs text-carbono-500 hover:text-carbono-700"
          >
            ← Inspeções
          </Link>
          <h1 className="mt-1 font-title text-2xl font-extrabold tracking-tight">
            {p.nome}
          </h1>
          <p className="text-sm text-carbono-500">
            {p.tagTanque && <span className="font-semibold">{p.tagTanque} · </span>}
            D = {p.geometria.D_m.toFixed(2)} m · H = {p.geometria.H_m.toFixed(2)} m ·{" "}
            {p.produto.nome || "produto"} (G = {p.produto.G}) ·{" "}
            Inspecionado em {fmtData(p.dataInspecao)}
          </p>
        </div>
        <Badge cor="verde">{p.cursos.length} curso{p.cursos.length !== 1 ? "s" : ""}</Badge>
      </section>

      {/* Parâmetros rápidos */}
      <Card title="Parâmetros de cálculo">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <NumberField
            label="D (m)"
            value={p.geometria.D_m}
            onChange={(v) => atualizar({ geometria: { ...p.geometria, D_m: v } })}
            min={0.5} step={0.01}
          />
          <NumberField
            label="H (m)"
            value={p.geometria.H_m}
            onChange={(v) => atualizar({ geometria: { ...p.geometria, H_m: v } })}
            min={0.5} step={0.1}
          />
          <NumberField
            label="H liq (m)"
            value={p.H_liq_m}
            onChange={(v) => atualizar({ H_liq_m: v })}
            min={0.1} step={0.1}
            hint="Nível de projeto"
          />
          <NumberField
            label="G"
            value={p.produto.G}
            onChange={(v) => atualizar({ produto: { ...p.produto, G: v } })}
            min={0.1} step={0.01}
          />
          <NumberField
            label="S (MPa)"
            value={p.material.S_MPa}
            onChange={(v) => atualizar({ material: { ...p.material, S_MPa: v } })}
            min={1} step={0.1}
          />
          <NumberField
            label="CR global (mm/a)"
            value={p.CR_global_mm_ano}
            onChange={(v) => atualizar({ CR_global_mm_ano: v })}
            min={0} step={0.01}
            hint="Taxa global assumida"
          />
        </div>
      </Card>

      {/* Cursos do costado */}
      <Card title="Costado — Espessuras e Vida Útil por Curso">
        <TabelaCursos p={p} atualizar={atualizar} />
      </Card>

      {/* MAOLL */}
      <Card title="MAOLL — Nível Máximo de Operação Permitido">
        <SecaoMAOLL p={p} />
      </Card>

      {/* Fundo */}
      <Card title="Fundo — Vida Útil">
        <SecaoFundo p={p} atualizar={atualizar} />
      </Card>

      {/* Próxima inspeção */}
      <Card title="Próxima Inspeção Recomendada — API 653 §6">
        <SecaoProximaInspecao p={p} />
      </Card>

      {/* Nota técnica */}
      <Card>
        <p className="text-xs text-carbono-400">
          <strong>Nota:</strong> Os cálculos seguem a metodologia API 653. A espessura mínima
          do costado (MAST) é calculada pela mesma fórmula da API 650 §5.6.3 (1-Foot Method),
          aplicada às espessuras medidas. RUL = (t<sub>medida</sub> − t<sub>mín</sub>) / CR.
          Intervalos de inspeção: interno ≤ min(RUL/4, 20 anos); externo ≤ min(RUL/2, 10 anos).
          Esta ferramenta não substitui o julgamento do engenheiro inspetor responsável.
        </p>
      </Card>
    </div>
  );
}
