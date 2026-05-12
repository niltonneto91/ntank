"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, TextField } from "@/components/Field";
import {
  criarProjetoAPI653,
  MATERIAL_API653_DEFAULT,
  type NormaConstrucao,
} from "@/lib/api653-projeto";
import { salvarProjetoAPI653 } from "@/lib/db";
import type { CursoMedido, MetodologiaInspecao } from "@ntank/calc-core";

// ---------------------------------------------------------------------------
// Opções de selects
// ---------------------------------------------------------------------------

const NORMAS_CONSTRUCAO: ReadonlyArray<{ value: NormaConstrucao; label: string }> = [
  { value: "API650",        label: "API 650" },
  { value: "NBR7821",       label: "NBR 7821" },
  { value: "API620",        label: "API 620" },
  { value: "outra",         label: "Outra norma" },
  { value: "desconhecida",  label: "Desconhecida" },
];

const METODOLOGIAS: ReadonlyArray<{ value: MetodologiaInspecao; label: string }> = [
  { value: "UT-convencional",  label: "UT Convencional (Ultrassom manual)" },
  { value: "UT-automatizado",  label: "UT Automatizado (Scan automático)" },
  { value: "MFL",              label: "MFL (Magnetic Flux Leakage)" },
  { value: "RT",               label: "RT (Radiografia)" },
  { value: "visual",           label: "Inspeção visual" },
  { value: "outro",            label: "Outro" },
];

// ---------------------------------------------------------------------------
// Tipos locais para a tabela de cursos
// ---------------------------------------------------------------------------

type CursoRascunho = {
  numero: number;
  altura_m: string;
  t_nominal_mm: string;
  t_medida_mm: string;
};

function novoCurso(numero: number, alturaDefault: number): CursoRascunho {
  return {
    numero,
    altura_m: alturaDefault.toFixed(2),
    t_nominal_mm: "",
    t_medida_mm: "",
  };
}

function parsearCursos(rascunhos: CursoRascunho[]): CursoMedido[] {
  return rascunhos
    .filter((r) => r.altura_m && r.t_nominal_mm && r.t_medida_mm)
    .map((r) => ({
      numero: r.numero,
      altura_m: parseFloat(r.altura_m) || 0,
      t_nominal_mm: parseFloat(r.t_nominal_mm) || 0,
      t_medida_mm: parseFloat(r.t_medida_mm) || 0,
    }));
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

export default function NovaInspecaoAPI653Page() {
  const router = useRouter();

  // --- Identificação ---
  const [nome, setNome]                   = useState("");
  const [cliente, setCliente]             = useState("");
  const [local, setLocal]                 = useState("");
  const [pasta, setPasta]                 = useState("");
  const [tag, setTag]                     = useState("");
  const [normaConstrucao, setNorma]       = useState<NormaConstrucao>("API650");
  const [anoFabricacao, setAnoFab]        = useState<string>("");
  const [responsavel, setResponsavel]     = useState("");

  // --- Geometria e material ---
  const [D_m, setD]         = useState(10);
  const [H_m, setH]         = useState(10);
  const [numCursos, setNum] = useState(4);
  const [S_MPa, setSMpa]    = useState(MATERIAL_API653_DEFAULT.S_MPa);
  const [E, setE]            = useState(MATERIAL_API653_DEFAULT.E);

  // --- Produto ---
  const [nomeProduto, setNomeProduto] = useState("");
  const [G, setG]                     = useState(0.85);

  // --- Inspeção ---
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataInspecao, setDataInsp]       = useState(hoje);
  const [metodologia, setMetodo]          = useState<MetodologiaInspecao>("UT-convencional");
  const [CR_global, setCR]               = useState(0.1);
  const [H_liq_m, setHliq]               = useState(10);

  // --- Cursos (tabela dinâmica) ---
  const [cursos, setCursos] = useState<CursoRascunho[]>(() => {
    const altDefault = parseFloat((10 / 4).toFixed(2));
    return Array.from({ length: 4 }, (_, i) => novoCurso(i + 1, altDefault));
  });

  // Regenerar tabela quando numCursos ou H_m mudar
  useEffect(() => {
    const altDefault = parseFloat((H_m / numCursos).toFixed(2));
    setCursos((prev) => {
      const novos: CursoRascunho[] = Array.from(
        { length: numCursos },
        (_, i) => prev[i] ?? novoCurso(i + 1, altDefault),
      );
      // Renumerar
      return novos.map((c, i) => ({ ...c, numero: i + 1 }));
    });
  }, [numCursos, H_m]);

  // Sincronizar H_liq com H_m quando H_m mudar
  useEffect(() => {
    setHliq((prev) => Math.min(prev, H_m));
  }, [H_m]);

  function setCursoCampo(
    idx: number,
    campo: keyof Omit<CursoRascunho, "numero">,
    valor: string,
  ) {
    setCursos((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx]!, [campo]: valor };
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleCriar() {
    if (!tag.trim()) {
      alert("Informe a TAG do tanque.");
      return;
    }
    if (D_m <= 0 || H_m <= 0) {
      alert("Diâmetro e altura devem ser maiores que zero.");
      return;
    }
    if (H_liq_m <= 0 || H_liq_m > H_m) {
      alert("Nível de líquido deve estar entre 0 e H do tanque.");
      return;
    }

    const cursosParsed = parsearCursos(cursos);
    if (cursosParsed.length === 0) {
      alert(
        "Preencha pelo menos altura, espessura nominal e medida de um curso.",
      );
      return;
    }

    const projeto = criarProjetoAPI653({
      nome: nome.trim() || `API 653 — ${tag}`,
      cliente: cliente.trim() || undefined,
      local: local.trim() || undefined,
      pasta: pasta.trim(),
      tagTanque: tag.trim(),
      normaConstrucao,
      anoFabricacao: anoFabricacao ? parseInt(anoFabricacao, 10) : undefined,
      responsavelAnalise: responsavel.trim(),
      dataInspecao,
      metodologia,
      geometria: { D_m, H_m, numCursos },
      material: { materialId: "A36", S_MPa, E },
      produto: { nome: nomeProduto.trim(), G },
      CR_global_mm_ano: CR_global,
      H_liq_m,
      cursos: cursosParsed,
    });

    await salvarProjetoAPI653(projeto);
    router.push(`/api653/${projeto.id}`);
  }

  return (
    <div className="space-y-6">
      <section>
        <button
          onClick={() => router.push("/api653/projetos")}
          className="text-xs text-carbono-500 hover:text-carbono-700"
        >
          ← Inspeções
        </button>
        <h1 className="mt-1 font-title text-3xl font-extrabold tracking-tight">
          Nova Inspeção — API 653
        </h1>
        <p className="mt-1 text-sm text-carbono-600">
          Insira os dados do tanque e as espessuras medidas por curso.
        </p>
      </section>

      {/* 1. Identificação */}
      <Card title="Identificação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Nome do projeto / laudo"
            value={nome}
            onChange={setNome}
            placeholder="ex.: T-101 — Inspeção 2024"
          />
          <TextField
            label="TAG do tanque *"
            value={tag}
            onChange={setTag}
            placeholder="ex.: T-101"
          />
          <TextField
            label="Cliente / empresa"
            value={cliente}
            onChange={setCliente}
            placeholder="opcional"
          />
          <TextField
            label="Localidade"
            value={local}
            onChange={setLocal}
            placeholder="ex.: Base Sombrio/SC"
          />
          <TextField
            label="Pasta"
            value={pasta}
            onChange={setPasta}
            placeholder="ex.: Base Sombrio"
          />
          <TextField
            label="Responsável técnico"
            value={responsavel}
            onChange={setResponsavel}
            placeholder="ex.: João Silva — CREA 123456"
          />
          <SelectField
            label="Norma de construção"
            value={normaConstrucao}
            onChange={(v) => setNorma(v as NormaConstrucao)}
            options={NORMAS_CONSTRUCAO}
          />
          <TextField
            label="Ano de fabricação"
            value={anoFabricacao}
            onChange={setAnoFab}
            placeholder="ex.: 2008"
          />
        </div>
      </Card>

      {/* 2. Geometria e material */}
      <Card title="Geometria e Material">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <NumberField
            label="Diâmetro D (m)"
            value={D_m}
            onChange={setD}
            min={1}
            step={0.01}
          />
          <NumberField
            label="Altura H (m)"
            value={H_m}
            onChange={setH}
            min={0.5}
            step={0.1}
          />
          <NumberField
            label="N° de cursos"
            value={numCursos}
            onChange={(v) => setNum(Math.max(1, Math.round(v)))}
            min={1}
            step={1}
          />
          <NumberField
            label="S admissível (MPa)"
            value={S_MPa}
            onChange={setSMpa}
            min={1}
            step={0.1}
            hint="137,9 MPa = A36; 160,0 MPa = A516-Gr60"
          />
          <NumberField
            label="Efic. junta E"
            value={E}
            onChange={setE}
            min={0.1}
            max={1}
            step={0.01}
          />
        </div>
      </Card>

      {/* 3. Produto e inspeção */}
      <Card title="Produto e Inspeção">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <TextField
            label="Produto armazenado"
            value={nomeProduto}
            onChange={setNomeProduto}
            placeholder="ex.: Diesel S10"
          />
          <NumberField
            label="Densidade G"
            value={G}
            onChange={setG}
            min={0.1}
            max={2}
            step={0.01}
            hint="G = densidade relativa (água=1)"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-carbono-700">
              Data da inspeção *
            </label>
            <input
              type="date"
              value={dataInspecao}
              onChange={(e) => setDataInsp(e.target.value)}
              className="rounded border border-carbono-300 bg-white px-3 py-2 text-sm outline-none focus:border-verde"
            />
          </div>
          <SelectField
            label="Metodologia"
            value={metodologia}
            onChange={(v) => setMetodo(v as MetodologiaInspecao)}
            options={METODOLOGIAS}
          />
          <NumberField
            label="Nível de líquido H_liq (m)"
            value={H_liq_m}
            onChange={setHliq}
            min={0.1}
            step={0.1}
            hint="Nível de projeto para MAST"
          />
          <NumberField
            label="CR global (mm/ano)"
            value={CR_global}
            onChange={setCR}
            min={0}
            step={0.01}
            hint="Taxa assumida quando não há medição anterior"
          />
        </div>
      </Card>

      {/* 4. Espessuras por curso */}
      <Card title={`Cursos do Costado (${numCursos} curso${numCursos !== 1 ? "s" : ""})`}>
        <p className="mb-3 text-xs text-carbono-500">
          Curso 1 = base (junto ao fundo). Preencha ao menos altura, t nominal e t
          medida. Deixe em branco os cursos ainda não inspecionados.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbono-200 text-left text-xs text-carbono-500 uppercase">
                <th className="pb-2 pr-4 font-semibold">Curso</th>
                <th className="pb-2 pr-4 font-semibold">Altura (m)</th>
                <th className="pb-2 pr-4 font-semibold">t nominal (mm)</th>
                <th className="pb-2 font-semibold">t medida (mm)</th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c, idx) => (
                <tr key={c.numero} className="border-b border-carbono-100">
                  <td className="py-2 pr-4">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-carbono text-xs font-bold text-white">
                      {c.numero}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      value={c.altura_m}
                      min={0.1}
                      step={0.01}
                      onChange={(e) => setCursoCampo(idx, "altura_m", e.target.value)}
                      className="w-24 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      value={c.t_nominal_mm}
                      min={0}
                      step={0.1}
                      placeholder="—"
                      onChange={(e) =>
                        setCursoCampo(idx, "t_nominal_mm", e.target.value)
                      }
                      className="w-24 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={c.t_medida_mm}
                      min={0}
                      step={0.1}
                      placeholder="—"
                      onChange={(e) =>
                        setCursoCampo(idx, "t_medida_mm", e.target.value)
                      }
                      className="w-24 rounded border border-carbono-300 bg-white px-2 py-1 text-sm tabular outline-none focus:border-verde"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-carbono-400">
          As taxas de corrosão por curso e os dados do fundo podem ser preenchidos
          na tela de cálculo após criar a inspeção.
        </p>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push("/api653/projetos")}>
          Cancelar
        </Button>
        <Button onClick={handleCriar}>Criar inspeção</Button>
      </div>
    </div>
  );
}
