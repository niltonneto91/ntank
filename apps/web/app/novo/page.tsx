"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  avaliarAproveitamentoChapa,
  sugerirGeometriasPorVolume,
  type SugestaoGeometria,
} from "@ntank/calc-core";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { NumberField, SelectField, TextField } from "@/components/Field";
import { criarProjeto, type ModoEntrada } from "@/lib/projeto";
import { salvarProjeto } from "@/lib/db";
import { m, m3, num, pct } from "@/lib/format";

const MODOS: ReadonlyArray<{ id: ModoEntrada; titulo: string; desc: string }> = [
  {
    id: "A",
    titulo: "A · Geometria conhecida",
    desc: "Já sei o diâmetro e a altura.",
  },
  {
    id: "B",
    titulo: "B · Volume desejado",
    desc: "Sei o volume — quero opções de (D, H).",
  },
  {
    id: "C",
    titulo: "C · Volume + restrição",
    desc: "Sei o volume e tenho um limite (ex.: H ≤ 12 m).",
  },
];

export default function NovoProjetoPage() {
  const router = useRouter();
  const [modo, setModo] = useState<ModoEntrada>("A");
  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [local, setLocal] = useState("");
  const [pasta, setPasta] = useState("");

  // Modo A
  const [D_m, setD] = useState(7.64);
  const [H_m, setH] = useState(12);

  // Modos B/C
  const [volume_m3, setVolume] = useState(550);
  const [comprChapa_m, setComprChapa] = useState<6 | 12>(6);
  const [restricaoTipo, setRestricaoTipo] = useState<"H_max_m" | "D_max_m">(
    "H_max_m",
  );
  const [restricaoValor, setRestricaoValor] = useState(12);
  const [escolhaSugestao, setEscolhaSugestao] = useState<number | null>(null);

  const sugestoes = useMemo<SugestaoGeometria[]>(() => {
    if (modo === "A") return [];
    try {
      const opts =
        modo === "C"
          ? restricaoTipo === "H_max_m"
            ? { H_max_m: restricaoValor }
            : { D_max_m: restricaoValor }
          : undefined;
      return sugerirGeometriasPorVolume(volume_m3, comprChapa_m, opts);
    } catch {
      return [];
    }
  }, [modo, volume_m3, comprChapa_m, restricaoTipo, restricaoValor]);

  const aproveitamentoModoA = useMemo(() => {
    if (modo !== "A" || D_m <= 0) return null;
    try {
      return avaliarAproveitamentoChapa(D_m, comprChapa_m);
    } catch {
      return null;
    }
  }, [modo, D_m, comprChapa_m]);

  function geometriaSelecionada(): { D_m: number; H_m: number } | null {
    if (modo === "A") return { D_m, H_m };
    if (escolhaSugestao === null) return null;
    const s = sugestoes[escolhaSugestao];
    return s ? { D_m: s.D_m, H_m: s.H_m } : null;
  }

  async function handleCriar() {
    const geom = geometriaSelecionada();
    if (!geom) {
      alert("Escolha uma geometria.");
      return;
    }
    if (geom.D_m <= 0 || geom.H_m <= 0) {
      alert("D e H devem ser maiores que zero.");
      return;
    }
    const projeto = criarProjeto({
      nome: nome || `Tanque D${num(geom.D_m, 2)} × H${num(geom.H_m, 2)}`,
      cliente: cliente || undefined,
      local: local || undefined,
      pasta: pasta || undefined,
      geometria: {
        modo,
        D_m: geom.D_m,
        H_m: geom.H_m,
        volumeDesejado_m3: modo !== "A" ? volume_m3 : undefined,
        restricao:
          modo === "C"
            ? { tipo: restricaoTipo, valor: restricaoValor }
            : undefined,
      },
      parametros: {
        comprimentoChapa_mm: comprChapa_m * 1000,
        // larguraChapa_mm e demais defaults vêm de PARAMETROS_DEFAULT
        G: 1.0,
        CA_mm: 1.5,
        materialId: "A516-Gr60",
        larguraChapa_mm: 2000,
        E: 0.85,
        custoAcoPorKg_R$: 6.5,
        custoMaoDeObraPorKg_R$: 18.0,
        produto: "",
      },
    });
    await salvarProjeto(projeto);
    router.push(`/projeto/${projeto.id}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-title text-3xl font-extrabold tracking-tight">
          Novo projeto
        </h1>
        <p className="mt-1 text-sm text-carbono-600">
          Etapa 1 — defina a geometria base do tanque.
        </p>
      </header>

      <Card title="Identificação">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField
            label="Nome do projeto"
            value={nome}
            onChange={setNome}
            placeholder="Ex.: Base Sombrio T-101"
          />
          <TextField
            label="Cliente (opcional)"
            value={cliente}
            onChange={setCliente}
            placeholder="Ex.: Distribuidora X"
          />
          <TextField
            label="Local (opcional)"
            value={local}
            onChange={setLocal}
            placeholder="Ex.: Sombrio/SC"
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <TextField
            label="Pasta (opcional)"
            value={pasta}
            onChange={setPasta}
            placeholder="Ex.: Tescan, Base Sombrio…"
          />
        </div>
      </Card>

      <Card title="Modo de entrada" subtitle="Escolha como vai informar a geometria.">
        <div className="grid gap-2 md:grid-cols-3">
          {MODOS.map((m) => {
            const ativo = m.id === modo;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setModo(m.id);
                  setEscolhaSugestao(null);
                }}
                className={[
                  "rounded-lg border-2 p-4 text-left transition",
                  ativo
                    ? "border-verde bg-verde-50"
                    : "border-carbono-200 bg-white hover:border-carbono-400",
                ].join(" ")}
              >
                <div className="font-title text-sm font-bold">{m.titulo}</div>
                <div className="mt-1 text-xs text-carbono-600">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {modo === "A" && (
        <Card title="Modo A — Diâmetro e altura">
          <div className="grid gap-3 md:grid-cols-3">
            <NumberField
              label="Diâmetro D"
              unit="m"
              value={D_m}
              onChange={setD}
              step={0.01}
              min={1}
              max={100}
            />
            <NumberField
              label="Altura H"
              unit="m"
              value={H_m}
              onChange={setH}
              step={0.5}
              min={1}
              max={25}
            />
            <SelectField
              label="Comprimento da chapa"
              value={comprChapa_m}
              onChange={(v) => setComprChapa(v as 6 | 12)}
              options={[
                { value: 6, label: "6 m" },
                { value: 12, label: "12 m" },
              ]}
            />
          </div>
          {aproveitamentoModoA && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-creme p-3 text-sm">
              <span>
                Volume nominal:{" "}
                <strong className="tabular">
                  {m3((Math.PI * D_m * D_m * H_m) / 4)}
                </strong>
              </span>
              <span>
                Circunferência:{" "}
                <strong className="tabular">
                  {m(aproveitamentoModoA.circunferencia_m)}
                </strong>
              </span>
              <span>
                Chapas:{" "}
                <strong className="tabular">
                  {aproveitamentoModoA.descricao}
                </strong>
              </span>
              <Badge
                cor={
                  aproveitamentoModoA.classificacao === "otimo"
                    ? "verde"
                    : aproveitamentoModoA.classificacao === "bom"
                      ? "info"
                      : "amarelo"
                }
              >
                Aproveitamento{" "}
                {aproveitamentoModoA.classificacao === "otimo"
                  ? "ótimo"
                  : aproveitamentoModoA.classificacao}
              </Badge>
              <span className="text-carbono-500">
                Desperdício: {pct(aproveitamentoModoA.desperdicio_pct)}
              </span>
            </div>
          )}
        </Card>
      )}

      {modo !== "A" && (
        <Card
          title={modo === "B" ? "Modo B — Volume desejado" : "Modo C — Volume com restrição"}
          subtitle="Escolha uma combinação (D, H) sugerida — priorizamos aproveitamento de chapa."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <NumberField
              label="Volume desejado"
              unit="m³"
              value={volume_m3}
              onChange={(v) => {
                setVolume(v);
                setEscolhaSugestao(null);
              }}
              step={10}
              min={1}
            />
            <SelectField
              label="Comprimento da chapa"
              value={comprChapa_m}
              onChange={(v) => {
                setComprChapa(v as 6 | 12);
                setEscolhaSugestao(null);
              }}
              options={[
                { value: 6, label: "6 m" },
                { value: 12, label: "12 m" },
              ]}
            />
            {modo === "C" && (
              <>
                <SelectField
                  label="Tipo de restrição"
                  value={restricaoTipo}
                  onChange={(v) => {
                    setRestricaoTipo(v as "H_max_m" | "D_max_m");
                    setEscolhaSugestao(null);
                  }}
                  options={[
                    { value: "H_max_m", label: "H máxima (m)" },
                    { value: "D_max_m", label: "D máximo (m)" },
                  ]}
                />
                <NumberField
                  label={`Limite ${restricaoTipo === "H_max_m" ? "de altura" : "de diâmetro"}`}
                  unit="m"
                  value={restricaoValor}
                  onChange={(v) => {
                    setRestricaoValor(v);
                    setEscolhaSugestao(null);
                  }}
                  step={0.5}
                  min={1}
                />
              </>
            )}
          </div>

          <div className="mt-4">
            {sugestoes.length === 0 ? (
              <p className="text-sm text-carbono-500">
                Sem combinações viáveis para esses parâmetros.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-carbono-200 text-left text-xs uppercase tracking-wider text-carbono-500">
                    <tr>
                      <th className="px-2 py-2"></th>
                      <th className="px-2 py-2">D (m)</th>
                      <th className="px-2 py-2">H (m)</th>
                      <th className="px-2 py-2">H/D</th>
                      <th className="px-2 py-2">Composição</th>
                      <th className="px-2 py-2">Class.</th>
                      <th className="px-2 py-2">Desperd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugestoes.map((s, idx) => {
                      const sel = idx === escolhaSugestao;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setEscolhaSugestao(idx)}
                          className={[
                            "cursor-pointer border-b border-carbono-100 transition tabular",
                            sel ? "bg-verde-50" : "hover:bg-creme",
                          ].join(" ")}
                        >
                          <td className="px-2 py-2">
                            <input
                              type="radio"
                              checked={sel}
                              readOnly
                              className="accent-verde"
                            />
                          </td>
                          <td className="px-2 py-2 font-semibold">
                            {num(s.D_m)}
                          </td>
                          <td className="px-2 py-2 font-semibold">
                            {num(s.H_m)}
                          </td>
                          <td className="px-2 py-2">{num(s.razaoHD, 2)}</td>
                          <td className="px-2 py-2">
                            {s.avaliacao.descricao}
                          </td>
                          <td className="px-2 py-2">
                            <Badge
                              cor={
                                s.avaliacao.classificacao === "otimo"
                                  ? "verde"
                                  : s.avaliacao.classificacao === "bom"
                                    ? "info"
                                    : "amarelo"
                              }
                            >
                              {s.avaliacao.classificacao === "otimo"
                                ? "ótimo"
                                : s.avaliacao.classificacao}
                            </Badge>
                          </td>
                          <td className="px-2 py-2">
                            {pct(s.avaliacao.desperdicio_pct)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push("/")}>
          Cancelar
        </Button>
        <Button onClick={handleCriar}>Criar projeto</Button>
      </div>
    </div>
  );
}
